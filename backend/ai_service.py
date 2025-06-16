import openai
import logging
from typing import Dict, List, AsyncGenerator
from .config import GameConfig
import asyncio

# 配置日志
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class AIService:
    """AI服务类，负责与大模型交互"""
    
    def __init__(self):
        """初始化AI服务"""
        GameConfig.validate_config()
        self.client = openai.OpenAI(
            api_key=GameConfig.API_KEY,
            base_url=GameConfig.BASE_URL
        )
    
    async def get_simple_response(self, prompt: str) -> str:
        """获取简单的AI回应（非流式）"""
        try:
            response = self.client.chat.completions.create(
                model=GameConfig.MODEL,
                messages=[{"role": "user", "content": prompt}],
                temperature=GameConfig.NARRATOR_TEMPERATURE,
                max_tokens=500
            )
            
            return response.choices[0].message.content.strip()
        except Exception as e:
            logger.error(f"AI简单回应服务错误 - 提示长度: {len(prompt)}, 错误: {str(e)}", exc_info=True)
            if GameConfig.DEBUG_MODE:
                print(f"AI服务错误: {e}")
            return "抱歉，我现在无法回应..."
    
    async def get_stream_response(self, prompt: str) -> AsyncGenerator[str, None]:
        """获取流式AI回应"""
        try:
            # 使用同步客户端但在异步上下文中运行
            def _create_stream():
                return self.client.chat.completions.create(
                    model=GameConfig.MODEL,
                    messages=[{"role": "user", "content": prompt}],
                    temperature=GameConfig.CHARACTER_TEMPERATURE,
                    max_tokens=500,
                    stream=True
                )
            
            # 在线程池中运行同步调用
            response = await asyncio.get_event_loop().run_in_executor(None, _create_stream)
            
            for chunk in response:
                if chunk.choices and len(chunk.choices) > 0 and chunk.choices[0].delta.content:
                    content = chunk.choices[0].delta.content
                    yield content
                    # 添加小延迟以确保流式效果
                    await asyncio.sleep(0.02)
                    
        except Exception as e:
            logger.error(f"AI流式回应服务错误 - 提示长度: {len(prompt)}, 错误: {str(e)}", exc_info=True)
            if GameConfig.DEBUG_MODE:
                print(f"AI流式服务错误: {e}")
            yield "抱歉，我现在无法回应..."
    
    async def get_fast_response(self, prompt: str) -> str:
        """获取快速回应（使用流式但返回完整结果）"""
        try:
            full_response = ""
            async for chunk in self.get_stream_response(prompt):
                full_response += chunk
            return full_response.strip()
        except Exception as e:
            logger.error(f"AI快速回应服务错误 - 提示长度: {len(prompt)}, 错误: {str(e)}", exc_info=True)
            if GameConfig.DEBUG_MODE:
                print(f"AI快速服务错误: {e}")
            return "抱歉，我现在无法回应..." 