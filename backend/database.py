"""
数据库连接和模型定义
"""
from sqlalchemy import create_engine, Column, Integer, String, Text, DateTime, Float, Boolean, ForeignKey, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from datetime import datetime, timezone, timedelta
import os
import time
import logging
import pytz
from dotenv import load_dotenv

load_dotenv()
logger = logging.getLogger(__name__)

# 从环境变量获取时区设置，默认为Asia/Shanghai
TIMEZONE_NAME = os.getenv('TIMEZONE', 'Asia/Shanghai')
try:
    APP_TIMEZONE = pytz.timezone(TIMEZONE_NAME)
except pytz.exceptions.UnknownTimeZoneError:
    logger.warning(f"未知时区 '{TIMEZONE_NAME}'，使用默认时区 'Asia/Shanghai'")
    APP_TIMEZONE = pytz.timezone('Asia/Shanghai')

def get_app_time():
    """获取应用配置的时区时间"""
    return datetime.now(APP_TIMEZONE)

# 数据库连接配置
DATABASE_URL = (
    f"mysql+mysqlconnector://"
    f"{os.getenv('DB_USER', 'gameuser')}:"
    f"{os.getenv('DB_PASSWORD', 'password')}@"
    f"{os.getenv('DB_HOST', 'localhost')}:"
    f"{os.getenv('DB_PORT', '3306')}/"
    f"{os.getenv('DB_NAME', 'ai_detective')}"
    f"?charset=utf8mb4"
    f"&connect_timeout=60"
    f"&autocommit=false"
    f"&auth_plugin=mysql_native_password"
)

# 创建数据库引擎（优化配置）
engine = create_engine(
    DATABASE_URL, 
    echo=False,
    pool_size=10,           # 连接池大小
    max_overflow=20,        # 超出连接池大小的最大连接数
    pool_timeout=30,        # 获取连接的超时时间
    pool_recycle=3600,      # 连接回收时间（1小时）
    pool_pre_ping=True,     # 连接前检查连接状态
    connect_args={
        "connect_timeout": 60,
        "autocommit": False,
        "charset": "utf8mb4",
        "auth_plugin": "mysql_native_password"
    }
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

class GameSession(Base):
    """游戏会话表"""
    __tablename__ = "game_sessions"
    
    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String(255), unique=True, index=True)  # 会话ID
    player_name = Column(String(100), nullable=True)  # 玩家姓名
    case_title = Column(String(255), nullable=False)  # 案件标题
    case_category = Column(String(50), nullable=False)  # 案件分类
    case_difficulty = Column(String(20), nullable=False)  # 案件难度
    start_time = Column(DateTime, default=get_app_time)  # 开始时间
    end_time = Column(DateTime, nullable=True)  # 结束时间
    is_completed = Column(Boolean, default=False)  # 是否完成
    is_solved = Column(Boolean, default=False)  # 是否解决
    total_rounds = Column(Integer, default=0)  # 总轮数
    hints_used = Column(Integer, default=0)  # 使用的提示数
    client_id = Column(String(255), nullable=True)  # 客户端唯一标识
    ip_address = Column(String(45), nullable=True)  # IP地址（支持IPv6）
    game_version = Column(String(20), nullable=True)  # 游戏版本号
    
    # 关联关系
    conversations = relationship("Conversation", back_populates="session")
    evaluation = relationship("GameEvaluation", back_populates="session", uselist=False)

class Conversation(Base):
    """对话记录表"""
    __tablename__ = "conversations"
    
    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String(255), ForeignKey("game_sessions.session_id"))
    round_number = Column(Integer, nullable=False)  # 轮次
    timestamp = Column(DateTime, default=get_app_time)  # 时间戳
    speaker_type = Column(String(20), nullable=False)  # 发言者类型：player/character/narrator/system
    speaker_name = Column(String(100), nullable=True)  # 发言者姓名（角色名或玩家名）
    message_type = Column(String(50), nullable=False)  # 消息类型：question/answer/action/hint/accusation等
    content = Column(Text, nullable=False)  # 对话内容
    extra_data = Column(Text, nullable=True)  # 额外信息（JSON格式）
    
    # 关联关系
    session = relationship("GameSession", back_populates="conversations")

class GameEvaluation(Base):
    """游戏评价表"""
    __tablename__ = "game_evaluations"
    
    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String(255), ForeignKey("game_sessions.session_id"), unique=True)
    rating = Column(Integer, nullable=False)  # 评分（1-5分）
    reason = Column(Text, nullable=False)  # 评价原因
    difficulty_feedback = Column(String(50), nullable=True)  # 难度反馈：too_easy/just_right/too_hard
    most_liked = Column(Text, nullable=True)  # 最喜欢的方面
    suggestions = Column(Text, nullable=True)  # 改进建议
    would_recommend = Column(Boolean, nullable=True)  # 是否推荐
    created_at = Column(DateTime, default=get_app_time)  # 评价时间
    
    # 关联关系
    session = relationship("GameSession", back_populates="evaluation")

def create_tables():
    """创建数据库表"""
    Base.metadata.create_all(bind=engine)

def get_db():
    """获取数据库会话"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def test_connection():
    """测试数据库连接"""
    max_retries = 5
    retry_delay = 2
    
    for attempt in range(max_retries):
        try:
            logger.info(f"尝试连接数据库... (第{attempt + 1}次)")
            with engine.connect() as connection:
                result = connection.execute(text("SELECT 1 as test"))
                row = result.fetchone()
                logger.info("✅ 数据库连接测试成功")
                return True
        except Exception as e:
            logger.warning(f"数据库连接失败 (第{attempt + 1}次): {e}")
            if attempt < max_retries - 1:
                logger.info(f"等待 {retry_delay} 秒后重试...")
                time.sleep(retry_delay)
                retry_delay *= 2  # 指数退避
            else:
                logger.error("❌ 数据库连接测试失败，已达到最大重试次数")
                return False

# 数据库初始化
def init_database():
    """初始化数据库"""
    try:
        # 先测试连接
        if not test_connection():
            return False
            
        # 创建表
        create_tables()
        logger.info("✅ 数据库表创建成功")
        return True
    except Exception as e:
        logger.error(f"❌ 数据库初始化失败: {e}")
        return False 