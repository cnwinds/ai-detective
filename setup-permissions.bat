@echo off
chcp 65001 >nul

REM AI侦探推理游戏 - Windows权限设置脚本
echo 🔧 检查Windows环境...

REM Windows不需要设置执行权限，但检查文件是否存在
echo ✅ Windows环境下脚本文件默认可执行！
echo.
echo 📋 可用的脚本文件：

if exist "docker\deploy.bat" (
    echo    ✓ docker\deploy.bat
) else (
    echo    ✗ docker\deploy.bat 未找到
)

if exist "docker\backup-database.bat" (
    echo    ✓ docker\backup-database.bat
) else (
    echo    ✗ docker\backup-database.bat 未找到
)

if exist "docker\restore-database.bat" (
    echo    ✓ docker\restore-database.bat
) else (
    echo    ✗ docker\restore-database.bat 未找到
)

echo.
echo 🚀 现在可以直接运行：
echo    docker\deploy.bat
echo    docker\backup-database.bat
echo    docker\restore-database.bat
echo.
echo 💡 如果需要在WSL或Git Bash中运行shell脚本，请使用：
echo    bash setup-permissions.sh

pause 