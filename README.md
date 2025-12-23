# MySQL MCP Server

一个基于 Model Context Protocol (MCP) 的 MySQL 服务端，让 AI 助手（如 Claude、Cursor）能够通过自然语言直接查询和管理 MySQL 数据库。

## ✨ 功能特性

### 核心功能
- **元数据内省**: 自动获取数据库和表结构信息
- **数据交互**: 支持自然语言转 SQL 的执行（支持读写分离）
- **运维管理**: 支持备份、导入等文件级操作

### 安全特性
- ✅ **只读模式**: 默认开启，防止误删数据
- ✅ **危险操作拦截**: DROP、TRUNCATE 等操作需要二次确认
- ✅ **查询限制**: 默认限制 100 行，防止 Token 溢出
- ✅ **超时控制**: 30 秒查询超时，防止慢查询阻塞
- ✅ **结果截断**: 10KB 结果限制，保护 LLM 上下文窗口

## 🚀 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

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

### 3. 启动服务器

```bash
# 开发模式
npm run dev

# 生产模式
npm run build
npm start
```

## 📖 使用方法

### 连接 Claude Desktop

在 Claude Desktop 的配置文件中添加：

```json
{
  "mcpServers": {
    "mysql": {
      "command": "node",
      "args": ["dist/main.js"],
      "env": {
        "MYSQL_HOST": "localhost",
        "MYSQL_PORT": "3306",
        "MYSQL_USER": "your_user",
        "MYSQL_PASSWORD": "your_password",
        "READ_ONLY": "true"
      }
    }
  }
}
```

### 支持的 MCP 工具

| 工具名称 | 输入参数 | 描述 |
|---------|---------|------|
| `list_databases` | `{}` | 列出所有可用数据库名 |
| `get_server_version` | `{}` | 获取 MySQL 版本号 |
| `list_tables` | `{"database": "string"}` | 列出指定数据库中的所有表名 |
| `describe_table` | `{"database": "string", "table_name": "string"}` | 获取表的 Schema 信息 |
| `read_query` | `{"query": "string"}` | 执行 SELECT 查询（只读） |
| `execute_query` | `{"query": "string"}` | 执行任意 SQL（需权限控制） |
| `backup_database` | `{"database": "string", "output_path": "string"}` | 备份数据库到本地路径 |
| `import_database` | `{"database": "string", "input_path": "string"}` | 从本地路径导入 SQL 文件 |

### 支持的 MCP 资源

| URI 模式 | 描述 | 内容示例 |
|---------|------|---------|
| `mysql://{host}/databases` | 所有数据库列表 | JSON 列表 |
| `mysql://{host}/{db}/schema` | 整个数据库的 DDL | 所有表的 CREATE TABLE 语句 |
| `mysql://{host}/{db}/{table}/schema` | 单表 DDL | 单表的 CREATE TABLE 语句 |

### MCP 提示词

- `analyze-database` - 分析数据库结构并提供优化建议

## 🛡️ 安全配置

### 只读模式 (推荐生产环境)

```env
READ_ONLY=true
```

在只读模式下：
- 只允许 `SELECT` 查询
- 禁止 `INSERT`, `UPDATE`, `DELETE`, `DROP`, `TRUNCATE` 等操作
- `execute_query` 工具将被限制

### 危险操作二次确认

即使在非只读模式下，以下操作也需要 `confirm=true` 参数：
- `DROP TABLE/DATABASE`
- `TRUNCATE TABLE`
- `DELETE FROM` (无 WHERE 条件)
- `ALTER TABLE ... DROP COLUMN`

### 凭证管理

**绝不硬编码密码**，使用环境变量：
```bash
# ✅ 正确
MYSQL_PASSWORD=secret

# ❌ 错误
# 在代码中写死密码
```

生产环境建议使用：
- Docker Secrets
- Vault 等密钥管理服务
- 环境变量注入

## 🐳 Docker 部署

### 构建镜像

```bash
docker build -t mysql-mcp-server .
```

### 运行容器

```bash
docker run -d \
  --name mysql-mcp-server \
  -e MYSQL_HOST=your-db-host \
  -e MYSQL_PORT=3306 \
  -e MYSQL_USER=your_user \
  -e MYSQL_PASSWORD=your_password \
  -e READ_ONLY=true \
  -v /host/backup/dir:/app/backups \
  mysql-mcp-server
```

### Docker Compose

```yaml
version: '3.8'
services:
  mysql-mcp-server:
    build: .
    environment:
      - MYSQL_HOST=mysql
      - MYSQL_PORT=3306
      - MYSQL_USER=root
      - MYSQL_PASSWORD=${MYSQL_PASSWORD}
      - READ_ONLY=true
    volumes:
      - ./backups:/app/backups
    depends_on:
      - mysql

  mysql:
    image: mysql:8.0
    environment:
      MYSQL_ROOT_PASSWORD: ${MYSQL_PASSWORD}
      MYSQL_DATABASE: test_db
    ports:
      - "3306:3306"
```

## 🔧 开发指南

### 项目结构

```
src/
├── main.ts              # 入口文件
├── server.ts            # 核心服务器逻辑
├── config.ts            # 配置管理
├── connection.ts        # 数据库连接池
├── tools/               # MCP Tools 实现
│   ├── metadata.ts      # 元数据工具
│   ├── query.ts         # 查询工具
│   └── admin.ts         # 管理工具
├── utils/
│   ├── security.ts      # 安全检查
│   └── validators.ts    # 输入验证
└── constants.ts         # 常量定义
```

### 开发命令

```bash
# 安装依赖
npm install

# 开发模式（自动重载）
npm run dev

# 构建
npm run build

# 运行
npm start

# 测试
npm test

# 代码检查
npm run lint

# 代码格式化
npm run format
```

### 测试

```bash
# 运行所有测试
npm test

# 测试覆盖率
npm run test -- --coverage

# 开发模式测试
npm run test:watch
```

## 📊 使用示例

### 示例 1: 查询数据

用户: "查询 users 表中最近注册的 10 个用户"

AI 会自动：
1. 调用 `list_tables` 确认表存在
2. 调用 `describe_table` 查看表结构
3. 调用 `read_query` 执行 `SELECT * FROM users ORDER BY created_at DESC LIMIT 10`
4. 返回结果

### 示例 2: 数据库分析

用户: "分析 myapp 数据库的结构"

AI 会自动：
1. 调用 `list_tables` 获取所有表
2. 对每个表调用 `describe_table`
3. 使用 `analyze-database` 提示词分析
4. 提供优化建议

### 示例 3: 数据库备份

用户: "备份 production 数据库到 /backups/prod_2025.sql"

AI 会自动：
1. 调用 `backup_database` 工具
2. 执行 `mysqldump` 命令
3. 返回备份成功信息

## ⚠️ 限制和注意事项

1. **查询结果限制**: 默认最多返回 100 行，可通过环境变量调整
2. **超时时间**: 默认 30 秒，超时查询会被终止
3. **结果截断**: 结果超过 10KB 会被截断
4. **只读模式**: 默认开启，生产环境强烈建议保持
5. **备份依赖**: 备份功能需要系统安装 `mysqldump`

## 🔍 故障排除

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

### 备份失败

```bash
# 检查 mysqldump 是否安装
which mysqldump

# 检查备份目录权限
ls -la /tmp/backups
```

## 📄 许可证

MIT License

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📞 支持

如有问题，请：
1. 查看 [Issues](#)
2. 阅读本文档
3. 检查日志输出