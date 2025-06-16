import os
from dotenv import load_dotenv
from pathlib import Path

def _load_config_from_template():
    """从模板文件加载默认配置"""
    template_file = Path("env.template")
    defaults = {}
    
    if template_file.exists():
        with open(template_file, 'r', encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    key, value = line.split('=', 1)
                    # 跳过占位符值
                    if not value.startswith('your_') and value != 'your-model-name' and value != 'your-api-service.com':
                        defaults[key.strip()] = value.strip()
    
    return defaults

# 加载环境变量
load_dotenv()

# 加载模板默认值
template_defaults = _load_config_from_template()

class GameConfig:
    """游戏配置类"""
    
    # AI API配置 - 优先从环境变量读取，然后从模板读取
    API_KEY = os.getenv("OPENAI_API_KEY") or os.getenv("API_KEY")
    BASE_URL = os.getenv("OPENAI_BASE_URL") or os.getenv("BASE_URL") or template_defaults.get("OPENAI_BASE_URL", "https://api.openai.com/v1")
    MODEL = os.getenv("OPENAI_MODEL") or os.getenv("MODEL") or template_defaults.get("OPENAI_MODEL", "gpt-3.5-turbo")
    
    # 游戏设置
    GAME_LANGUAGE = os.getenv("LANGUAGE") or template_defaults.get("LANGUAGE", "chinese")
    DEBUG_MODE = (os.getenv("DEBUG_MODE") or template_defaults.get("DEBUG_MODE", "false")).lower() == "true"
    
    # AI参数设置 - 从模板读取，支持环境变量覆盖
    NARRATOR_TEMPERATURE = float(os.getenv("NARRATOR_TEMP") or template_defaults.get("NARRATOR_TEMP", "0.8"))
    CHARACTER_TEMPERATURE = float(os.getenv("CHARACTER_TEMP") or template_defaults.get("CHARACTER_TEMP", "0.9"))
    MAX_CONVERSATION_HISTORY = int(os.getenv("MAX_HISTORY") or template_defaults.get("MAX_HISTORY", "10"))
    
    # 游戏限制设置
    MAX_ROUNDS = int(os.getenv("MAX_ROUNDS") or template_defaults.get("MAX_ROUNDS", "30"))
    MAX_HINTS = int(os.getenv("MAX_HINTS") or template_defaults.get("MAX_HINTS", "3"))
    
    # 服务器配置
    HOST = os.getenv("HOST") or template_defaults.get("HOST", "localhost")
    PORT = int(os.getenv("PORT") or template_defaults.get("PORT", "8000"))
    
    # 数据库配置
    DB_HOST = os.getenv("DB_HOST") or template_defaults.get("DB_HOST", "localhost")
    DB_PORT = int(os.getenv("DB_PORT") or template_defaults.get("DB_PORT", "3306"))
    DB_USER = os.getenv("DB_USER") or template_defaults.get("DB_USER", "root")
    DB_PASSWORD = os.getenv("DB_PASSWORD") or template_defaults.get("DB_PASSWORD", "password")
    DB_NAME = os.getenv("DB_NAME") or template_defaults.get("DB_NAME", "ai_detective")
    
    @classmethod
    def validate_config(cls):
        """验证配置是否完整"""
        if not cls.API_KEY:
            raise ValueError("请设置OPENAI_API_KEY环境变量")
        if not cls.BASE_URL:
            raise ValueError("请设置OPENAI_BASE_URL环境变量")
        if not cls.MODEL:
            raise ValueError("请设置OPENAI_MODEL环境变量")
        return True
    
    @classmethod
    def get_config_info(cls):
        """获取配置信息用于调试"""
        return {
            'api_key_set': bool(cls.API_KEY),
            'base_url': cls.BASE_URL,
            'model': cls.MODEL,
            'language': cls.GAME_LANGUAGE,
            'debug_mode': cls.DEBUG_MODE,
            'narrator_temp': cls.NARRATOR_TEMPERATURE,
            'character_temp': cls.CHARACTER_TEMPERATURE,
            'max_history': cls.MAX_CONVERSATION_HISTORY,
            'max_rounds': cls.MAX_ROUNDS,
            'max_hints': cls.MAX_HINTS,
            'host': cls.HOST,
            'port': cls.PORT,
            'db_host': cls.DB_HOST,
            'db_port': cls.DB_PORT,
            'db_user': cls.DB_USER,
            'db_password_set': bool(cls.DB_PASSWORD),
            'db_name': cls.DB_NAME
        }

def get_api_config():
    """获取API配置"""
    return {
        'api_key': GameConfig.API_KEY,
        'base_url': GameConfig.BASE_URL,
        'model': GameConfig.MODEL
    } 