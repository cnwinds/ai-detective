"""
游戏统计数据服务
"""
from sqlalchemy.orm import Session
from sqlalchemy import func, text, distinct
from datetime import datetime, timedelta
from typing import List, Dict, Any
from .database import GameSession

class StatisticsService:
    """统计数据服务类"""
    
    def __init__(self):
        pass
    
    def get_daily_statistics(self, db: Session, days: int = 30) -> List[Dict[str, Any]]:
        """获取每日统计数据"""
        # 计算起始日期
        end_date = datetime.now()
        start_date = end_date - timedelta(days=days)
        
        # 查询每日游戏局数
        daily_games_query = """
        SELECT 
            DATE(start_time) as game_date,
            COUNT(*) as total_games,
            COUNT(DISTINCT client_id) as unique_users,
            COUNT(DISTINCT ip_address) as unique_ips,
            COUNT(CASE WHEN is_completed = 1 THEN 1 END) as completed_games,
            COUNT(CASE WHEN is_solved = 1 THEN 1 END) as solved_games
        FROM game_sessions 
        WHERE start_time >= :start_date 
        AND start_time <= :end_date
        GROUP BY DATE(start_time)
        ORDER BY game_date DESC
        """
        
        result = db.execute(text(daily_games_query), {
            "start_date": start_date,
            "end_date": end_date
        }).fetchall()
        
        # 转换为字典格式
        daily_stats = []
        for row in result:
            daily_stats.append({
                "date": row.game_date.isoformat() if row.game_date else None,
                "total_games": row.total_games or 0,
                "unique_users": row.unique_users or 0,
                "unique_ips": row.unique_ips or 0,
                "completed_games": row.completed_games or 0,
                "solved_games": row.solved_games or 0,
                "completion_rate": round((row.completed_games / row.total_games * 100) if row.total_games > 0 else 0, 1),
                "success_rate": round((row.solved_games / row.completed_games * 100) if row.completed_games > 0 else 0, 1)
            })
        
        # 填充缺失的日期（显示为0）
        all_dates = []
        current_date = start_date.date()
        while current_date <= end_date.date():
            all_dates.append(current_date)
            current_date += timedelta(days=1)
        
        # 创建完整的日期统计
        stats_dict = {stat["date"]: stat for stat in daily_stats}
        complete_stats = []
        
        for date in reversed(all_dates):  # 最新日期在前
            date_str = date.isoformat()
            if date_str in stats_dict:
                complete_stats.append(stats_dict[date_str])
            else:
                complete_stats.append({
                    "date": date_str,
                    "total_games": 0,
                    "unique_users": 0,
                    "unique_ips": 0,
                    "completed_games": 0,
                    "solved_games": 0,
                    "completion_rate": 0,
                    "success_rate": 0
                })
        
        return complete_stats
    
    def get_overall_statistics(self, db: Session) -> Dict[str, Any]:
        """获取总体统计数据"""
        # 总体数据查询
        total_stats_query = """
        SELECT 
            COUNT(*) as total_games,
            COUNT(DISTINCT client_id) as total_unique_users,
            COUNT(DISTINCT ip_address) as total_unique_ips,
            COUNT(CASE WHEN is_completed = 1 THEN 1 END) as total_completed,
            COUNT(CASE WHEN is_solved = 1 THEN 1 END) as total_solved,
            AVG(total_rounds) as avg_rounds,
            AVG(hints_used) as avg_hints,
            MIN(start_time) as first_game,
            MAX(start_time) as latest_game
        FROM game_sessions
        WHERE client_id IS NOT NULL OR ip_address IS NOT NULL
        """
        
        result = db.execute(text(total_stats_query)).fetchone()
        
        # 最近7天的数据
        week_ago = datetime.now() - timedelta(days=7)
        recent_stats_query = """
        SELECT 
            COUNT(*) as recent_games,
            COUNT(DISTINCT client_id) as recent_users,
            COUNT(DISTINCT ip_address) as recent_ips
        FROM game_sessions 
        WHERE start_time >= :week_ago
        """
        
        recent_result = db.execute(text(recent_stats_query), {"week_ago": week_ago}).fetchone()
        
        # 案件难度统计
        difficulty_stats_query = """
        SELECT 
            case_difficulty,
            COUNT(*) as games_count,
            COUNT(CASE WHEN is_solved = 1 THEN 1 END) as solved_count
        FROM game_sessions 
        GROUP BY case_difficulty
        ORDER BY games_count DESC
        """
        
        difficulty_result = db.execute(text(difficulty_stats_query)).fetchall()
        difficulty_stats = []
        for row in difficulty_result:
            difficulty_stats.append({
                "difficulty": row.case_difficulty,
                "games_count": row.games_count,
                "solved_count": row.solved_count,
                "success_rate": round((row.solved_count / row.games_count * 100) if row.games_count > 0 else 0, 1)
            })
        
        # 案件分类统计
        category_stats_query = """
        SELECT 
            case_category,
            COUNT(*) as games_count,
            COUNT(CASE WHEN is_solved = 1 THEN 1 END) as solved_count
        FROM game_sessions 
        GROUP BY case_category
        ORDER BY games_count DESC
        """
        
        category_result = db.execute(text(category_stats_query)).fetchall()
        category_stats = []
        for row in category_result:
            category_stats.append({
                "category": row.case_category,
                "games_count": row.games_count,
                "solved_count": row.solved_count,
                "success_rate": round((row.solved_count / row.games_count * 100) if row.games_count > 0 else 0, 1)
            })
        
        return {
            "total_games": result.total_games or 0,
            "total_unique_users": result.total_unique_users or 0,
            "total_unique_ips": result.total_unique_ips or 0,
            "total_completed": result.total_completed or 0,
            "total_solved": result.total_solved or 0,
            "overall_completion_rate": round((result.total_completed / result.total_games * 100) if result.total_games > 0 else 0, 1),
            "overall_success_rate": round((result.total_solved / result.total_completed * 100) if result.total_completed > 0 else 0, 1),
            "avg_rounds": round(result.avg_rounds, 1) if result.avg_rounds else 0,
            "avg_hints": round(result.avg_hints, 1) if result.avg_hints else 0,
            "first_game": result.first_game.isoformat() if result.first_game else None,
            "latest_game": result.latest_game.isoformat() if result.latest_game else None,
            "recent_7days": {
                "games": recent_result.recent_games or 0,
                "users": recent_result.recent_users or 0,
                "ips": recent_result.recent_ips or 0
            },
            "difficulty_breakdown": difficulty_stats,
            "category_breakdown": category_stats
        }
    
    def get_user_activity_stats(self, db: Session) -> Dict[str, Any]:
        """获取用户活动统计"""
        # 活跃用户统计（按客户端ID）
        user_activity_query = """
        SELECT 
            client_id,
            COUNT(*) as game_count,
            MIN(start_time) as first_game,
            MAX(start_time) as last_game,
            COUNT(CASE WHEN is_completed = 1 THEN 1 END) as completed_count,
            COUNT(CASE WHEN is_solved = 1 THEN 1 END) as solved_count
        FROM game_sessions 
        WHERE client_id IS NOT NULL
        GROUP BY client_id
        HAVING COUNT(*) > 1
        ORDER BY game_count DESC, last_game DESC
        LIMIT 20
        """
        
        result = db.execute(text(user_activity_query)).fetchall()
        
        active_users = []
        for row in result:
            active_users.append({
                "client_id": row.client_id[:20] + "..." if len(row.client_id) > 20 else row.client_id,
                "game_count": row.game_count,
                "first_game": row.first_game.isoformat() if row.first_game else None,
                "last_game": row.last_game.isoformat() if row.last_game else None,
                "completed_count": row.completed_count,
                "solved_count": row.solved_count,
                "success_rate": round((row.solved_count / row.completed_count * 100) if row.completed_count > 0 else 0, 1)
            })
        
        # IP地址统计
        ip_stats_query = """
        SELECT 
            ip_address,
            COUNT(*) as game_count,
            COUNT(DISTINCT client_id) as unique_users,
            MIN(start_time) as first_access,
            MAX(start_time) as last_access
        FROM game_sessions 
        WHERE ip_address IS NOT NULL
        GROUP BY ip_address
        ORDER BY game_count DESC
        LIMIT 20
        """
        
        ip_result = db.execute(text(ip_stats_query)).fetchall()
        
        ip_stats = []
        for row in ip_result:
            ip_stats.append({
                "ip_address": row.ip_address,
                "game_count": row.game_count,
                "unique_users": row.unique_users,
                "first_access": row.first_access.isoformat() if row.first_access else None,
                "last_access": row.last_access.isoformat() if row.last_access else None
            })
        
        return {
            "active_users": active_users,
            "ip_statistics": ip_stats
        }

# 创建全局统计服务实例
statistics_service = StatisticsService() 