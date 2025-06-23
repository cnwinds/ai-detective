# 代码规范
一定要加载 docs/DEVELOPER_GUIDE.md 指导代码开发

# 启动服务端（先要关闭已有的服务）
netstat -ano | findstr :8000
taskkill /f /pid 8000
python start_game.py
