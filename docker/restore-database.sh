#!/bin/bash

# AI侦探推理游戏 - 数据库还原脚本
echo "🔄 AI侦探推理游戏 - 数据库还原"
echo "================================"

# 切换到docker目录
cd "$(dirname "$0")"

# 检查参数
if [ $# -eq 0 ]; then
    echo "❌ 请指定备份文件路径"
    echo ""
    echo "用法: $0 <备份文件路径>"
    echo ""
    echo "示例:"
    echo "   $0 ../backups/ai_detective_backup_20241201_143022.sql"
    echo "   $0 /path/to/backup.sql"
    echo ""
    
    # 显示可用的备份文件
    BACKUP_DIR="../backups"
    if [ -d "$BACKUP_DIR" ] && [ "$(ls -A $BACKUP_DIR/ai_detective_backup_*.sql 2>/dev/null)" ]; then
        echo "📋 可用的备份文件："
        ls -lht "$BACKUP_DIR"/ai_detective_backup_*.sql | head -10
    else
        echo "💡 提示: 先运行 ./backup-database.sh 创建备份"
    fi
    exit 1
fi

BACKUP_FILE="$1"

# 检查备份文件是否存在
if [ ! -f "$BACKUP_FILE" ]; then
    echo "❌ 备份文件不存在: $BACKUP_FILE"
    exit 1
fi

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

# 获取备份文件信息
BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
BACKUP_DATE=$(stat -c %y "$BACKUP_FILE" 2>/dev/null || stat -f %Sm "$BACKUP_FILE" 2>/dev/null || echo "未知")

echo "🔧 还原配置："
echo "   数据库: $DB_NAME"
echo "   用户: $DB_USER"
echo "   备份文件: $BACKUP_FILE"
echo "   文件大小: $BACKUP_SIZE"
echo "   备份时间: $BACKUP_DATE"
echo ""

# 确认操作
echo "⚠️  警告: 此操作将完全替换当前数据库内容！"
echo "   当前数据库中的所有数据将被删除并替换为备份数据"
echo ""
read -p "确认继续还原吗？(输入 'yes' 确认): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    echo "❌ 操作已取消"
    exit 1
fi

# 创建当前数据库的临时备份
echo "📦 创建当前数据库的安全备份..."
SAFETY_BACKUP="../backups/safety_backup_before_restore_$(date +"%Y%m%d_%H%M%S").sql"
mkdir -p "../backups"

if docker compose exec -T mysql mysqldump \
    -u "$DB_USER" \
    -p"$DB_PASSWORD" \
    --single-transaction \
    --routines \
    --triggers \
    "$DB_NAME" > "$SAFETY_BACKUP" 2>/dev/null; then
    echo "✅ 安全备份已创建: $SAFETY_BACKUP"
else
    echo "⚠️  无法创建安全备份，但继续还原..."
fi

# 执行还原
echo ""
echo "🔄 开始还原数据库..."
echo "   这可能需要几分钟时间，请耐心等待..."

if docker compose exec -T mysql mysql \
    -u "$DB_USER" \
    -p"$DB_PASSWORD" \
    "$DB_NAME" < "$BACKUP_FILE"; then
    
    echo "✅ 数据库还原成功！"
    echo ""
    
    # 验证还原结果
    echo "🔍 验证还原结果..."
    TABLE_COUNT=$(docker compose exec -T mysql mysql \
        -u "$DB_USER" \
        -p"$DB_PASSWORD" \
        -e "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='$DB_NAME';" \
        -s -N "$DB_NAME" 2>/dev/null || echo "0")
    
    echo "   数据库表数量: $TABLE_COUNT"
    
    if [ "$TABLE_COUNT" -gt 0 ]; then
        echo "✅ 数据库还原验证通过"
        
        # 显示主要表的记录数
        echo ""
        echo "📊 主要表记录统计："
        for table in game_sessions conversations evaluations; do
            COUNT=$(docker compose exec -T mysql mysql \
                -u "$DB_USER" \
                -p"$DB_PASSWORD" \
                -e "SELECT COUNT(*) FROM $table;" \
                -s -N "$DB_NAME" 2>/dev/null || echo "表不存在")
            echo "   $table: $COUNT 条记录"
        done
    else
        echo "⚠️  警告: 数据库中没有表，可能还原不完整"
    fi
    
else
    echo "❌ 数据库还原失败！"
    echo ""
    echo "🔄 尝试恢复安全备份..."
    if [ -f "$SAFETY_BACKUP" ]; then
        if docker compose exec -T mysql mysql \
            -u "$DB_USER" \
            -p"$DB_PASSWORD" \
            "$DB_NAME" < "$SAFETY_BACKUP"; then
            echo "✅ 已恢复到还原前的状态"
        else
            echo "❌ 安全备份恢复也失败了！"
            echo "   请手动检查数据库状态"
        fi
    fi
    exit 1
fi

echo ""
echo "💡 还原完成提示："
echo "   1. 重启应用服务以确保连接正常"
echo "   2. 检查游戏功能是否正常"
echo "   3. 安全备份保存在: $SAFETY_BACKUP"
echo ""
echo "🔄 重启应用服务:"
echo "   docker compose restart ai-detective" 