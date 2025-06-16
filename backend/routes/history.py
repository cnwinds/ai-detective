import logging
from typing import Optional
from datetime import datetime

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.game_recorder import game_recorder

logger = logging.getLogger(__name__)

# 历史记录路由器
history_router = APIRouter(
    prefix="/api/game",
    tags=["history"]
)

# 数据模型
class GameEvaluationRequest(BaseModel):
    session_id: str
    rating: int  # 1-5分
    reason: str
    difficulty_feedback: Optional[str] = None  # too_easy, just_right, too_hard
    most_liked: Optional[str] = None
    suggestions: Optional[str] = None
    would_recommend: Optional[bool] = None

class GameEvaluationResponse(BaseModel):
    evaluation_id: int
    session_id: str
    rating: int
    reason: str
    created_at: str

class GameReplayResponse(BaseModel):
    session_info: dict
    conversations: list[dict]
    evaluation: Optional[dict] = None

class SessionListResponse(BaseModel):
    sessions: list[dict]
    total_count: int

# 评价记录相关API
@history_router.post("/evaluation", response_model=GameEvaluationResponse)
async def submit_game_evaluation(request: GameEvaluationRequest, db: Session = Depends(get_db)):
    """
    提交游戏评价API
    
    玩家提交对游戏体验的评价和反馈
    """
    from backend.routes.game import get_game_sessions
    
    logger.info(f"收到游戏评价 - 会话ID: {request.session_id}, 评分: {request.rating}")
    
    try:
        # 结束游戏会话（如果还没结束）
        game_sessions = get_game_sessions()
        if request.session_id in game_sessions:
            try:
                game_recorder.end_game_session(db, request.session_id, is_solved=False)
            except Exception as e:
                logger.warning(f"结束游戏会话失败: {e}")
        
        # 保存评价
        evaluation_id = game_recorder.save_game_evaluation(
            db=db,
            session_id=request.session_id,
            rating=request.rating,
            reason=request.reason,
            difficulty_feedback=request.difficulty_feedback,
            most_liked=request.most_liked,
            suggestions=request.suggestions,
            would_recommend=request.would_recommend
        )
        
        logger.info(f"游戏评价保存成功 - 会话ID: {request.session_id}, 评价ID: {evaluation_id}")
        
        return GameEvaluationResponse(
            evaluation_id=evaluation_id,
            session_id=request.session_id,
            rating=request.rating,
            reason=request.reason,
            created_at=datetime.now().isoformat()
        )
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"保存游戏评价失败: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"保存评价失败: {str(e)}")

@history_router.get("/{session_id}/replay", response_model=GameReplayResponse)
async def get_game_replay(session_id: str, db: Session = Depends(get_db)):
    """
    获取游戏回放API
    
    获取指定会话的完整游戏回放数据
    """
    logger.info(f"获取游戏回放 - 会话ID: {session_id}")
    
    try:
        replay_data = game_recorder.get_game_replay(db, session_id)
        return GameReplayResponse(**replay_data)
        
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"获取游戏回放失败: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"获取回放失败: {str(e)}")

@history_router.get("/sessions", response_model=SessionListResponse)
async def get_game_sessions(limit: int = 50, offset: int = 0, db: Session = Depends(get_db)):
    """
    获取游戏会话列表API
    
    获取游戏会话的分页列表
    """
    logger.info(f"获取游戏会话列表 - 限制: {limit}, 偏移: {offset}")
    
    try:
        sessions = game_recorder.get_session_list(db, limit, offset)
        return SessionListResponse(
            sessions=sessions,
            total_count=len(sessions)
        )
        
    except Exception as e:
        logger.error(f"获取会话列表失败: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"获取会话列表失败: {str(e)}")

@history_router.get("/statistics")
async def get_evaluation_statistics(db: Session = Depends(get_db)):
    """获取评价统计数据"""
    logger.info("获取评价统计数据")
    
    try:
        stats = game_recorder.get_evaluation_statistics(db)
        return stats
        
    except Exception as e:
        logger.error(f"获取统计数据失败: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"获取统计数据失败: {str(e)}") 