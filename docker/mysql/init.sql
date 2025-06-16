-- MySQL数据库初始化脚本
-- 设置字符集为utf8mb4以支持中文和emoji

-- 创建数据库（如果不存在）
CREATE DATABASE IF NOT EXISTS ai_detective CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 切换到目标数据库
USE ai_detective;

-- 设置SQL模式，确保兼容性
SET sql_mode = 'STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_AUTO_CREATE_USER,NO_ENGINE_SUBSTITUTION';

-- 确保数据库时区设置
SET time_zone = '+08:00';

-- 创建游戏用户（MySQL 5.7语法）
CREATE USER IF NOT EXISTS 'gameuser'@'%' IDENTIFIED BY 'password';

-- 授予权限
GRANT ALL PRIVILEGES ON ai_detective.* TO 'gameuser'@'%';
GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, DROP, INDEX, ALTER ON ai_detective.* TO 'gameuser'@'%';

-- 刷新权限
FLUSH PRIVILEGES;

-- 显示创建结果
SELECT 'Database ai_detective initialized successfully for MySQL 5.7' as status; 