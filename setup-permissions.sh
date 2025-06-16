#!/bin/bash

# AI侦探推理游戏 - 权限设置脚本
echo "🔧 设置脚本执行权限..."

# 设置所有shell脚本的执行权限
chmod +x docker/*.sh
chmod +x *.sh

# 检查是否成功
if [ $? -eq 0 ]; then
    echo "✅ 权限设置完成！"
    echo ""
    echo "📋 已设置执行权限的文件："
    ls -la docker/*.sh *.sh 2>/dev/null | grep -E "^-rwx" || echo "   (使用 ls -la docker/*.sh 查看详细权限)"
    echo ""
    echo "🚀 现在可以直接运行："
    echo "   ./docker/deploy.sh"
    echo "   ./docker/backup-database.sh"
    echo "   ./docker/restore-database.sh"
else
    echo "❌ 权限设置失败，请手动运行："
    echo "   chmod +x docker/*.sh"
    echo "   chmod +x *.sh"
fi 