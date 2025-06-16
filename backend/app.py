import os
import sys
import logging
from datetime import datetime
from pathlib import Path
import re

from fastapi import FastAPI, Request
from fastapi.responses import FileResponse, HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware

# 配置统一的日志系统
import uvicorn.logging

# 创建自定义日志格式器
class CustomFormatter(logging.Formatter):
    def format(self, record):
        # 统一的时间格式
        record.asctime = self.formatTime(record, '%Y-%m-%d %H:%M:%S')
        
        # 简化模块名显示
        if record.name.startswith('uvicorn'):
            record.name = 'server'
        elif record.name == '__main__':
            record.name = 'app'
        elif record.name.startswith('backend'):
            record.name = record.name.replace('backend.', '')
        
        return f"{record.asctime} - {record.name} - {record.levelname} - {record.getMessage()}"

# 配置根日志记录器
root_logger = logging.getLogger()
root_logger.setLevel(logging.INFO)

# 清除现有的处理器
for handler in root_logger.handlers[:]:
    root_logger.removeHandler(handler)

# 创建控制台处理器
console_handler = logging.StreamHandler()
console_handler.setFormatter(CustomFormatter())
root_logger.addHandler(console_handler)

# 配置uvicorn日志使用相同格式
uvicorn_logger = logging.getLogger("uvicorn")
uvicorn_access_logger = logging.getLogger("uvicorn.access")

# 设置日志级别
uvicorn_logger.setLevel(logging.INFO)
uvicorn_access_logger.setLevel(logging.INFO)

logger = logging.getLogger(__name__)

# 导入路由模块
from backend.routes.game import game_router, cases_router
from backend.routes.history import history_router
from backend.routes.admin import admin_router, admin_pages_router
from backend.routes.common import common_router
from backend.routes.websocket import ws_router

# 导入必要的模块用于版本和异常处理
from backend.version import get_version, get_js_version

app = FastAPI(title="侦探推理游戏API", version="1.0.0")

# 配置CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 注册路由模块
app.include_router(game_router)
app.include_router(cases_router)
app.include_router(history_router)
app.include_router(admin_router)
app.include_router(admin_pages_router)
app.include_router(common_router)
app.include_router(ws_router)

# 全局异常处理器
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """全局异常处理器"""
    logger.error(f"全局异常捕获 - 路径: {request.url.path}, 方法: {request.method}, 错误: {str(exc)}")
    logger.exception("详细错误信息:")
    
    # 对于HTTP异常，保持原有的状态码和消息
    from fastapi import HTTPException
    if isinstance(exc, HTTPException):
        return JSONResponse(
            status_code=exc.status_code,
            content={"detail": exc.detail}
        )
    
    # 对于其他异常，返回500错误
    return JSONResponse(
        status_code=500,
        content={"detail": f"服务器内部错误: {str(exc)}"}
    )

# 请求日志中间件
@app.middleware("http")
async def log_requests(request: Request, call_next):
    """记录所有HTTP请求"""
    start_time = datetime.now()
    
    # 记录请求开始
    logger.info(f"请求开始 - {request.method} {request.url.path} - 客户端: {_get_client_ip(request)}")
    
    try:
        response = await call_next(request)
        
        # 计算处理时间
        process_time = (datetime.now() - start_time).total_seconds()
        
        # 记录请求完成
        logger.info(f"请求完成 - {request.method} {request.url.path} - 状态码: {response.status_code} - 耗时: {process_time:.3f}s")
        
        return response
        
    except Exception as e:
        # 计算处理时间
        process_time = (datetime.now() - start_time).total_seconds()
        
        # 记录请求失败
        logger.error(f"请求失败 - {request.method} {request.url.path} - 错误: {str(e)} - 耗时: {process_time:.3f}s")
        raise

def _get_client_ip(request: Request) -> str:
    """获取客户端IP地址"""
    # 检查X-Forwarded-For头（适用于代理服务器）
    x_forwarded_for = request.headers.get("X-Forwarded-For")
    if x_forwarded_for:
        # X-Forwarded-For可能包含多个IP，取第一个
        return x_forwarded_for.split(",")[0].strip()
    
    # 检查X-Real-IP头（Nginx等使用）
    x_real_ip = request.headers.get("X-Real-IP")
    if x_real_ip:
        return x_real_ip.strip()
    
    # 最后使用直接连接的IP
    return request.client.host if request.client else "unknown"

# 挂载静态文件
app.mount("/static", StaticFiles(directory="frontend/static"), name="static")

# 页面路由
@app.get("/")
async def read_root():
    """
    主页接口
    
    返回游戏主页面，包含版本信息和JavaScript文件版本控制
    """
    try:
        # 读取HTML文件
        with open("frontend/index.html", "r", encoding="utf-8") as f:
            html_content = f.read()
        
        # 获取版本信息
        js_version = get_js_version()
        app_version = get_version()
        
        # 替换JavaScript文件的版本号
        html_content = re.sub(
            r'<script src="/static/js/app\.js\?v=[\d\.]+"></script>',
            f'<script src="/static/js/app.js?v={js_version}"></script>',
            html_content
        )
        
        # 在HTML中添加版本信息（在title标签后添加）
        version_meta = f'''
    <meta name="app-version" content="{app_version}">
    <meta name="js-version" content="{js_version}">'''
        
        html_content = html_content.replace(
            '<title>侦探推理游戏</title>',
            f'<title>侦探推理游戏 v{app_version}</title>{version_meta}'
        )
        
        return HTMLResponse(content=html_content)
        
    except Exception as e:
        logger.error(f"读取首页文件失败: {e}")
        return FileResponse("frontend/index.html")

@app.get("/game_history.html")
async def game_history():
    """游戏历史记录页面"""
    return FileResponse("frontend/game_history.html")

@app.get("/evaluation.html")
async def evaluation():
    """游戏评价页面"""
    return FileResponse("frontend/evaluation.html")

@app.get("/replay.html")
async def replay():
    """游戏回放页面"""
    return FileResponse("frontend/replay.html")

@app.get("/test_stream.html")
async def test_stream():
    """流式响应测试页面"""
    return FileResponse("test_stream.html")

if __name__ == "__main__":
    import uvicorn
    from backend.case_data import load_cases
    
    # 配置变量
    DEFAULT_HOST = "0.0.0.0"
    DEFAULT_PORT = 8000
    
    # 获取配置参数（支持环境变量）
    host = os.getenv("HOST", DEFAULT_HOST)
    port = int(os.getenv("PORT", DEFAULT_PORT))
    
    logger.info("启动侦探推理游戏服务器...")
    logger.info(f"可用案例数量: {len(load_cases())}")
    logger.info(f"服务器地址: http://{host}:{port}")
    
    # 配置uvicorn使用我们的日志配置
    uvicorn.run(
        app, 
        host=host, 
        port=port,
        log_config=None,  # 禁用uvicorn的默认日志配置
        access_log=True   # 启用访问日志
    ) 