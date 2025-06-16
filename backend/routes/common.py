import logging
from datetime import datetime

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
import json
import asyncio

from backend.version import get_version, get_version_info
from backend.case_data import load_cases
from backend.database import init_database, APP_TIMEZONE, TIMEZONE_NAME

logger = logging.getLogger(__name__)

# 通用接口路由器
common_router = APIRouter(
    prefix="/api",
    tags=["common"]
)

@common_router.get("/health")
async def health_check():
    """
    系统健康检查API
    
    检查系统运行状态和基本信息
    """
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "version": get_version(),
        "cases_count": len(load_cases())
    }

@common_router.get("/version")
async def get_version_api():
    """
    获取版本信息API
    
    返回应用的详细版本信息
    """
    return get_version_info()

@common_router.get("/config")
async def get_app_config():
    """
    获取应用配置API
    
    返回应用的配置信息，包括时区设置
    """
    return {
        "timezone": TIMEZONE_NAME,
        "timezone_offset": APP_TIMEZONE.utcoffset(datetime.now()).total_seconds() / 3600,
        "version": get_version()
    }

@common_router.post("/database/init")
async def initialize_database():
    """初始化数据库（调试用）"""
    logger.info("初始化数据库")
    
    try:
        success = init_database()
        if success:
            return {"message": "数据库初始化成功"}
        else:
            raise HTTPException(status_code=500, detail="数据库初始化失败")
            
    except Exception as e:
        logger.error(f"数据库初始化失败: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"数据库初始化失败: {str(e)}")

@common_router.post("/test/stream")
async def test_stream_api():
    """
    流式响应测试API
    
    开发调试用接口，测试Server-Sent Events流式响应功能
    不依赖AI服务，使用模拟数据进行测试
    """
    async def _generate_test_response():
        test_message = "这是一个测试流式输出的消息。我会逐字显示这段文字，让您看到流式效果。每个字符都会单独发送，模拟真实的AI回答过程。"
        
        # 发送开始标记
        yield f"data: {json.dumps({'type': 'start'})}\n\n"
        
        # 逐字发送
        for char in test_message:
            yield f"data: {json.dumps({'type': 'chunk', 'content': char})}\n\n"
            await asyncio.sleep(0.1)  # 100ms延迟
        
        # 发送完成标记
        yield f"data: {json.dumps({'type': 'complete'})}\n\n"
    
    return StreamingResponse(
        _generate_test_response(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "*"
        }
    ) 