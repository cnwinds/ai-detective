@echo off
chcp 65001 >nul

echo 🔄 AI侦探推理游戏 - 数据库还原
echo ================================

REM 切换到脚本所在目录
cd /d "%~dp0"

REM 检查参数
if "%~1"=="" (
    echo ❌ 请指定备份文件路径
    echo.
    echo 用法: %0 ^<备份文件路径^>
    echo.
    echo 示例:
    echo    %0 "..\backups\ai_detective_backup_20241201_143022.sql"
    echo    %0 "C:\path\to\backup.sql"
    echo.
    
    REM 显示可用的备份文件
    if exist "..\backups\ai_detective_backup_*.sql" (
        echo 📋 可用的备份文件：
        dir /o-d "..\backups\ai_detective_backup_*.sql"
    ) else (
        echo 💡 提示: 先运行 backup-database.bat 创建备份
    )
    pause
    exit /b 1
)

set BACKUP_FILE=%~1

REM 检查备份文件是否存在
if not exist "%BACKUP_FILE%" (
    echo ❌ 备份文件不存在: %BACKUP_FILE%
    pause
    exit /b 1
)

REM 检查环境变量文件
if not exist ".env" (
    echo ❌ 未找到.env文件，请先运行部署脚本
    pause
    exit /b 1
)

REM 读取环境变量（简化版）
set DB_NAME=ai_detective
set DB_USER=gameuser
set DB_PASSWORD=password

for /f "tokens=1,2 delims==" %%a in ('type .env ^| find "DB_NAME="') do set DB_NAME=%%b
for /f "tokens=1,2 delims==" %%a in ('type .env ^| find "DB_USER="') do set DB_USER=%%b
for /f "tokens=1,2 delims==" %%a in ('type .env ^| find "DB_PASSWORD="') do set DB_PASSWORD=%%b

REM 检查Docker服务是否运行
docker compose ps mysql | find "Up" >nul
if errorlevel 1 (
    echo ❌ MySQL容器未运行，请先启动服务
    echo    运行: deploy.bat
    pause
    exit /b 1
)

REM 获取备份文件信息
for %%A in ("%BACKUP_FILE%") do (
    set BACKUP_SIZE=%%~zA
    set BACKUP_DATE=%%~tA
)

echo 🔧 还原配置：
echo    数据库: %DB_NAME%
echo    用户: %DB_USER%
echo    备份文件: %BACKUP_FILE%
echo    文件大小: %BACKUP_SIZE% 字节
echo    备份时间: %BACKUP_DATE%
echo.

REM 确认操作
echo ⚠️  警告: 此操作将完全替换当前数据库内容！
echo    当前数据库中的所有数据将被删除并替换为备份数据
echo.
set /p CONFIRM=确认继续还原吗？(输入 'yes' 确认): 

if not "%CONFIRM%"=="yes" (
    echo ❌ 操作已取消
    pause
    exit /b 1
)

REM 创建当前数据库的安全备份
echo 📦 创建当前数据库的安全备份...
if not exist "..\backups" mkdir "..\backups"

REM 生成安全备份文件名
for /f "tokens=1-4 delims=/ " %%a in ('date /t') do set DATESTAMP=%%c%%a%%b
for /f "tokens=1-2 delims=: " %%a in ('time /t') do set TIMESTAMP=%%a%%b
set TIMESTAMP=%TIMESTAMP: =0%
set SAFETY_BACKUP=..\backups\safety_backup_before_restore_%DATESTAMP%_%TIMESTAMP%.sql

docker compose exec -T mysql mysqldump -u %DB_USER% -p%DB_PASSWORD% --single-transaction --routines --triggers %DB_NAME% > "%SAFETY_BACKUP%" 2>nul

if exist "%SAFETY_BACKUP%" (
    echo ✅ 安全备份已创建: %SAFETY_BACKUP%
) else (
    echo ⚠️  无法创建安全备份，但继续还原...
)

REM 执行还原
echo.
echo 🔄 开始还原数据库...
echo    这可能需要几分钟时间，请耐心等待...

docker compose exec -T mysql mysql -u %DB_USER% -p%DB_PASSWORD% %DB_NAME% < "%BACKUP_FILE%"

if errorlevel 1 (
    echo ❌ 数据库还原失败！
    echo.
    echo 🔄 尝试恢复安全备份...
    if exist "%SAFETY_BACKUP%" (
        docker compose exec -T mysql mysql -u %DB_USER% -p%DB_PASSWORD% %DB_NAME% < "%SAFETY_BACKUP%"
        if not errorlevel 1 (
            echo ✅ 已恢复到还原前的状态
        ) else (
            echo ❌ 安全备份恢复也失败了！
            echo    请手动检查数据库状态
        )
    )
    pause
    exit /b 1
)

echo ✅ 数据库还原成功！
echo.

REM 验证还原结果
echo 🔍 验证还原结果...
docker compose exec -T mysql mysql -u %DB_USER% -p%DB_PASSWORD% -e "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='%DB_NAME%';" -s -N %DB_NAME% > temp_count.txt 2>nul
if exist temp_count.txt (
    set /p TABLE_COUNT=<temp_count.txt
    del temp_count.txt
    echo    数据库表数量: %TABLE_COUNT%
    
    if not "%TABLE_COUNT%"=="0" (
        echo ✅ 数据库还原验证通过
        
        REM 显示主要表的记录数
        echo.
        echo 📊 主要表记录统计：
        for %%T in (game_sessions conversations evaluations) do (
            docker compose exec -T mysql mysql -u %DB_USER% -p%DB_PASSWORD% -e "SELECT COUNT(*) FROM %%T;" -s -N %DB_NAME% > temp_count.txt 2>nul
            if exist temp_count.txt (
                set /p COUNT=<temp_count.txt
                del temp_count.txt
                echo    %%T: !COUNT! 条记录
            ) else (
                echo    %%T: 表不存在
            )
        )
    ) else (
        echo ⚠️  警告: 数据库中没有表，可能还原不完整
    )
) else (
    echo ⚠️  无法验证还原结果
)

echo.
echo 💡 还原完成提示：
echo    1. 重启应用服务以确保连接正常
echo    2. 检查游戏功能是否正常
echo    3. 安全备份保存在: %SAFETY_BACKUP%
echo.
echo 🔄 重启应用服务:
echo    docker compose restart ai-detective

pause 