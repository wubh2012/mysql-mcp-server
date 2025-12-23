#!/usr/bin/env node

import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

async function testConnection() {
  console.log('=== MySQL 连接测试 ===\n');

  const host = process.env.MYSQL_HOST || 'localhost';
  const port = parseInt(process.env.MYSQL_PORT || '3306');
  const user = process.env.MYSQL_USER;
  const password = process.env.MYSQL_PASSWORD;
  const database = process.env.MYSQL_DATABASE;

  if (!user || !password) {
    console.error('❌ 错误: 请设置 MYSQL_USER 和 MYSQL_PASSWORD 环境变量');
    console.error('   编辑 .env 文件添加:');
    console.error('   MYSQL_USER=your_username');
    console.error('   MYSQL_PASSWORD=your_password');
    process.exit(1);
  }

  console.log('配置:');
  console.log(`  Host: ${host}:${port}`);
  console.log(`  User: ${user}`);
  console.log(`  Database: ${database || '(未指定)'}\n`);

  try {
    // 创建连接
    const connection = await mysql.createConnection({
      host,
      port,
      user,
      password,
      database: database || undefined,
    });

    console.log('✅ 连接成功！\n');

    // 测试查询
    console.log('测试查询:');

    // 1. 获取版本
    const [versionRows] = await connection.query('SELECT VERSION() as version');
    console.log(`  MySQL 版本: ${versionRows[0].version}`);

    // 2. 列出数据库
    const [dbRows] = await connection.query('SHOW DATABASES');
    const databases = dbRows.map(row => row.Database);
    console.log(`  可用数据库: ${databases.slice(0, 5).join(', ')}${databases.length > 5 ? '...' : ''}`);

    // 3. 如果指定了数据库，列出表
    if (database) {
      const [tableRows] = await connection.query(`SHOW TABLES FROM \`${database}\``);
      if (tableRows.length > 0) {
        const tables = tableRows.map(row => Object.values(row)[0]);
        console.log(`  ${database} 中的表: ${tables.slice(0, 5).join(', ')}${tables.length > 5 ? '...' : ''}`);
      } else {
        console.log(`  ${database} 中没有表`);
      }
    }

    await connection.end();
    console.log('\n✅ 所有测试通过！');

    console.log('\n=== 下一步 ===');
    console.log('1. 运行: npm start');
    console.log('2. 在 Claude Desktop 中配置 MCP Server');
    console.log('3. 开始使用自然语言查询数据库！');

  } catch (error) {
    console.error('\n❌ 连接失败:');
    console.error(`   ${error.message}`);
    console.error('\n可能的原因:');
    console.error('  - MySQL 服务未启动');
    console.error('  - 用户名/密码错误');
    console.error('  - 防火墙阻止连接');
    console.error('  - 数据库不存在');
    process.exit(1);
  }
}

testConnection();
