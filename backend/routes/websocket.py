import json
import logging
from typing import Dict

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

logger = logging.getLogger(__name__)

# WebSocket路由器 - 不使用前缀，因为WebSocket通常在根路径下
ws_router = APIRouter(tags=["websocket"])

# 从游戏路由模块导入必要的组件
from backend.routes.game import get_game_sessions, get_connection_manager

@ws_router.websocket("/ws/{session_id}")
async def websocket_endpoint(websocket: WebSocket, session_id: str):
    """
    WebSocket连接端点
    
    建立与客户端的实时双向通信连接
    """
    logger.info(f"WebSocket连接建立 - 会话ID: {session_id}")
    
    # 获取连接管理器和游戏会话
    manager = get_connection_manager()
    game_sessions = get_game_sessions()
    
    await manager.connect(websocket, session_id)
    try:
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)
            logger.debug(f"收到WebSocket消息 - 会话ID: {session_id}, 类型: {message.get('type', 'unknown')}")
            
            # 处理不同类型的WebSocket消息
            if message["type"] == "ping":
                await manager.send_message(session_id, {"type": "pong"})
            elif message["type"] == "get_suggested_questions":
                if session_id in game_sessions:
                    game = game_sessions[session_id]
                    character_name = message.get("character_name")
                    character = None
                    for char in game.current_case.characters:
                        if char.name == character_name:
                            character = char
                            break
                    
                    if character:
                        try:
                            questions = await game._generate_suggested_questions(character)
                            await manager.send_message(session_id, {
                                "type": "suggested_questions",
                                "character_name": character_name,
                                "questions": questions
                            })
                        except Exception as e:
                            await manager.send_message(session_id, {
                                "type": "error",
                                "message": f"生成参考问题时出错: {str(e)}"
                            })
            
    except WebSocketDisconnect:
        logger.info(f"WebSocket连接断开 - 会话ID: {session_id}")
        manager.disconnect(session_id) 