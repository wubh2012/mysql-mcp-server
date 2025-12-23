#!/bin/bash

# MySQL MCP Server 启动脚本

set -e

echo "=== MySQL MCP Server 启动脚本 ==="

# 检查环境变量
if [ -z "$MYSQL_HOST" ] || [ -z "$MYSQL_USER" ] || [ -z "$MYSQL_PASSWORD" ]; then
    echo "错误: 必需的环境变量未设置"
    echo "请设置以下环境变量:"
    echo "  MYSQL_HOST"
    echo "  MYSQL_USER"
    echo "  MYSQL_PASSWORD"
    echo ""
    echo "可选环境变量:"
    echo "  MYSQL_PORT (默认: 3306)"
    echo "  MYSQL_DATABASE"
    echo "  READ_ONLY (默认: true)"
    echo "  MAX_ROWS (默认: 100)"
    echo "  QUERY_TIMEOUT (默认: 30)"
    echo "  LOG_LEVEL (默认: info)"
    exit 1
fi

# 检查是否已构建
if [ ! -d "dist" ]; then
    echo "项目未构建，正在构建..."
    npm run build
fi

echo "启动 MySQL MCP Server..."
echo "配置:"
echo "  Host: $MYSQL_HOST:${MYSQL_PORT:-3306}"
echo "  User: $MYSQL_USER"
echo "  Database: ${MYSQL_DATABASE:-未指定}"
echo "  Read-Only: ${READ_ONLY:-true}"
echo ""

# 启动服务器
exec node dist/main.js