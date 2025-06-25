@echo off
chcp 65001 >nul

REM AI侦探推理游戏 Docker部署脚本
echo 🕵️ AI侦探推理游戏 Docker部署脚本
echo ==================================

REM 设置Docker BuildKit优化
set COMPOSE_BAKE=true

REM 检查是否需要强制重新构建
set REBUILD_FLAG=
if "%1"=="rebuild" (
    set REBUILD_FLAG=--no-cache
    echo 🔄 强制重新构建模式已启用
) else (
    echo ⚡ 增量构建模式（如需强制重新构建，请使用: %0 rebuild）
)

REM 检查Docker是否安装
docker --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Docker未安装，请先安装Docker Desktop
    pause
    exit /b 1
)

REM 检查docker compose是否可用（现代Docker内置）
docker compose version >nul 2>&1
if errorlevel 1 (
    echo ❌ Docker Compose不可用，请更新到支持内置compose的Docker版本
    pause
    exit /b 1
)

REM 切换到docker目录
cd /d "%~dp0"

REM 检查环境变量文件
if not exist ".env" (
    echo ⚠️  未找到.env文件，正在创建示例文件...
    copy "..\env.template" ".env" >nul
    echo 📝 请编辑.env文件，设置您的API密钥和数据库配置
    echo    notepad .env
    echo.
    echo ⚠️  重要配置项：
    echo    - OPENAI_API_KEY: 您的AI API密钥
    echo    - DB_PASSWORD: 数据库密码
    echo    - ADMIN_PASSWORD: 管理员密码
    echo    - PORT: 服务器端口号（默认8000）
    echo.
    echo 💡 请设置完整配置后再运行部署
    pause
    exit /b 1
)

REM 加载环境变量
for /f "tokens=1,2 delims==" %%a in ('type .env ^| findstr /v "^#" ^| findstr "="') do (
    set "%%a=%%b"
)

REM 获取端口号，如果未设置则使用默认值8000
if "%PORT%"=="" set PORT=8000

REM 检查关键环境变量
if "%OPENAI_API_KEY%"=="" (
    echo ❌ 请在.env文件中设置有效的OPENAI_API_KEY
    pause
    exit /b 1
)
if "%OPENAI_API_KEY%"=="your_api_key_here" (
    echo ❌ 请在.env文件中设置有效的OPENAI_API_KEY
    pause
    exit /b 1
)

if "%DB_PASSWORD%"=="" (
    echo ❌ 请在.env文件中设置安全的DB_PASSWORD
    pause
    exit /b 1
)
if "%DB_PASSWORD%"=="your_secure_database_password" (
    echo ❌ 请在.env文件中设置安全的DB_PASSWORD
    pause
    exit /b 1
)

if "%DB_NAME%"=="" set DB_NAME=ai_detective
if "%DB_USER%"=="" set DB_USER=gameuser

echo 🔧 配置信息：
echo    应用端口: %PORT%
echo    数据库: %DB_NAME%
echo    数据库用户: %DB_USER%
echo    BuildKit优化: 已启用
if defined REBUILD_FLAG (
    echo    构建模式: 强制重新构建
) else (
    echo    构建模式: 增量构建
)
echo.

REM 停止现有容器
echo 🛑 停止现有容器...
docker compose down

REM 构建镜像
if defined REBUILD_FLAG (
    echo 🧹 强制重新构建镜像...
    docker compose build %REBUILD_FLAG%
) else (
    echo ⚡ 增量构建镜像...
    docker compose build
)

if errorlevel 1 (
    echo ❌ 镜像构建失败
    pause
    exit /b 1
)

REM 启动数据库服务
echo 🗄️  启动数据库服务...
docker compose up -d mysql

REM 等待数据库就绪
echo ⏳ 等待数据库就绪...
set /a timeout=60
set /a counter=0

:wait_db
docker compose exec -T mysql mysqladmin ping -h localhost -u root -p%DB_PASSWORD% --silent >nul 2>&1
if not errorlevel 1 goto db_ready

if %counter% geq %timeout% (
    echo ❌ 数据库启动超时，请检查配置
    docker compose logs mysql
    pause
    exit /b 1
)

echo 数据库启动中... (%counter%/%timeout%)
timeout /t 2 /nobreak >nul
set /a counter+=1
goto wait_db

:db_ready
echo ✅ 数据库已就绪！

REM 启动应用服务
echo 🚀 启动应用服务...
docker compose up -d

REM 等待应用服务启动
echo ⏳ 等待应用服务启动...
set /a app_timeout=120
set /a app_counter=0

:wait_app
curl -f http://localhost:%PORT%/api/health >nul 2>&1
if not errorlevel 1 goto app_ready

if %app_counter% geq %app_timeout% (
    echo ❌ 应用服务启动超时，请检查日志
    docker compose logs ai-detective
    pause
    exit /b 1
)

echo 应用服务启动中... (%app_counter%/%app_timeout%)
timeout /t 1 /nobreak >nul
set /a app_counter+=1
goto wait_app

:app_ready
echo ✅ 应用服务已就绪！

REM 检查服务状态
echo 🔍 最终服务状态检查...
curl -f http://localhost:%PORT%/api/health >nul 2>&1
if not errorlevel 1 (
    echo ✅ 服务启动成功！
    echo.
    echo 🗄️  数据库信息：
    echo    主机: localhost:3306
    echo    数据库: %DB_NAME%
    echo    用户: %DB_USER%
    echo.
    echo 📋 管理命令：
    echo    查看应用日志: docker compose logs -f ai-detective
    echo    查看数据库日志: docker compose logs -f mysql
    echo    查看所有日志: docker compose logs -f
    echo    停止服务: docker compose down
    echo    重启服务: docker compose restart
    echo    进入数据库: docker compose exec mysql mysql -u %DB_USER% -p%DB_PASSWORD% %DB_NAME%
    echo.
    echo 💾 数据库管理：
    echo    备份数据库: backup-database.bat
    echo    还原数据库: restore-database.bat ^<备份文件路径^>
    echo    查看备份: dir ..\backups\
    echo.
    echo 🔄 部署管理：
    echo    增量构建: %0
    echo    强制重建: %0 rebuild
    echo    查看日志: docker compose logs -f
    echo    停止服务: docker compose down
    echo.
    echo 🎮 开始游戏：享受推理乐趣！
    echo.
    echo 🌐 访问地址：
    echo    🎯 游戏界面: http://localhost:%PORT%
    echo    📚 API文档: http://localhost:%PORT%/docs
    echo    ❤️  健康检查: http://localhost:%PORT%/api/health
) else (
    echo ❌ 服务启动失败，请检查日志：
    echo    docker compose logs ai-detective
    echo    docker compose logs mysql
    echo.
    echo 🔍 尝试访问: http://localhost:%PORT%/api/health
)

pause