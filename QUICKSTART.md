# 快速开始指南

## 🚀 5 分钟快速启动

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

```bash
cp .env.example .env
```

编辑 `.env` 文件：
```env
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=your_username
MYSQL_PASSWORD=your_password
MYSQL_DATABASE=optional_db
READ_ONLY=true
```

### 3. 构建项目

```bash
npm run build
```

### 4. 启动服务器

```bash
npm start
```

### 5. 配置 Claude Desktop

在 Claude Desktop 配置文件中添加：

```json
{
  "mcpServers": {
    "mysql": {
      "command": "node",
      "args": ["D:\\AICodingProject\\mcpDemo\\dist\\main.js"],
      "env": {
        "MYSQL_HOST": "localhost",
        "MYSQL_USER": "your_user",
        "MYSQL_PASSWORD": "your_password",
        "READ_ONLY": "true"
      }
    }
  }
}
```

### 6. 配置 Cursor

1. 打开 Cursor 设置面板（`Ctrl + ,` 或 `Cmd + ,`）。
2. 导航至 **Features** > **MCP**。
3. 点击 **+ Add New MCP Server**。
4. 填写如下信息：
   - **Name**: `mysql`
   - **Type**: `command`
   - **Command**: `node D:\AICodingProject\mcpDemo\dist\main.js`
5. 在 **Environment Variables** 区域添加必要的环境变量（与 `.env` 文件一致）：
   - `MYSQL_HOST`: `localhost`
   - `MYSQL_USER`: `your_user`
   - `MYSQL_PASSWORD`: `your_password`
   - `MYSQL_DATABASE`: `your_database` (可选)


重启 Claude Desktop，然后开始对话！

## 📝 使用示例

### 查询数据
```
用户: "列出所有数据库"
AI: [自动调用 list_databases]
     返回: ["db1", "db2", "test_db"]

用户: "查询 users 表中最近的 10 个用户"
AI: [自动调用 read_query]
     返回: 用户数据列表

用户: "查看 products 表的结构"
AI: [自动调用 describe_table]
     返回: 表结构信息
```

### 数据库分析
```
用户: "分析 myapp 数据库的结构"
AI: [自动调用 list_tables + describe_table]
     [使用 analyze-database 提示词]
     返回: 详细的分析报告和优化建议
```

### 备份操作
```
用户: "备份 production 数据库到 /backups/prod.sql"
AI: [自动调用 backup_database]
     返回: 备份成功信息
```

## 🐳 Docker 快速启动

### 1. 创建 .env 文件
```bash
MYSQL_HOST=mysql
MYSQL_USER=root
MYSQL_PASSWORD=password
READ_ONLY=true
```

### 2. 启动服务
```bash
docker-compose up -d
```

### 3. 配置 Claude Desktop
```json
{
  "mcpServers": {
    "mysql-docker": {
      "command": "docker",
      "args": ["compose", "run", "--rm", "mysql-mcp-server"]
    }
  }
}
```

## 🔧 开发命令

```bash
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

## 🛡️ 安全模式（推荐生产环境）

```env
# .env
READ_ONLY=true
MAX_ROWS=50
QUERY_TIMEOUT=10
LOG_LEVEL=info
```

## 📋 检查清单

- [ ] 安装 Node.js 18+
- [ ] 安装 MySQL 客户端工具（用于备份）
- [ ] 配置 .env 文件
- [ ] 运行 `npm install`
- [ ] 运行 `npm run build`
- [ ] 测试数据库连接
- [ ] 配置 Claude Desktop
- [ ] 重启 Claude Desktop
- [ ] 测试基本查询

## 🎯 核心功能

### 元数据查询
- ✅ `list_databases` - 列出数据库
- ✅ `get_server_version` - MySQL 版本
- ✅ `list_tables` - 列出表
- ✅ `describe_table` - 表结构

### 数据查询
- ✅ `read_query` - 只读查询
- ✅ `execute_query` - 任意 SQL（需权限）

### 运维管理
- ✅ `backup_database` - 数据库备份
- ✅ `import_database` - 数据库导入

### 资源访问
- ✅ `mysql://{host}/databases` - 数据库列表
- ✅ `mysql://{host}/{db}/schema` - 数据库 Schema
- ✅ `mysql://{host}/{db}/{table}/schema` - 表 Schema

### 提示词
- ✅ `analyze-database` - 数据库分析

## 🚨 常见问题

**Q: 连接失败？**
A: 检查 MySQL 服务、防火墙、用户名密码

**Q: 备份失败？**
A: 安装 MySQL 客户端，检查备份目录权限

**Q: 权限错误？**
A: 确保数据库用户有相应权限

**Q: Claude 找不到工具？**
A: 重启 Claude Desktop，检查配置文件路径

## 📞 获取帮助

1. 查看 `README.md` - 完整文档
2. 查看 `CLAUDE_DESKTOP_CONFIG.md` - 配置指南
3. 查看日志文件 - `logs/combined.log`

## 💡 提示

- 首次使用建议开启 `READ_ONLY=true`
- 生产环境务必使用专用只读用户
- 定期检查日志文件
- 使用 Docker 部署更方便管理

---

**准备就绪！** 现在你可以通过自然语言与 MySQL 数据库交互了 🎉