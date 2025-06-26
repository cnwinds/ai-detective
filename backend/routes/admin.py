import logging
from typing import Optional
from pathlib import Path

from fastapi import APIRouter, HTTPException, Request, Depends
from fastapi.responses import FileResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from backend.database import get_db, GameSession, GameEvaluation
from backend.admin_auth import admin_auth
from backend.statistics_service import statistics_service

logger = logging.getLogger(__name__)

# 后台管理路由器
admin_router = APIRouter(
    prefix="/api/admin",
    tags=["admin"]
)

# 后台管理页面路由器
admin_pages_router = APIRouter(
    prefix="/admin",
    tags=["admin-pages"]
)

# 后台管理相关数据模型
class AdminLoginRequest(BaseModel):
    password: str

class AdminLoginResponse(BaseModel):
    success: bool
    token: Optional[str] = None
    message: str

class AdminStatsResponse(BaseModel):
    daily_stats: list[dict]
    overall_stats: dict
    user_activity: dict

# 依赖注入：验证管理员权限
def verify_admin_auth(request: Request):
    """验证管理员权限的依赖注入函数"""
    token = request.headers.get("Authorization")
    if token and token.startswith("Bearer "):
        token = token[7:]  # 移除 "Bearer " 前缀
    
    if not token:
        # 尝试从cookie中获取token
        token = request.cookies.get("admin_token")
    
    if not token or not admin_auth.verify_session(token):
        raise HTTPException(status_code=401, detail="需要管理员权限")
    
    return token

# 后台管理API端点
@admin_router.post("/login", response_model=AdminLoginResponse)
async def admin_login(request: AdminLoginRequest):
    """管理员登录"""
    logger.info("管理员登录尝试")
    
    try:
        token = admin_auth.create_session(request.password)
        
        if token:
            logger.info("管理员登录成功")
            return AdminLoginResponse(
                success=True,
                token=token,
                message="登录成功"
            )
        else:
            logger.warning("管理员登录失败：密码错误")
            return AdminLoginResponse(
                success=False,
                message="密码错误"
            )
    except Exception as e:
        logger.error(f"管理员登录异常: {e}")
        return AdminLoginResponse(
            success=False,
            message="登录失败"
        )

@admin_router.post("/logout")
async def admin_logout(token: str = Depends(verify_admin_auth)):
    """管理员登出"""
    admin_auth.revoke_session(token)
    return {"success": True, "message": "已退出登录"}

@admin_router.get("/statistics")
async def get_admin_statistics(
    days: int = 30,
    token: str = Depends(verify_admin_auth),
    db: Session = Depends(get_db)
):
    """获取后台统计数据"""
    logger.info(f"获取后台统计数据 - 天数: {days}")
    
    try:
        # 清理过期会话
        admin_auth.cleanup_expired_sessions()
        
        # 获取统计数据
        daily_stats = statistics_service.get_daily_statistics(db, days)
        overall_stats = statistics_service.get_overall_statistics(db)
        user_activity = statistics_service.get_user_activity_stats(db)
        
        return {
            "daily_stats": daily_stats,
            "overall_stats": overall_stats,
            "user_activity": user_activity
        }
    except Exception as e:
        logger.error(f"获取统计数据失败: {e}")
        raise HTTPException(status_code=500, detail=f"获取统计数据失败: {str(e)}")

@admin_router.get("/sessions")
async def get_admin_sessions(
    limit: int = 50,
    offset: int = 0,
    has_evaluation: Optional[str] = None,  # 过滤是否有评价
    status: Optional[str] = None,  # 新增：游戏状态过滤
    difficulty: Optional[str] = None,  # 新增：案件难度过滤
    category: Optional[str] = None,  # 新增：案件分类过滤
    token: str = Depends(verify_admin_auth),
    db: Session = Depends(get_db)
):
    """获取游戏会话列表（管理员版本，包含更多信息）"""
    logger.info(f"管理员获取游戏会话列表 - limit: {limit}, offset: {offset}, has_evaluation: {has_evaluation}, status: {status}, difficulty: {difficulty}, category: {category}")
    
    try:
        # 构建查询
        query = db.query(GameSession).outerjoin(GameEvaluation)
        
        # 应用评价过滤
        if has_evaluation == "true":
            query = query.filter(GameEvaluation.id.isnot(None))
        elif has_evaluation == "false":
            query = query.filter(GameEvaluation.id.is_(None))
        
        # 应用游戏状态过滤
        if status:
            if status == "completed":
                query = query.filter(GameSession.is_completed == True)
            elif status == "incomplete":
                query = query.filter(GameSession.is_completed == False)
            elif status == "solved":
                query = query.filter(GameSession.is_solved == True)
        
        # 应用案件难度过滤
        if difficulty:
            query = query.filter(GameSession.case_difficulty == difficulty)
        
        # 应用案件分类过滤
        if category:
            query = query.filter(GameSession.case_category == category)
        
        # 获取总数（应用相同的过滤条件）
        total_query = db.query(GameSession).outerjoin(GameEvaluation)
        if has_evaluation == "true":
            total_query = total_query.filter(GameEvaluation.id.isnot(None))
        elif has_evaluation == "false":
            total_query = total_query.filter(GameEvaluation.id.is_(None))
        
        # 应用相同的状态过滤到总数查询
        if status:
            if status == "completed":
                total_query = total_query.filter(GameSession.is_completed == True)
            elif status == "incomplete":
                total_query = total_query.filter(GameSession.is_completed == False)
            elif status == "solved":
                total_query = total_query.filter(GameSession.is_solved == True)
        
        if difficulty:
            total_query = total_query.filter(GameSession.case_difficulty == difficulty)
        
        if category:
            total_query = total_query.filter(GameSession.case_category == category)
        
        total_count = total_query.count()
        
        # 应用分页和排序
        sessions = query.order_by(GameSession.start_time.desc()).offset(offset).limit(limit).all()
        
        # 构建管理员版本的会话数据
        admin_sessions = []
        for session in sessions:
            admin_session = {
                "session_id": session.session_id,
                "player_name": session.player_name,
                "case_title": session.case_title,
                "case_category": session.case_category,
                "case_difficulty": session.case_difficulty,
                "start_time": session.start_time.isoformat() if session.start_time else None,
                "end_time": session.end_time.isoformat() if session.end_time else None,
                "is_completed": session.is_completed,
                "is_solved": session.is_solved,
                "total_rounds": session.total_rounds,
                "hints_used": session.hints_used,
                "client_id": session.client_id,
                "ip_address": session.ip_address,
                "game_version": session.game_version,
                # 添加评价信息
                "has_evaluation": session.evaluation is not None,
                "evaluation": None
            }
            
            # 如果有评价，添加评价详细信息
            if session.evaluation:
                admin_session["evaluation"] = {
                    "rating": session.evaluation.rating,
                    "reason": session.evaluation.reason,
                    "difficulty_feedback": session.evaluation.difficulty_feedback,
                    "most_liked": session.evaluation.most_liked,
                    "suggestions": session.evaluation.suggestions,
                    "would_recommend": session.evaluation.would_recommend,
                    "created_at": session.evaluation.created_at.isoformat() if session.evaluation.created_at else None
                }
            
            admin_sessions.append(admin_session)
        
        return {
            "sessions": admin_sessions,
            "total_count": total_count
        }
    except Exception as e:
        logger.error(f"获取会话列表失败: {e}")
        raise HTTPException(status_code=500, detail=f"获取会话列表失败: {str(e)}")

# 管理员页面路由
@admin_pages_router.get("")
async def admin_page():
    """管理员登录页面"""
    frontend_path = Path(__file__).parent.parent.parent / "frontend" / "admin_login.html"
    return FileResponse(str(frontend_path))

@admin_pages_router.get("/dashboard")
async def admin_dashboard():
    """管理员仪表板页面"""
    frontend_path = Path(__file__).parent.parent.parent / "frontend" / "admin_dashboard.html"
    return FileResponse(str(frontend_path))

@admin_pages_router.get("/history")
async def admin_history():
    """管理员游戏历史页面"""
    frontend_path = Path(__file__).parent.parent.parent / "frontend" / "admin_history.html"
    return FileResponse(str(frontend_path)) 