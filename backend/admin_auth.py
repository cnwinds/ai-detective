"""
后台管理认证模块
"""
import hashlib
import secrets
import os
from datetime import datetime, timedelta
from typing import Optional

class AdminAuth:
    """后台管理认证类"""
    
    def __init__(self):
        # 从环境变量获取管理员密码，默认为模板中的占位符
        self.admin_password = os.getenv("ADMIN_PASSWORD", "your_secure_password_here")
        # 存储会话token
        self.active_sessions = {}
        # token过期时间（小时）
        self.session_expire_hours = 24
    
    def verify_password(self, password: str) -> bool:
        """验证密码"""
        return password == self.admin_password
    
    def create_session(self, password: str) -> Optional[str]:
        """创建管理会话"""
        if not self.verify_password(password):
            return None
        
        # 生成安全的随机token
        token = secrets.token_urlsafe(32)
        expire_time = datetime.now() + timedelta(hours=self.session_expire_hours)
        
        self.active_sessions[token] = {
            "created_at": datetime.now(),
            "expires_at": expire_time,
            "last_activity": datetime.now()
        }
        
        return token
    
    def verify_session(self, token: str) -> bool:
        """验证会话token"""
        if not token or token not in self.active_sessions:
            return False
        
        session = self.active_sessions[token]
        now = datetime.now()
        
        # 检查是否过期
        if now > session["expires_at"]:
            del self.active_sessions[token]
            return False
        
        # 更新最后活动时间
        session["last_activity"] = now
        return True
    
    def cleanup_expired_sessions(self):
        """清理过期的会话"""
        now = datetime.now()
        expired_tokens = []
        
        for token, session in self.active_sessions.items():
            if now > session["expires_at"]:
                expired_tokens.append(token)
        
        for token in expired_tokens:
            del self.active_sessions[token]
    
    def revoke_session(self, token: str):
        """撤销会话"""
        if token in self.active_sessions:
            del self.active_sessions[token]
    
    def get_session_info(self, token: str) -> Optional[dict]:
        """获取会话信息"""
        if token in self.active_sessions:
            return self.active_sessions[token]
        return None

# 创建全局认证实例
admin_auth = AdminAuth() 