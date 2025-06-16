"""
游戏记录服务
负责记录游戏对话、评价和回放功能
"""
from sqlalchemy.orm import Session
from .database import GameSession, Conversation, GameEvaluation, get_db
from datetime import datetime
from .database import get_app_time
from typing import List, Dict, Optional, Any
import json
import uuid

class GameRecorder:
    """游戏记录器"""
    
    def __init__(self):
        self.current_session_id = None
        self.current_round = 0
    
    def start_game_session(self, db: Session, case_title: str, case_category: str, 
                          case_difficulty: str, player_name: Optional[str] = None, 
                          session_id: Optional[str] = None, client_id: Optional[str] = None,
                          ip_address: Optional[str] = None, game_version: Optional[str] = None) -> str:
        """开始游戏会话"""
        if session_id is None:
            session_id = str(uuid.uuid4())
        
        game_session = GameSession(
            session_id=session_id,
            player_name=player_name,
            case_title=case_title,
            case_category=case_category,
            case_difficulty=case_difficulty,
            start_time=get_app_time(),
            client_id=client_id,
            ip_address=ip_address,
            game_version=game_version
        )
        
        db.add(game_session)
        db.commit()
        
        self.current_session_id = session_id
        self.current_round = 0
        
        return session_id
    
    def end_game_session(self, db: Session, session_id: str, is_solved: bool = False):
        """结束游戏会话"""
        session = db.query(GameSession).filter(GameSession.session_id == session_id).first()
        if session:
            session.end_time = get_app_time()
            session.is_completed = True
            session.is_solved = is_solved
            # total_rounds 已经在 record_conversation 中实时更新，这里不需要再设置
            db.commit()
    
    def record_conversation(self, db: Session, session_id: str, speaker_type: str,
                          speaker_name: Optional[str], message_type: str, content: str,
                          extra_data: Optional[Dict] = None) -> int:
        """记录对话"""
        # 计算当前轮数：统计该会话中已有的玩家提问数量
        current_round = db.query(Conversation).filter(
            Conversation.session_id == session_id,
            Conversation.speaker_type == "player",
            Conversation.message_type == "question"
        ).count()
        
        # 如果当前记录是玩家提问，轮数+1
        if speaker_type == "player" and message_type == "question":
            current_round += 1
        
        conversation = Conversation(
            session_id=session_id,
            round_number=current_round,
            timestamp=get_app_time(),
            speaker_type=speaker_type,
            speaker_name=speaker_name,
            message_type=message_type,
            content=content,
            extra_data=json.dumps(extra_data) if extra_data else None
        )
        
        db.add(conversation)
        db.commit()
        
        # 如果是玩家提问，更新会话的总轮数
        if speaker_type == "player" and message_type == "question":
            session = db.query(GameSession).filter(GameSession.session_id == session_id).first()
            if session:
                session.total_rounds = current_round
                db.commit()
        
        return conversation.id
    
    def update_session_stats(self, db: Session, session_id: str, hints_used: int = 0):
        """更新会话统计信息"""
        session = db.query(GameSession).filter(GameSession.session_id == session_id).first()
        if session:
            session.hints_used = hints_used
            db.commit()
    
    def save_game_evaluation(self, db: Session, session_id: str, rating: int, reason: str,
                           difficulty_feedback: Optional[str] = None,
                           most_liked: Optional[str] = None,
                           suggestions: Optional[str] = None,
                           would_recommend: Optional[bool] = None) -> int:
        """保存游戏评价"""
        # 检查评分范围
        if not 1 <= rating <= 5:
            raise ValueError("评分必须在1-5分之间")
        
        # 检查是否已有评价
        existing_evaluation = db.query(GameEvaluation).filter(
            GameEvaluation.session_id == session_id
        ).first()
        
        if existing_evaluation:
            # 更新现有评价
            existing_evaluation.rating = rating
            existing_evaluation.reason = reason
            existing_evaluation.difficulty_feedback = difficulty_feedback
            existing_evaluation.most_liked = most_liked
            existing_evaluation.suggestions = suggestions
            existing_evaluation.would_recommend = would_recommend
            existing_evaluation.created_at = get_app_time()
            db.commit()
            return existing_evaluation.id
        else:
            # 创建新评价
            evaluation = GameEvaluation(
                session_id=session_id,
                rating=rating,
                reason=reason,
                difficulty_feedback=difficulty_feedback,
                most_liked=most_liked,
                suggestions=suggestions,
                would_recommend=would_recommend
            )
            
            db.add(evaluation)
            db.commit()
            
            return evaluation.id
    
    def get_game_replay(self, db: Session, session_id: str) -> Dict[str, Any]:
        """获取游戏回放数据"""
        # 获取会话信息
        session = db.query(GameSession).filter(GameSession.session_id == session_id).first()
        if not session:
            raise ValueError(f"未找到会话: {session_id}")
        
        # 获取对话记录
        conversations = db.query(Conversation).filter(
            Conversation.session_id == session_id
        ).order_by(Conversation.timestamp).all()
        
        # 获取评价信息
        evaluation = db.query(GameEvaluation).filter(
            GameEvaluation.session_id == session_id
        ).first()
        
        # 构建回放数据
        replay_data = {
            "session_info": {
                "session_id": session.session_id,
                "player_name": session.player_name,
                "case_title": session.case_title,
                "case_category": session.case_category,
                "case_difficulty": session.case_difficulty,
                "start_time": session.start_time.isoformat(),
                "end_time": session.end_time.isoformat() if session.end_time else None,
                "is_completed": session.is_completed,
                "is_solved": session.is_solved,
                "total_rounds": session.total_rounds,
                "hints_used": session.hints_used,
                "client_id": session.client_id,
                "ip_address": session.ip_address,
                "game_version": session.game_version
            },
            "conversations": [
                {
                    "id": conv.id,
                    "round_number": conv.round_number,
                    "timestamp": conv.timestamp.isoformat(),
                    "speaker_type": conv.speaker_type,
                    "speaker_name": conv.speaker_name,
                    "message_type": conv.message_type,
                    "content": conv.content,
                    "extra_data": json.loads(conv.extra_data) if conv.extra_data else None
                }
                for conv in conversations
            ],
            "evaluation": {
                "rating": evaluation.rating,
                "reason": evaluation.reason,
                "difficulty_feedback": evaluation.difficulty_feedback,
                "most_liked": evaluation.most_liked,
                "suggestions": evaluation.suggestions,
                "would_recommend": evaluation.would_recommend,
                "created_at": evaluation.created_at.isoformat()
            } if evaluation else None
        }
        
        return replay_data
    
    def get_session_list(self, db: Session, limit: int = 50, offset: int = 0) -> List[Dict]:
        """获取会话列表"""
        sessions = db.query(GameSession).order_by(
            GameSession.start_time.desc()
        ).offset(offset).limit(limit).all()
        
        session_list = []
        for session in sessions:
            # 获取评价信息
            evaluation = db.query(GameEvaluation).filter(
                GameEvaluation.session_id == session.session_id
            ).first()
            
            session_data = {
                "session_id": session.session_id,
                "player_name": session.player_name,
                "case_title": session.case_title,
                "case_category": session.case_category,
                "case_difficulty": session.case_difficulty,
                "start_time": session.start_time.isoformat(),
                "end_time": session.end_time.isoformat() if session.end_time else None,
                "is_completed": session.is_completed,
                "is_solved": session.is_solved,
                "total_rounds": session.total_rounds or 0,  # 使用数据库中的轮数，如果为None则显示0
                "hints_used": session.hints_used,
                "has_evaluation": evaluation is not None,
                "rating": evaluation.rating if evaluation else None
            }
            session_list.append(session_data)
        
        return session_list
    
    def get_evaluation_statistics(self, db: Session) -> Dict[str, Any]:
        """获取评价统计数据"""
        evaluations = db.query(GameEvaluation).all()
        
        if not evaluations:
            return {"total_evaluations": 0}
        
        ratings = [eval.rating for eval in evaluations]
        difficulty_feedback = [eval.difficulty_feedback for eval in evaluations if eval.difficulty_feedback]
        recommendations = [eval.would_recommend for eval in evaluations if eval.would_recommend is not None]
        
        stats = {
            "total_evaluations": len(evaluations),
            "average_rating": sum(ratings) / len(ratings),
            "rating_distribution": {
                "5_stars": ratings.count(5),
                "4_stars": ratings.count(4),
                "3_stars": ratings.count(3),
                "2_stars": ratings.count(2),
                "1_star": ratings.count(1)
            },
            "difficulty_feedback": {
                "too_easy": difficulty_feedback.count("too_easy"),
                "just_right": difficulty_feedback.count("just_right"),
                "too_hard": difficulty_feedback.count("too_hard")
            },
            "recommendation_rate": sum(recommendations) / len(recommendations) * 100 if recommendations else 0
        }
        
        return stats

# 创建全局记录器实例
game_recorder = GameRecorder() 