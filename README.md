# MySQL MCP Server

一个基于 Model Context Protocol (MCP) 的 MySQL 服务端，让 AI 助手（如 Claude、Cursor）能够通过自然语言直接查询和管理 MySQL 数据库。

## 功能特性

### 核心功能
- **数据库管理**: 切换数据库、获取当前数据库、列出所有数据库
- **表结构查询**: 列出数据库中的所有表，获取表的详细结构信息（字段、类型、键、备注等）
- **数据查询**: 执行 SELECT 查询（只读模式安全执行）
- **SQL 执行**: 支持执行任意 SQL 语句（INSERT、UPDATE、DELETE、DDL 等）
- **USE 语句支持**: 在查询中直接使用 `USE dbname;` 切换数据库

### 安全特性
- **只读模式**: 默认开启，防止误删数据
- **危险操作拦截**: DROP、TRUNCATE、DELETE FROM、ALTER TABLE 等操作需要 `confirm=true` 确认
- **查询限制**: 默认限制 100 行，防止 Token 溢出
- **超时控制**: 30 秒查询超时，防止慢查询阻塞
- **连接池管理**: 高效的数据库连接管理，支持并发查询

## 快速开始

### 安装依赖

```bash
npm install
```

### 配置环境变量

复制 `.env.example` 到 `.env` 并配置：

```bash
cp .env.example .env
```

编辑 `.env` 文件，配置 MySQL 连接信息：

```env
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=your_username
MYSQL_PASSWORD=your_password
MYSQL_DATABASE=optional_default_db

# 安全配置
READ_ONLY=true
MAX_ROWS=100
QUERY_TIMEOUT=30
```

### 启动服务器

```bash
# 开发模式（自动重载）
npm run dev

# 生产模式
npm run build
```

### 测试连接

```bash
# 测试 MySQL 连接
node test-connection.js
```

## 使用方法

### 方式一：本地使用

克隆项目后启动：

```bash
npm install
npm run build
```

在 Claude Desktop 配置中：

```json
{
  "mcpServers": {
    "mysql": {
      "command": "node",
      "args": ["/your_local_directory/dist/main.js"],
      "env": {
        "MYSQL_HOST": "localhost",
        "MYSQL_PORT": "3306",
        "MYSQL_USER": "your_user",
        "MYSQL_PASSWORD": "your_password",
        "MYSQL_DATABASE": "your_database",
        "READ_ONLY": "true"
      }
    }
  }
}
```

### 方式二：使用 npm 包（推荐）

发布到 npm 后，他人可以通过 `npx` 直接使用：

```json
{
  "mcpServers": {
    "mysql": {
      "command": "npx",
      "args": ["-y", "@aalmix/mysql-mcp-server"],
      "env": {
        "MYSQL_HOST": "localhost",
        "MYSQL_PORT": "3306",
        "MYSQL_USER": "your_user",
        "MYSQL_PASSWORD": "your_password",
        "MYSQL_DATABASE": "your_database",
        "READ_ONLY": "true"
      }
    }
  }
}
```


## MCP 工具

| 工具名称 | 参数 | 描述 |
|---------|------|------|
| `use_database` | `{database: string}` | 切换使用的数据库 |
| `get_current_database` | `{}` | 获取当前正在使用的数据库 |
| `list_databases` | `{}` | 列出所有可用数据库 |
| `get_server_version` | `{}` | 获取 MySQL 服务器版本 |
| `list_tables` | `{database?: string}` | 列出指定数据库中的所有表（包含表备注、引擎、行数） |
| `describe_table` | `{database?: string, table_name: string}` | 获取表的详细结构信息和 CREATE TABLE 语句 |
| `read_query` | `{query: string}` | 执行 SELECT 查询（只读，安全） |
| `execute_query` | `{query: string, confirm?: boolean}` | 执行任意 SQL（危险操作需 confirm=true） |

## 安全配置

### 只读模式 (推荐生产环境)

```env
READ_ONLY=true
```

在只读模式下：
- 只允许 `SELECT` 查询
- `execute_query` 工具将被禁用
- `read_query` 工具仍然可用

### 危险操作二次确认

即使在非只读模式下，以下操作也需要 `confirm=true` 参数：
- `DROP TABLE/DATABASE`
- `TRUNCATE TABLE`
- `DELETE FROM` (无 WHERE 条件)
- `ALTER TABLE ... DROP COLUMN`

## 项目结构

```
mcpDemo/
├── src/
│   └── main.ts              # 入口文件，包含所有 MCP 工具实现
├── tests/                   # 测试文件
├── scripts/
│   ├── run-server.sh        # 服务器启动脚本
│   └── setup-test-db.sh     # 测试数据库初始化脚本
├── test-connection.js       # 连接测试脚本
├── Dockerfile               # Docker 镜像构建文件
├── docker-compose.yml       # Docker Compose 配置
├── package.json             # 项目配置
├── tsconfig.json            # TypeScript 配置
└── README.md                # 项目文档
```

## 开发命令

```bash
# 安装依赖
npm install

# 开发模式（自动重载）
npm run dev

# 构建
npm run build

# 运行
npm start

# 测试连接
node test-connection.js

# 初始化测试数据库
./scripts/setup-test-db.sh
```

## 使用示例

### 示例 1: 查询数据

用户: "查询 users 表中最近注册的 10 个用户"

AI 会自动：
1. 调用 `list_tables` 确认表存在
2. 调用 `describe_table` 查看表结构
3. 调用 `read_query` 执行 `SELECT * FROM users ORDER BY created_at DESC LIMIT 10`
4. 返回结果

### 示例 2: 切换数据库并查询

用户: "切换到 myapp 数据库，查询 products 表的所有数据"

AI 会自动：
1. 调用 `use_database` 切换数据库
2. 调用 `list_tables` 确认表存在
3. 调用 `read_query` 执行查询

### 示例 3: 在查询中使用 USE 语句

```sql
USE mydb; SELECT * FROM users WHERE active = 1;
```

## 限制和注意事项

1. **查询结果限制**: 默认最多返回 100 行，可通过环境变量调整
2. **超时时间**: 默认 30 秒，超时查询会被终止
3. **只读模式**: 默认开启，生产环境强烈建议保持
4. **需要用户权限**: 执行 SQL 需要相应的数据库权限

## 故障排除

### 连接失败

```bash
# 检查 MySQL 服务是否运行
mysql -h $MYSQL_HOST -P $MYSQL_PORT -u $MYSQL_USER -p

# 检查防火墙设置
# 检查用户名密码是否正确
```

### 权限问题

```sql
-- 授予必要权限
GRANT SELECT ON *.* TO 'user'@'host';
GRANT SHOW DATABASES ON *.* TO 'user'@'host';

-- 如果需要写操作
GRANT INSERT, UPDATE, DELETE ON dbname.* TO 'user'@'host';
```

## 依赖

- `@modelcontextprotocol/sdk`: MCP 协议实现
- `mysql2/promise`: MySQL 客户端
- `dotenv`: 环境变量管理
- `zod/v4`: 参数验证
- `tsx`: TypeScript 运行工具
- `typescript`: TypeScript 编译器

## 许可证

MIT License
