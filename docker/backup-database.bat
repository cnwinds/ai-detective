@echo off
chcp 65001 >nul

echo 💾 AI侦探推理游戏 - 数据库备份
echo ================================

REM 切换到脚本所在目录
cd /d "%~dp0"

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

REM 创建备份目录
if not exist "..\backups" mkdir "..\backups"

REM 生成备份文件名（包含时间戳）
for /f "tokens=1-4 delims=/ " %%a in ('date /t') do set DATESTAMP=%%c%%a%%b
for /f "tokens=1-2 delims=: " %%a in ('time /t') do set TIMESTAMP=%%a%%b
set TIMESTAMP=%TIMESTAMP: =0%
set BACKUP_FILE=..\backups\ai_detective_backup_%DATESTAMP%_%TIMESTAMP%.sql

echo 🔧 备份配置：
echo    数据库: %DB_NAME%
echo    用户: %DB_USER%
echo    备份文件: %BACKUP_FILE%
echo.

REM 执行备份
echo 📦 开始备份数据库...
docker compose exec -T mysql mysqldump -u %DB_USER% -p%DB_PASSWORD% --single-transaction --routines --triggers --add-drop-table --add-locks --extended-insert --quick --lock-tables=false %DB_NAME% > "%BACKUP_FILE%"

if errorlevel 1 (
    echo ❌ 数据库备份失败！
    echo 请检查：
    echo    1. MySQL容器是否正常运行
    echo    2. 数据库连接配置是否正确
    echo    3. 用户权限是否足够
    pause
    exit /b 1
)

REM 检查备份文件是否创建成功
if exist "%BACKUP_FILE%" (
    echo ✅ 数据库备份成功！
    echo    备份文件: %BACKUP_FILE%
    
    REM 显示文件大小
    for %%A in ("%BACKUP_FILE%") do echo    文件大小: %%~zA 字节
    echo.
    
    REM 显示最近的备份文件
    echo 📋 最近的备份文件：
    dir /o-d /b "..\backups\ai_detective_backup_*.sql" 2>nul | head -5
    echo.
    
    REM 清理旧备份（保留最近10个）
    echo 🧹 清理旧备份文件（保留最近10个）...
    set COUNT=0
    for /f %%f in ('dir /o-d /b "..\backups\ai_detective_backup_*.sql" 2^>nul') do (
        set /a COUNT+=1
        if !COUNT! gtr 10 del "..\backups\%%f"
    )
    
    REM 统计当前备份文件数量
    set REMAINING_COUNT=0
    for %%f in ("..\backups\ai_detective_backup_*.sql") do set /a REMAINING_COUNT+=1
    echo    当前备份文件数量: %REMAINING_COUNT%
    
) else (
    echo ❌ 备份文件创建失败！
    pause
    exit /b 1
)

echo.
echo 💡 使用说明：
echo    恢复备份: restore-database.bat "%BACKUP_FILE%"
echo    查看备份: dir "..\backups\"
echo    定期备份: 可以设置Windows计划任务

pause 