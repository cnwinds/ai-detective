#!/bin/bash

# AI侦探推理游戏 Docker部署脚本
echo "🕵️ AI侦探推理游戏 Docker部署脚本"
echo "=================================="

# 设置Docker BuildKit优化
export COMPOSE_BAKE=true

# 检查是否需要强制重新构建
REBUILD_FLAG=""
if [ "$1" = "rebuild" ]; then
    REBUILD_FLAG="--no-cache"
    echo "🔄 强制重新构建模式已启用"
else
    echo "⚡ 增量构建模式（如需强制重新构建，请使用: $0 rebuild）"
fi

# 检查Docker是否安装
if ! command -v docker &> /dev/null; then
    echo "❌ Docker未安装，请先安装Docker"
    exit 1
fi

# 检查docker compose是否可用（现代Docker内置）
if ! docker compose version &> /dev/null; then
    echo "❌ Docker Compose不可用，请更新到支持内置compose的Docker版本"
    exit 1
fi

# 切换到docker目录
cd "$(dirname "$0")"

# 检查环境变量文件
if [ ! -f ".env" ]; then
    echo "⚠️  未找到.env文件，正在创建示例文件..."
    if [ -f "docker.env.template" ]; then
        cp docker.env.template .env
    else
        cp ../env.template .env
    fi
    echo "📝 请编辑.env文件，设置您的API密钥和数据库配置"
    echo "   nano .env"
    echo ""
    echo "⚠️  重要配置项："
    echo "   - OPENAI_API_KEY: 您的AI API密钥"
    echo "   - DB_PASSWORD: 数据库密码"
    echo "   - ADMIN_PASSWORD: 管理员密码"
    echo "   - PORT: 服务器端口号（默认8000）"
    echo ""
    echo "💡 请设置完整配置后再运行部署"
    exit 1
fi

# 加载环境变量
source .env

# 获取端口号，如果未设置则使用默认值8000
APP_PORT=${PORT:-8000}

# 检查关键环境变量
if [ -z "$OPENAI_API_KEY" ] || [ "$OPENAI_API_KEY" = "your_api_key_here" ]; then
    echo "❌ 请在.env文件中设置有效的OPENAI_API_KEY"
    exit 1
fi

if [ -z "$DB_PASSWORD" ] || [ "$DB_PASSWORD" = "your_secure_database_password" ]; then
    echo "❌ 请在.env文件中设置安全的DB_PASSWORD"
    exit 1
fi

echo "🔧 配置信息："
echo "   应用端口: $APP_PORT"
echo "   数据库: ${DB_NAME:-ai_detective}"
echo "   数据库用户: ${DB_USER:-gameuser}"
echo "   BuildKit优化: 已启用"
if [ -n "$REBUILD_FLAG" ]; then
    echo "   构建模式: 强制重新构建"
else
    echo "   构建模式: 增量构建"
fi
echo ""

# 停止现有容器
echo "🛑 停止现有容器..."
docker compose down

# 构建镜像
if [ -n "$REBUILD_FLAG" ]; then
    echo "🧹 强制重新构建镜像..."
    docker compose build $REBUILD_FLAG
else
    echo "⚡ 增量构建镜像..."
    docker compose build
fi

# 启动数据库服务
echo "🗄️  启动数据库服务..."
docker compose up -d mysql

# 等待数据库就绪
echo "⏳ 等待数据库就绪..."
timeout=60
counter=0
while ! docker compose exec -T mysql mysqladmin ping -h localhost -u root -p"$DB_PASSWORD" --silent > /dev/null 2>&1; do
    if [ $counter -ge $timeout ]; then
        echo "❌ 数据库启动超时，请检查配置"
        docker compose logs mysql
        exit 1
    fi
    echo "数据库启动中... ($counter/$timeout)"
    sleep 2
    counter=$((counter + 1))
done

echo "✅ 数据库已就绪！"

# 启动应用服务
echo "🚀 启动应用服务..."
docker compose up -d

# 等待应用服务启动
echo "⏳ 等待应用服务启动..."
app_timeout=120
app_counter=0
while ! curl -f http://localhost:$APP_PORT/api/health > /dev/null 2>&1; do
    if [ $app_counter -ge $app_timeout ]; then
        echo "❌ 应用服务启动超时，请检查日志"
        docker compose logs ai-detective
        exit 1
    fi
    echo "应用服务启动中... ($app_counter/$app_timeout)"
    sleep 1
    app_counter=$((app_counter + 1))
done

echo "✅ 应用服务已就绪！"

# 检查服务状态
echo "🔍 最终服务状态检查..."
if curl -f http://localhost:$APP_PORT/api/health > /dev/null 2>&1; then
    echo "✅ 服务启动成功！"
    echo ""
    echo "🗄️  数据库信息："
    echo "   主机: localhost:3306"
    echo "   数据库: $DB_NAME"
    echo "   用户: $DB_USER"
    echo ""
    echo "📋 管理命令："
    echo "   查看应用日志: docker compose logs -f ai-detective"
    echo "   查看数据库日志: docker compose logs -f mysql"
    echo "   查看所有日志: docker compose logs -f"
    echo "   停止服务: docker compose down"
    echo "   重启服务: docker compose restart"
    echo "   进入数据库: docker compose exec mysql mysql -u $DB_USER -p$DB_PASSWORD $DB_NAME"
    echo ""
    echo "💾 数据库管理："
    echo "   备份数据库: ./backup-database.sh"
    echo "   还原数据库: ./restore-database.sh <备份文件路径>"
    echo "   查看备份: ls -la ../backups/"
    echo ""
    echo "🔄 部署管理："
    echo "   增量构建: $0"
    echo "   强制重建: $0 rebuild"
    echo "   查看日志: docker compose logs -f"
    echo "   停止服务: docker compose down"
    echo ""
    echo "🎮 开始游戏：享受推理乐趣！"
    echo ""
    echo "🌐 访问地址："
    echo "   🎯 游戏界面: http://localhost:$APP_PORT"
    echo "   📚 API文档: http://localhost:$APP_PORT/docs"
    echo "   ❤️  健康检查: http://localhost:$APP_PORT/api/health"
else
    echo "❌ 服务启动失败，请检查日志："
    echo "   docker compose logs ai-detective"
    echo "   docker compose logs mysql"
    echo ""
    echo "🔍 尝试访问: http://localhost:$APP_PORT/api/health"
fi 