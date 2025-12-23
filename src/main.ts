#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import * as z from 'zod/v4';
import mysql from 'mysql2/promise';
import { config } from 'dotenv';

// 加载环境变量
config();

// 配置验证
const MYSQL_HOST = process.env.MYSQL_HOST || 'localhost';
const MYSQL_PORT = parseInt(process.env.MYSQL_PORT || '3306');
const MYSQL_USER = process.env.MYSQL_USER || '';
const MYSQL_PASSWORD = process.env.MYSQL_PASSWORD || '';
const MYSQL_DATABASE = process.env.MYSQL_DATABASE || '';
const READ_ONLY = process.env.READ_ONLY === 'true';
const MAX_ROWS = parseInt(process.env.MAX_ROWS || '100');
const QUERY_TIMEOUT = parseInt(process.env.QUERY_TIMEOUT || '30') * 1000;

if (!MYSQL_USER || !MYSQL_PASSWORD) {
  console.error('错误: 请设置 MYSQL_USER 和 MYSQL_PASSWORD 环境变量');
  process.exit(1);
}

// 创建 MySQL 连接池
const poolConfig: any = {
  host: MYSQL_HOST,
  port: MYSQL_PORT,
  user: MYSQL_USER,
  password: MYSQL_PASSWORD,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
};
if (MYSQL_DATABASE) {
  poolConfig.database = MYSQL_DATABASE;
}
const pool = mysql.createPool(poolConfig);

// 创建 MCP Server
const server = new McpServer({
  name: 'mysql-mcp-server',
  version: '1.0.0',
}, {
  capabilities: {
    tools: {},
  },
});

// 当前选中的数据库
let currentDatabase: string = MYSQL_DATABASE;

// 工具 0: 切换/使用数据库
// registerTool 是 MCP SDK 注册工具的方法
// 第一个参数是工具名称，客户端调用时会使用这个名字
server.registerTool('use_database', {
  // description: 工具的描述，会展示给 AI 助手，帮助 AI 理解何时该使用这个工具
  description: '切换使用的数据库，后续查询将默认使用该数据库',

  // inputSchema: 定义工具的输入参数规范（使用 zod 进行参数验证）
  inputSchema: {
    // database 参数：必填，字符串类型
    database: z.string().describe('要切换到的数据库名称'),
  },
  // 第二个参数是工具的处理函数，AI 调用工具时会执行这个函数
  // async 函数：异步处理，MCP 工具都应该是异步的
  // 参数解构：从参数对象中取出 database 字段
}, async ({ database }) => {
  // try-catch: 捕获可能的错误，返回友好的错误信息
  try {
    // 1. 查询所有数据库，验证用户输入的数据库是否存在
    // pool.query: 从连接池获取连接执行 SQL
    const [rows] = await pool.query('SHOW DATABASES');
    // 提取数据库名称数组
    const databases = (rows as any[]).map((row: any) => row.Database);

    // 2. 验证数据库是否存在
    if (!databases.includes(database)) {
      // throw Error: 抛出错误，会被 catch 捕获并返回给 AI
      throw new Error(`数据库 '${database}' 不存在，可用数据库: ${databases.join(', ')}`);
    }

    // 3. 更新全局变量 currentDatabase，后续查询会使用这个值
    currentDatabase = database;

    // 4. 返回成功结果
    // MCP 工具必须返回 { content: [...] } 格式
    // content 数组可以包含多个内容块（text、image 等）
    return {
      content: [
        {
          type: 'text', // 内容类型：文本
          text: JSON.stringify({
            success: true,
            currentDatabase, // 返回当前使用的数据库名称
            message: `已切换到数据库: ${database}`,
          }, null, 2), // 格式化 JSON 输出
        },
      ],
    };
  } catch (error) {
    // 5. 错误处理
    // isError: true 告诉 MCP 这是一个错误响应
    return {
      content: [
        {
          type: 'text',
          text: `错误: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    };
  }
});

// 工具 0.5: 获取当前数据库
server.registerTool('get_current_database', {
  description: '获取当前正在使用的数据库',
  inputSchema: {},
}, async () => {
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify({
          currentDatabase: currentDatabase || '未设置（需在查询中指定或使用 use_database 切换）',
        }, null, 2),
      },
    ],
  };
});

server.registerTool('list_databases', {
  description: '列出所有可用数据库',
  inputSchema: {},
}, async () => {
  try {
    const [rows] = await pool.query('SHOW DATABASES');
    const databases = (rows as any[]).map((row: any) => row.Database);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({ databases }, null, 2),
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `错误: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    };
  }
});

// 工具 2: 获取服务器版本
server.registerTool('get_server_version', {
  description: '获取 MySQL 服务器版本',
  inputSchema: {},
}, async () => {
  try {
    const [rows] = await pool.query('SELECT VERSION() as version');
    const version = (rows as any[])[0]?.version || 'Unknown';
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({ version }, null, 2),
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `错误: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    };
  }
});

// 工具 3: 列出表
server.registerTool('list_tables', {
  description: '列出当前数据库或指定数据库中的所有表及其备注',
  inputSchema: {
    database: z.string().optional().describe('数据库名称（可选，默认使用当前数据库）'),
  },
}, async ({ database }) => {
  try {
    const db = database || currentDatabase;
    if (!db) {
      throw new Error('未指定数据库，请设置 MYSQL_DATABASE 环境变量或使用 use_database 切换');
    }
    // 使用 SHOW TABLE STATUS 获取表名和备注
    const [rows] = await pool.query(`SHOW TABLE STATUS FROM \`${db}\``);
    const tables = (rows as any[]).map((row: any) => ({
      name: row.Name,
      comment: row.Comment || '',  // 表的备注说明
      engine: row.Engine,          // 存储引擎
      rows: row.Rows,              // 行数
    }));
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({ database: db, tables }, null, 2),
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `错误: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    };
  }
});

// 工具 4: 描述表
server.registerTool('describe_table', {
  description: '获取表的详细结构信息',
  inputSchema: {
    database: z.string().optional().describe('数据库名称（可选，默认使用当前数据库）'),
    table_name: z.string().describe('表名称'),
  },
}, async ({ database, table_name }) => {
  try {
    const db = database || currentDatabase;
    if (!db) {
      throw new Error('未指定数据库，请设置 MYSQL_DATABASE 环境变量或使用 use_database 切换');
    }
    const [columns] = await pool.query(
      `SHOW FULL COLUMNS FROM \`${db}\`.\`${table_name}\``
    );
    const [createResult] = await pool.query(
      `SHOW CREATE TABLE \`${db}\`.\`${table_name}\``
    );
    const createTable = (createResult as any[])[0]?.['Create Table'] || '';

    const formattedColumns = (columns as any[]).map((col: any) => ({
      name: col.Field,
      type: col.Type,
      nullable: col.Null === 'YES',
      key: col.Key,
      default: col.Default,
      extra: col.Extra,
      comment: col.Comment,
    }));

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              database: db,
              table: table_name,
              columns: formattedColumns,
              createStatement: createTable,
            },
            null,
            2
          ),
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `错误: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    };
  }
});

// 工具 5: 只读查询
server.registerTool('read_query', {
  description: '执行 SELECT 查询（只读，安全）。支持 USE 语句切换数据库，如: USE mydb; SELECT * FROM users',
  inputSchema: {
    query: z.string().describe('SQL SELECT 语句'),
  },
}, async ({ query }) => {
  try {
    const trimmed = query.trim();

    // 处理 USE 语句
    const useDatabaseMatch = trimmed.match(/^USE\s+`?(\w+)`?;?\s*([\s\S]*)$/i);
    let finalQuery: string;
    let dbUsed: string | undefined;

    if (useDatabaseMatch) {
      dbUsed = useDatabaseMatch[1];
      finalQuery = useDatabaseMatch[2].trim();
      if (!finalQuery.toUpperCase().startsWith('SELECT')) {
        throw new Error('USE 语句后必须跟 SELECT 查询');
      }
    } else {
      finalQuery = trimmed;
    }

    // 安全检查 - 只允许 SELECT
    if (!finalQuery.toUpperCase().startsWith('SELECT')) {
      throw new Error('只允许执行 SELECT 查询');
    }

    // 执行查询（使用 USE 语句切换数据库或当前数据库）
    if (dbUsed) {
      await pool.query(`USE \`${dbUsed}\``);
    } else if (currentDatabase) {
      await pool.query(`USE \`${currentDatabase}\``);
    }

    const [rows] = await pool.query({
      sql: finalQuery,
      timeout: QUERY_TIMEOUT,
    });

    // 限制行数
    const limited = (rows as any[]).slice(0, MAX_ROWS);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              database: dbUsed || currentDatabase || '未指定',
              rows: limited,
              rowCount: limited.length,
              truncated: limited.length < (rows as any[]).length,
            },
            null,
            2
          ),
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `错误: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    };
  }
});

// 工具 6: 执行任意 SQL（可选，受只读模式控制）
if (!READ_ONLY) {
  server.registerTool('execute_query', {
    description: '执行任意 SQL 语句（包括写操作）。支持 USE 语句切换数据库',
    inputSchema: {
      query: z.string().describe('要执行的 SQL 语句'),
      confirm: z.boolean().optional().describe('确认执行危险操作'),
    },
  }, async ({ query, confirm }) => {
    try {
      const originalQuery = query.trim();

      // 处理 USE 语句
      const useDatabaseMatch = originalQuery.match(/^USE\s+`?(\w+)`?;?\s*([\s\S]*)$/i);
      let finalQuery: string;
      let dbUsed: string | undefined;

      if (useDatabaseMatch) {
        dbUsed = useDatabaseMatch[1];
        finalQuery = useDatabaseMatch[2].trim();
        if (!finalQuery) {
          throw new Error('USE 语句后必须跟其他 SQL 语句');
        }
      } else {
        finalQuery = originalQuery;
      }

      const finalTrimmed = finalQuery.toUpperCase();

      // 危险操作检查
      const dangerous = ['DROP', 'TRUNCATE', 'DELETE FROM', 'ALTER TABLE'];
      const needsConfirm = dangerous.some(keyword => finalTrimmed.includes(keyword));

      if (needsConfirm && !confirm) {
        throw new Error('检测到危险操作，请设置 confirm=true 确认执行');
      }

      // 执行查询（使用 USE 语句切换数据库或当前数据库）
      if (dbUsed) {
        await pool.query(`USE \`${dbUsed}\``);
      } else if (currentDatabase) {
        await pool.query(`USE \`${currentDatabase}\``);
      }

      const [result] = await pool.query({
        sql: finalQuery,
        timeout: QUERY_TIMEOUT,
      });

      // 判断操作类型
      let operation = 'UNKNOWN';
      let message = '执行成功';

      if (finalTrimmed.startsWith('SELECT')) {
        operation = 'SELECT';
        message = `查询成功，返回 ${(result as any[]).length} 行`;
      } else if (finalTrimmed.startsWith('INSERT')) {
        operation = 'INSERT';
        message = `插入成功，影响 ${(result as any).affectedRows || 0} 行`;
      } else if (finalTrimmed.startsWith('UPDATE')) {
        operation = 'UPDATE';
        message = `更新成功，影响 ${(result as any).affectedRows || 0} 行`;
      } else if (finalTrimmed.startsWith('DELETE')) {
        operation = 'DELETE';
        message = `删除成功，影响 ${(result as any).affectedRows || 0} 行`;
      } else if (finalTrimmed.startsWith('CREATE') || finalTrimmed.startsWith('DROP') || finalTrimmed.startsWith('ALTER')) {
        operation = 'DDL';
        message = '结构变更成功';
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                database: dbUsed || currentDatabase || '未指定',
                operation,
                message,
                result: finalTrimmed.startsWith('SELECT') ? result : undefined,
              },
              null,
              2
            ),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `错误: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      };
    }
  });
}

// 主函数
async function main() {
  try {
    console.error('正在启动 MySQL MCP Server...');
    console.error(`配置: ${MYSQL_HOST}:${MYSQL_PORT}, User: ${MYSQL_USER}, Read-Only: ${READ_ONLY}`);

    const transport = new StdioServerTransport();
    await server.connect(transport);

    console.error('MySQL MCP Server 已启动，等待客户端连接...');
  } catch (error) {
    console.error('启动失败:', error);
    await pool.end();
    process.exit(1);
  }
}

// 优雅关闭
process.on('SIGINT', async () => {
  console.error('\n收到 SIGINT 信号，正在关闭...');
  await pool.end();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.error('\n收到 SIGTERM 信号，正在关闭...');
  await pool.end();
  process.exit(0);
});

// 启动
main();