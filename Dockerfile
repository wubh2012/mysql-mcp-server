# MySQL MCP Server Dockerfile

FROM node:20-alpine

# 设置工作目录
WORKDIR /app

# 安装系统依赖（用于 mysqldump）
RUN apk add --no-cache mysql-client

# 复制 package 文件
COPY package*.json ./

# 安装依赖
RUN npm ci --only=production --no-optional

# 复制源代码
COPY src ./src
COPY tsconfig.json ./

# 构建 TypeScript
RUN npm run build

# 创建备份目录
RUN mkdir -p /app/backups && chmod 777 /app/backups

# 设置环境变量默认值
ENV MYSQL_HOST=localhost
ENV MYSQL_PORT=3306
ENV READ_ONLY=true
ENV MAX_ROWS=100
ENV QUERY_TIMEOUT=30
ENV BACKUP_DIR=/app/backups
ENV LOG_LEVEL=info
ENV LOG_FORMAT=json

# 暴露端口（如果将来需要）
# EXPOSE 3000

# 启动命令
ENTRYPOINT ["node", "dist/main.js"]

# 使用非 root 用户运行（安全最佳实践）
# USER node