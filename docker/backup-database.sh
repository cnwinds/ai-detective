#!/bin/bash

# AI侦探推理游戏 - 数据库备份脚本
echo "💾 AI侦探推理游戏 - 数据库备份"
echo "================================"

# 切换到docker目录
cd "$(dirname "$0")"

# 检查环境变量文件
if [ ! -f ".env" ]; then
    echo "❌ 未找到.env文件，请先运行部署脚本"
    exit 1
fi

# 加载环境变量
source .env

# 设置默认值
DB_NAME=${DB_NAME:-ai_detective}
DB_USER=${DB_USER:-gameuser}
DB_PASSWORD=${DB_PASSWORD:-password}

# 检查Docker服务是否运行
if ! docker compose ps mysql | grep -q "Up"; then
    echo "❌ MySQL容器未运行，请先启动服务"
    echo "   运行: ./deploy.sh"
    exit 1
fi

# 创建备份目录
BACKUP_DIR="../backups"
mkdir -p "$BACKUP_DIR"

# 生成备份文件名（包含时间戳）
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="$BACKUP_DIR/ai_detective_backup_$TIMESTAMP.sql"

echo "🔧 备份配置："
echo "   数据库: $DB_NAME"
echo "   用户: $DB_USER"
echo "   备份文件: $BACKUP_FILE"
echo ""

# 执行备份
echo "📦 开始备份数据库..."
if docker compose exec -T mysql mysqldump \
    -u "$DB_USER" \
    -p"$DB_PASSWORD" \
    --single-transaction \
    --routines \
    --triggers \
    --add-drop-table \
    --add-locks \
    --extended-insert \
    --quick \
    --lock-tables=false \
    "$DB_NAME" > "$BACKUP_FILE"; then
    
    # 检查备份文件大小
    BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    echo "✅ 数据库备份成功！"
    echo "   备份文件: $BACKUP_FILE"
    echo "   文件大小: $BACKUP_SIZE"
    echo ""
    
    # 显示最近的备份文件
    echo "📋 最近的备份文件："
    ls -lht "$BACKUP_DIR"/ai_detective_backup_*.sql | head -5
    echo ""
    
    # 清理旧备份（保留最近10个）
    echo "🧹 清理旧备份文件（保留最近10个）..."
    cd "$BACKUP_DIR"
    ls -t ai_detective_backup_*.sql | tail -n +11 | xargs -r rm -f
    REMAINING_COUNT=$(ls ai_detective_backup_*.sql 2>/dev/null | wc -l)
    echo "   当前备份文件数量: $REMAINING_COUNT"
    
else
    echo "❌ 数据库备份失败！"
    echo "请检查："
    echo "   1. MySQL容器是否正常运行"
    echo "   2. 数据库连接配置是否正确"
    echo "   3. 用户权限是否足够"
    exit 1
fi

echo ""
echo "💡 使用说明："
echo "   恢复备份: ./restore-database.sh $BACKUP_FILE"
echo "   查看备份: ls -la $BACKUP_DIR/"
echo "   定期备份: 可以设置cron定时任务" 