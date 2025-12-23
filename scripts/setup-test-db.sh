#!/bin/bash

# MySQL MCP Server 测试数据库初始化脚本

set -e

echo "=== MySQL MCP Server 测试数据库初始化 ==="

# 检查环境变量
if [ -z "$MYSQL_HOST" ]; then
    echo "错误: MYSQL_HOST 未设置"
    exit 1
fi

if [ -z "$MYSQL_USER" ]; then
    echo "错误: MYSQL_USER 未设置"
    exit 1
fi

if [ -z "$MYSQL_PASSWORD" ]; then
    echo "错误: MYSQL_PASSWORD 未设置"
    exit 1
fi

# 默认数据库名
TEST_DB=${MYSQL_DATABASE:-test_db}

echo "数据库配置:"
echo "  Host: $MYSQL_HOST:$MYSQL_PORT"
echo "  User: $MYSQL_USER"
echo "  Database: $TEST_DB"
echo ""

# 创建测试数据库
echo "创建测试数据库..."
mysql -h "$MYSQL_HOST" -P "${MYSQL_PORT:-3306}" -u "$MYSQL_USER" -p"$MYSQL_PASSWORD" -e "CREATE DATABASE IF NOT EXISTS $TEST_DB;"

# 创建测试表和数据
echo "创建测试表和数据..."
mysql -h "$MYSQL_HOST" -P "${MYSQL_PORT:-3306}" -u "$MYSQL_USER" -p"$MYSQL_PASSWORD" "$TEST_DB" << 'EOF'
-- 用户表
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL,
    email VARCHAR(100) UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 产品表
CREATE TABLE IF NOT EXISTS products (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    price DECIMAL(10,2),
    stock INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 订单表（带外键）
CREATE TABLE IF NOT EXISTS orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    product_id INT,
    quantity INT,
    total_price DECIMAL(10,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (product_id) REFERENCES products(id)
);

-- 插入测试数据
INSERT IGNORE INTO users (username, email) VALUES
('alice', 'alice@example.com'),
('bob', 'bob@example.com'),
('charlie', 'charlie@example.com');

INSERT IGNORE INTO products (name, price, stock) VALUES
('Laptop', 999.99, 10),
('Mouse', 29.99, 50),
('Keyboard', 79.99, 30);

INSERT IGNORE INTO orders (user_id, product_id, quantity, total_price) VALUES
(1, 1, 1, 999.99),
(1, 2, 2, 59.98),
(2, 3, 1, 79.99);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_product ON orders(product_id);

SELECT '测试数据库初始化完成！' AS status;
SHOW TABLES;
EOF

echo ""
echo "=== 测试数据库初始化完成 ==="
echo "数据库 '$TEST_DB' 已创建并包含测试数据"
echo ""
echo "测试查询示例:"
echo "  mysql -h $MYSQL_HOST -P ${MYSQL_PORT:-3306} -u $MYSQL_USER -p$MYSQL_PASSWORD $TEST_DB -e \"SELECT * FROM users;\""