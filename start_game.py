#!/usr/bin/env python3
"""
侦探推理游戏Web服务器启动脚本
"""

import asyncio
import sys
import os
import logging
from pathlib import Path

# 添加当前目录到Python路径
current_dir = Path(__file__).parent
sys.path.insert(0, str(current_dir))

# 配置统一的日志系统
class CustomFormatter(logging.Formatter):
    def format(self, record):
        # 统一的时间格式
        record.asctime = self.formatTime(record, '%Y-%m-%d %H:%M:%S')
        
        # 简化模块名显示
        if record.name.startswith('uvicorn'):
            record.name = 'server'
        elif record.name == '__main__':
            record.name = 'launcher'
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

# 获取日志记录器
logger = logging.getLogger(__name__)

# 配置变量
DEFAULT_HOST = "0.0.0.0"
DEFAULT_PORT = 8000

def check_environment():
    """检查运行环境"""
    logger.info("🕵️ 侦探推理游戏 Web服务器")
    logger.info("=" * 50)
    
    # 检查Python版本
    if sys.version_info < (3, 8):
        logger.error("❌ 需要Python 3.8或更高版本")
        return False
    
    logger.info(f"✅ Python版本: {sys.version}")
    
    # 检查必要的模块
    required_modules = ['fastapi', 'uvicorn', 'websockets', 'openai', 'rich', 'pydantic', 'dotenv']
    missing_modules = []
    
    for module in required_modules:
        try:
            __import__(module.replace('-', '_'))
            logger.info(f"✅ {module}: 已安装")
        except ImportError:
            missing_modules.append(module)
            logger.error(f"❌ {module}: 未安装")
    
    if missing_modules:
        logger.error(f"请安装缺失的模块: pip install {' '.join(missing_modules)}")
        return False
    
    # 检查配置文件
    env_file = current_dir / '.env'
    template_file = current_dir / 'env.template'
    
    if not env_file.exists() and not template_file.exists():
        logger.error("❌ 未找到配置文件")
        logger.error("请创建.env文件或确保env.template存在")
        return False
    
    if not env_file.exists():
        logger.warning("⚠️  未找到.env文件，将使用env.template的默认配置")
        logger.warning("建议复制env.template为.env并配置你的API密钥")
    else:
        logger.info("✅ 配置文件: 已找到")
    
    # 检查前端文件
    frontend_dir = current_dir / 'frontend'
    if not frontend_dir.exists():
        logger.error("❌ 未找到前端文件目录")
        return False
    
    index_file = frontend_dir / 'index.html'
    if not index_file.exists():
        logger.error("❌ 未找到前端主页文件")
        return False
    
    logger.info("✅ 前端文件: 已找到")
    
    # 检查AI服务配置
    try:
        from backend.config import GameConfig
        GameConfig.validate_config()
        config_info = GameConfig.get_config_info()
        
        if not config_info['api_key_set']:
            logger.error("❌ API密钥未配置")
            logger.error("请在.env文件中设置OPENAI_API_KEY")
            return False
            
        logger.info("✅ API配置: 已配置")
        if GameConfig.DEBUG_MODE:
            logger.info(f"🔧 调试信息: {config_info}")
            
    except Exception as e:
        logger.error(f"❌ 配置检查失败: {e}")
        return False
    
    logger.info("🚀 启动Web服务器...")
    return True

def main():
    """主函数"""
    if not check_environment():
        logger.info("按回车键退出...")
        input()
        return
    
    try:
        # 导入并启动Web服务器
        import uvicorn
        from backend.app import app
        
        # 获取配置参数（从配置类读取）
        from backend.config import GameConfig
        host = GameConfig.HOST
        port = GameConfig.PORT
        
        # 检查端口是否被占用
        import socket
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        result = sock.connect_ex((host, port))
        sock.close()
        
        if result == 0:
            logger.warning(f"⚠️  端口 {port} 已被占用，尝试使用其他端口...")
            # 尝试找一个可用端口
            for try_port in range(port + 1, port + 100):
                sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                result = sock.connect_ex((host, try_port))
                sock.close()
                if result != 0:
                    port = try_port
                    logger.info(f"✅ 找到可用端口: {port}")
                    break
            else:
                logger.error("❌ 无法找到可用端口")
                return
        
        logger.info("="*50)
        logger.info("🌐 Web服务器启动信息:")
        logger.info(f"📍 本地地址: http://localhost:{port}")
        logger.info(f"📍 网络地址: http://{host}:{port}")
        logger.info(f"📋 API文档: http://localhost:{port}/docs")
        logger.info("🛑 按 Ctrl+C 停止服务器")
        logger.info("="*50)
        
        # 配置uvicorn使用我们的日志配置
        uvicorn.run(
            app, 
            host=host, 
            port=port,
            reload=False,  # 生产环境建议关闭
            log_config=None,  # 禁用uvicorn的默认日志配置
            access_log=True
        )
        
    except KeyboardInterrupt:
        logger.info("👋 服务器被用户停止")
    except Exception as e:
        logger.error(f"❌ 服务器运行出错: {e}")
        logger.error("请检查配置和网络连接")
    finally:
        logger.info("感谢使用！")

if __name__ == "__main__":
    main() 