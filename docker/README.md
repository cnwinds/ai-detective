# AI侦探推理游戏 - Docker部署指南

本项目支持在不同环境下进行Docker部署，提供了完整的数据库备份和还原功能。

## 🌍 环境支持

- **开发环境**: Windows PowerShell
- **生产环境**: Linux

## 🚀 快速部署

### 开发环境 (Windows PowerShell)

```powershell
# 1. 进入docker目录
cd docker

# 2. 部署服务
.\deploy.bat

# 3. 备份数据库（可选）
.\backup-database.bat

# 4. 还原数据库（可选）
.\restore-database.bat "备份文件路径"
```

### 生产环境 (Linux)

```bash
# 1. 进入docker目录
cd docker

# 2. 给脚本添加执行权限
chmod +x *.sh

# 3. 部署服务
./deploy.sh

# 4. 备份数据库（可选）
./backup-database.sh

# 5. 还原数据库（可选）
./restore-database.sh 备份文件路径
```

## 📁 文件说明

### 部署脚本
- `deploy.bat` - Windows开发环境部署脚本
- `deploy.sh` - Linux生产环境部署脚本

### 数据库管理脚本
- `backup-database.bat` - Windows数据库备份脚本
- `backup-database.sh` - Linux数据库备份脚本
- `restore-database.bat` - Windows数据库还原脚本
- `restore-database.sh` - Linux数据库还原脚本

### 配置文件
- `docker-compose.yml` - MySQL 5.7配置
- `Dockerfile` - 应用镜像构建文件
- `.env` - 实际环境变量文件（需要创建）

### 文档
- `DATABASE-BACKUP-GUIDE.md` - 详细的数据库备份还原指南

## ⚙️ 配置步骤

### 1. 创建环境变量文件

```bash
# 复制根目录的模板文件
cp ../env.template .env

# 编辑配置文件，注意修改Docker相关配置：
# - DB_HOST=mysql（而不是localhost）
# - DB_USER=gameuser（而不是root）
# Windows: notepad .env
# Linux: nano .env
```

### 2. 重要配置项

```env
# AI配置
OPENAI_API_KEY=your_api_key_here
OPENAI_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
OPENAI_MODEL=deepseek-v3

# 服务器配置
HOST=0.0.0.0
PORT=8000

# 数据库配置
DB_PASSWORD=your_secure_database_password
DB_NAME=ai_detective
DB_USER=gameuser

# 管理员配置
ADMIN_PASSWORD=your_secure_admin_password
```

## 🔧 高级功能

### 动态端口配置
通过修改`.env`文件中的`PORT`变量，可以动态设置应用端口：

```env
PORT=9000  # 修改为您想要的端口号
```

### 自动备份设置

#### Windows计划任务
```powershell
schtasks /create /tn "AI Detective DB Backup" /tr "D:\ai_projects\ai-detective\docker\backup-database.bat" /sc daily /st 02:00
```

#### Linux Cron任务
```bash
# 编辑crontab
crontab -e

# 添加每小时备份任务
0 * * * * /opt/ai-detective/docker/backup-database.sh
```

## 🌐 访问地址

部署成功后，可以通过以下地址访问：

- **游戏界面**: http://localhost:8000
- **API文档**: http://localhost:8000/docs
- **健康检查**: http://localhost:8000/api/health

## 📋 常用命令

### 服务管理
```bash
# 查看服务状态
docker compose ps

# 查看日志
docker compose logs -f ai-detective
docker compose logs -f mysql

# 重启服务
docker compose restart

# 停止服务
docker compose down
```

### 数据库管理
```bash
# 进入数据库
docker compose exec mysql mysql -u gameuser -p ai_detective

# 查看数据库大小
docker compose exec mysql mysql -u gameuser -p -e "SELECT table_schema AS 'Database', ROUND(SUM(data_length + index_length) / 1024 / 1024, 2) AS 'Size (MB)' FROM information_schema.tables WHERE table_schema='ai_detective';" ai_detective
```

## 🛠️ 故障排除

### 常见问题

1. **端口被占用**
   - 修改`.env`文件中的`PORT`值
   - 或停止占用端口的其他服务

2. **数据库连接失败**
   - 检查`.env`文件中的数据库配置
   - 确认MySQL容器正常运行

3. **权限问题**
   - Windows: 以管理员身份运行PowerShell
   - Linux: 给脚本添加执行权限 `chmod +x *.sh`

4. **Docker服务未启动**
   - Windows: 启动Docker Desktop
   - Linux: `sudo systemctl start docker`

### 获取帮助

如果遇到问题，请查看：
1. `DATABASE-BACKUP-GUIDE.md` - 数据库相关问题
2. 容器日志：`docker compose logs`

## 🎮 开始游戏

部署完成后，打开浏览器访问 http://localhost:8000，开始您的AI侦探推理之旅！

游戏特色：
- 🕵️ 沉浸式中文推理体验
- 🎨 优雅的浅蓝色界面设计
- 💾 完整的游戏进度保存
- 📊 详细的游戏数据统计