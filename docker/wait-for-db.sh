#!/bin/bash
# wait-for-db.sh - 等待数据库服务就绪的脚本

set -e

host="$1"
port="$2"
shift 2
cmd="$@"

echo "⏳ 等待数据库 $host:$port 就绪..."

# 等待数据库端口可用
timeout=120
counter=0
while ! nc -z "$host" "$port"; do
  if [ $counter -ge $timeout ]; then
    echo "❌ 数据库端口连接超时"
    exit 1
  fi
  echo "数据库尚未就绪，等待中... ($counter/$timeout)"
  sleep 2
  counter=$((counter + 2))
done

echo "✅ 数据库端口 $host:$port 已就绪！"

# 等待MySQL服务完全启动（额外的安全检查）
echo "🔄 验证MySQL服务状态..."
mysql_ready=false
for i in {1..60}; do
  # 尝试连接数据库
  if mysql -h "$host" -P "$port" -u "${DB_USER:-gameuser}" -p"${DB_PASSWORD:-password}" -e "SELECT 1;" >/dev/null 2>&1; then
    echo "✅ MySQL服务已完全就绪！"
    mysql_ready=true
    break
  fi
  
  # 检查MySQL容器状态
  echo "MySQL服务启动中... ($i/60)"
  
  # 显示详细连接信息用于调试
  if [ $((i % 10)) -eq 0 ]; then
    echo "🔍 调试信息:"
    echo "   数据库主机: $host"
    echo "   数据库端口: $port"
    echo "   数据库用户: ${DB_USER:-gameuser}"
    echo "   数据库名称: ${DB_NAME:-ai_detective}"
    echo "   密码状态: $([ -n "${DB_PASSWORD}" ] && echo '已设置' || echo '未设置')"
  fi
  
  sleep 3
done

if [ "$mysql_ready" = false ]; then
  echo "❌ MySQL服务启动超时"
  echo "请检查以下配置："
  echo "  - 数据库密码是否正确"
  echo "  - 网络连接是否正常"
  echo "  - Docker容器是否正常运行"
  exit 1
fi

# 运行数据库初始化（如果需要）
echo "🔧 检查并初始化数据库..."
python -c "
import sys
import os
import time

# 添加重试机制
max_retries = 3
for attempt in range(max_retries):
    try:
        from backend.database import init_database, test_connection
        
        print(f'尝试连接数据库... (第{attempt + 1}次)')
        
        # 先测试连接
        if test_connection():
            print('数据库连接成功')
            
            # 初始化数据库
            if init_database():
                print('✅ 数据库表结构已就绪')
                sys.exit(0)
            else:
                print('❌ 数据库初始化失败')
                if attempt < max_retries - 1:
                    print('等待5秒后重试...')
                    time.sleep(5)
                    continue
                sys.exit(1)
        else:
            print('❌ 数据库连接失败')
            if attempt < max_retries - 1:
                print('等待5秒后重试...')
                time.sleep(5)
                continue
            sys.exit(1)
            
    except Exception as e:
        print(f'❌ 数据库初始化错误: {e}')
        if attempt < max_retries - 1:
            print(f'等待5秒后重试... (第{attempt + 1}次)')
            time.sleep(5)
            continue
        sys.exit(1)
"

if [ $? -ne 0 ]; then
  echo "❌ 数据库初始化失败"
  exit 1
fi

echo "🚀 启动应用程序..."
exec $cmd 