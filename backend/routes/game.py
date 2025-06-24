import json
import uuid
import asyncio
import logging
from typing import Dict, Any, List, Optional
from datetime import datetime

from fastapi import APIRouter, HTTPException, Request, Depends, WebSocket, WebSocketDisconnect
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

# 导入游戏相关模块
from backend.game_engine import DetectiveGameEngine
from backend.models import Character, Case, Accusation, CharacterType, CaseCategory, CaseDifficulty
from backend.case_data import load_cases
from backend.config import GameConfig
from backend.database import get_db
from backend.game_recorder import game_recorder

logger = logging.getLogger(__name__)

# 游戏路由器
game_router = APIRouter(
    prefix="/api/game",
    tags=["game"]
)

# 案例路由器
cases_router = APIRouter(
    prefix="/api",
    tags=["cases"]
)

# 游戏会话管理
game_sessions: Dict[str, DetectiveGameEngine] = {}

# API数据模型
class GameSessionResponse(BaseModel):
    session_id: str
    case_title: str
    current_round: int
    max_rounds: int
    hints_used: int
    max_hints: int
    characters: List[Dict]
    conversation_history: Dict[str, List[Dict]]

class QuestionRequest(BaseModel):
    session_id: str
    character_name: str
    question: str

class AccusationRequest(BaseModel):
    session_id: str
    accused_name: str
    reasoning: str

class HintRequest(BaseModel):
    session_id: str

class StartGameRequest(BaseModel):
    case_index: int = 0
    client_id: Optional[str] = None

class CharacterResponse(BaseModel):
    character_name: str
    response: str
    round_number: int

# WebSocket连接管理
class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}

    async def connect(self, websocket: WebSocket, session_id: str):
        await websocket.accept()
        self.active_connections[session_id] = websocket

    def disconnect(self, session_id: str):
        if session_id in self.active_connections:
            del self.active_connections[session_id]

    async def send_message(self, session_id: str, message: dict):
        if session_id in self.active_connections:
            await self.active_connections[session_id].send_text(json.dumps(message))

manager = ConnectionManager()

def _get_client_ip(request: Request) -> str:
    """获取客户端IP地址"""
    # 检查X-Forwarded-For头（适用于代理服务器）
    x_forwarded_for = request.headers.get("X-Forwarded-For")
    if x_forwarded_for:
        # X-Forwarded-For可能包含多个IP，取第一个
        return x_forwarded_for.split(",")[0].strip()
    
    # 检查X-Real-IP头（Nginx等使用）
    x_real_ip = request.headers.get("X-Real-IP")
    if x_real_ip:
        return x_real_ip.strip()
    
    # 最后使用直接连接的IP
    return request.client.host if request.client else "unknown"

def _trim_conversation_history(conversation_history: Dict[str, List[Dict]], character_name: str):
    """限制对话历史长度，保持在配置的最大值内"""
    if character_name in conversation_history:
        history = conversation_history[character_name]
        max_history = GameConfig.MAX_CONVERSATION_HISTORY
        if len(history) > max_history:
            # 保留最新的对话记录
            conversation_history[character_name] = history[-max_history:]

# 案例相关接口
@cases_router.get("/cases")
async def get_cases(category: Optional[str] = None, difficulty: Optional[str] = None):
    """
    获取案例列表API
    
    获取所有可用的游戏案例，支持按分类和难度进行过滤
    """
    cases = load_cases()
    
    # 过滤案例，保留原始索引
    filtered_cases_with_index = []
    for i, case in enumerate(cases):
        include_case = True
        if category and case.category.value != category:
            include_case = False
        if difficulty and case.difficulty.value != difficulty:
            include_case = False
        
        if include_case:
            filtered_cases_with_index.append((i, case))
    
    return [
        {
            "index": original_index,  # 使用原始索引
            "title": case.title,
            "description": case.description,
            "victim_name": case.victim_name,
            "crime_scene": case.crime_scene,
            "time_of_crime": case.time_of_crime,
            "category": case.category.value,
            "difficulty": case.difficulty.value,
            "characters": [
                {
                    "name": char.name,
                    "age": char.age,
                    "occupation": char.occupation,
                    "personality": char.personality,
                    "character_type": char.character_type.value
                } for char in case.characters
            ]
        } for original_index, case in filtered_cases_with_index
    ]

@cases_router.get("/categories")
async def get_categories():
    """
    获取分类信息API
    
    获取所有可用的案例分类和难度选项，用于前端筛选界面
    """
    # 获取分类的中文名称映射
    category_names = {
        "classic_murder": "经典谋杀案",
        "locked_room": "密室杀人案", 
        "revenge": "复仇案件",
        "family_drama": "家庭纠纷案",
        "kids_friendly": "儿童友好案例",
        "supernatural": "超自然元素案例",
        "financial_crime": "经济犯罪案",
        "missing_person": "失踪案件"
    }
    
    difficulty_names = {
        "easy": "简单",
        "medium": "中等",
        "hard": "困难", 
        "expert": "专家级"
    }
    
    return {
        "categories": [
            {"value": category.value, "name": category_names.get(category.value, category.value)}
            for category in CaseCategory
        ],
        "difficulties": [
            {"value": difficulty.value, "name": difficulty_names.get(difficulty.value, difficulty.value)}
            for difficulty in CaseDifficulty
        ]
    }

# 游戏核心接口
@game_router.post("/start")
async def start_game(request: StartGameRequest, req: Request, db: Session = Depends(get_db)):
    """
    开始新游戏API
    
    创建新的游戏会话，初始化游戏引擎和数据库记录
    """
    from backend.version import get_version
    
    session_id = str(uuid.uuid4())
    
    try:
        logger.info(f"开始新游戏 - 会话ID: {session_id}, 请求数据: {request}")
        
        # 获取客户端信息
        client_ip = _get_client_ip(req)
        client_id = request.client_id
        game_version = get_version()
        
        logger.info(f"客户端信息 - IP: {client_ip}, 客户端ID: {client_id}, 游戏版本: {game_version}")
        
        # 创建游戏引擎实例
        logger.info("正在创建游戏引擎实例...")
        game_engine = DetectiveGameEngine()
        logger.info(f"游戏引擎创建成功，可用案例数: {len(game_engine.cases)}")
        
        # 验证案例索引
        if request.case_index >= len(game_engine.cases):
            logger.error(f"案例索引无效 - 会话ID: {session_id}, 索引: {request.case_index}, 总案例数: {len(game_engine.cases)}")
            raise HTTPException(status_code=400, detail="案例索引无效")
        
        logger.info(f"设置当前案例 - 索引: {request.case_index}")
        game_engine.current_case = game_engine.cases[request.case_index]
        logger.info(f"当前案例设置成功: {game_engine.current_case.title}")
        
        # 初始化对话历史
        logger.info("初始化对话历史...")
        game_engine.conversation_history = {char.name: [] for char in game_engine.current_case.characters}
        game_engine.current_round = 0
        game_engine.hints_used = 0
        logger.info(f"对话历史初始化完成，角色数: {len(game_engine.current_case.characters)}")
        
        # 初始化证据系统
        logger.info("初始化证据系统...")
        game_engine.evidence_system.initialize_case(game_engine.current_case)
        logger.info("证据系统初始化完成")
        
        # 保存会话
        logger.info("保存游戏会话...")
        game_sessions[session_id] = game_engine
        logger.info(f"游戏会话保存成功，当前会话数: {len(game_sessions)}")
        
        # 记录到数据库
        try:
            logger.info("开始记录到数据库...")
            game_recorder.start_game_session(
                db=db,
                case_title=game_engine.current_case.title,
                case_category=game_engine.current_case.category.value,
                case_difficulty=game_engine.current_case.difficulty.value,
                player_name=None,
                session_id=session_id,
                client_id=client_id,
                ip_address=client_ip,
                game_version=game_version
            )
            game_engine.session_id = session_id
            logger.info(f"游戏会话记录到数据库成功 - 会话ID: {session_id}")
        except Exception as db_error:
            logger.warning(f"数据库记录失败，但游戏继续进行 - 会话ID: {session_id}, 错误: {str(db_error)}")
        
        logger.info(f"游戏会话创建成功 - 会话ID: {session_id}, 案例: {game_engine.current_case.title}")
        
        # 生成详细的案情介绍
        case_intro = game_engine.current_case.description
        
        # 构建响应数据
        logger.info("构建响应数据...")
        response_data = {
            "session_id": session_id,
            "case": {
                "title": game_engine.current_case.title,
                "description": case_intro,
                "victim_name": game_engine.current_case.victim_name,
                "crime_scene": game_engine.current_case.crime_scene,
                "time_of_crime": game_engine.current_case.time_of_crime,
                "category": game_engine.current_case.category.value,
                "difficulty": game_engine.current_case.difficulty.value,
                "characters": [
                    {
                        "name": char.name,
                        "age": char.age,
                        "occupation": char.occupation,
                        "personality": char.personality,
                        "background": char.background,
                        "character_type": char.character_type.value
                    } for char in game_engine.current_case.characters
                ]
            },
            "game_state": {
                "current_round": game_engine.current_round,
                "max_rounds": game_engine.max_rounds,
                "hints_used": game_engine.hints_used,
                "max_hints": game_engine.max_hints
            }
        }
        
        logger.info(f"响应数据构建完成 - 会话ID: {session_id}")
        return response_data
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"开始游戏时发生未预期错误 - 会话ID: {session_id}, 错误: {str(e)}")
        raise HTTPException(status_code=500, detail=f"服务器内部错误: {str(e)}")

@game_router.get("/{session_id}/state")
async def get_game_state(session_id: str):
    """
    获取游戏状态API
    
    获取指定会话的当前游戏状态信息
    """
    if session_id not in game_sessions:
        raise HTTPException(status_code=404, detail="游戏会话不存在")
    
    game = game_sessions[session_id]
    
    return {
        "session_id": session_id,
        "current_round": game.current_round,
        "max_rounds": game.max_rounds,
        "hints_used": game.hints_used,
        "max_hints": game.max_hints,
        "conversation_history": game.conversation_history,
        "case_title": game.current_case.title if game.current_case else None
    }

@game_router.post("/question/stream")
async def ask_question_stream(request: QuestionRequest):
    """
    角色提问API（流式响应）
    
    向指定角色提问并获取流式响应，支持Server-Sent Events
    """
    try:
        logger.info(f"收到流式提问请求 - 会话ID: {request.session_id}, 角色: {request.character_name}, 问题长度: {len(request.question)}")
        
        if request.session_id not in game_sessions:
            logger.error(f"游戏会话不存在 - 会话ID: {request.session_id}, 当前会话数: {len(game_sessions)}")
            raise HTTPException(status_code=404, detail="游戏会话不存在")
        
        game = game_sessions[request.session_id]
        logger.info(f"找到游戏会话 - 当前轮次: {game.current_round}/{game.max_rounds}")
        
        if game.current_round >= game.max_rounds:
            logger.warning(f"已达到最大轮次 - 会话ID: {request.session_id}, 当前轮次: {game.current_round}")
            raise HTTPException(status_code=400, detail="已达到最大轮次")
        
        # 找到对应角色
        character = None
        available_characters = []
        for char in game.current_case.characters:
            available_characters.append(char.name)
            if char.name == request.character_name:
                character = char
                break
        
        if not character:
            logger.error(f"角色不存在 - 会话ID: {request.session_id}, 角色名: {request.character_name}, 可用角色: {available_characters}")
            raise HTTPException(status_code=404, detail="角色不存在")
        
        logger.info(f"找到目标角色: {character.name}, 开始生成回应...")
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"流式提问请求处理失败 - 会话ID: {request.session_id}, 错误: {str(e)}")
        raise HTTPException(status_code=500, detail=f"服务器内部错误: {str(e)}")
    
    logger.info(f"开始生成角色回应 - 会话ID: {request.session_id}, 角色: {character.name}, 问题: {request.question[:50]}...")
    
    async def generate_response():
        try:
            # 发送开始标记
            yield f"data: {json.dumps({'type': 'start', 'character_name': character.name})}\n\n"
            
            # 获取AI回应流
            response_stream = await game._get_character_response_stream(character, request.question)
            
            # 收集完整响应用于保存
            response_text = ""
            
            # 流式发送响应
            async for chunk in response_stream:
                response_text += chunk
                chunk_data = json.dumps({'type': 'chunk', 'content': chunk})
                yield f"data: {chunk_data}\n\n"
            
            # 先发送对话完成标记
            yield f"data: {json.dumps({'type': 'response_complete'})}\n\n"
            
            # 记录对话
            conversation_record = {
                "question": request.question,
                "response": response_text,
                "timestamp": datetime.now().isoformat(),
                "round": game.current_round + 1
            }
            
            game.conversation_history[character.name].append(conversation_record)
            
            # 限制对话历史长度
            _trim_conversation_history(game.conversation_history, character.name)
            
            game.current_round += 1
            
            logger.info(f"对话记录完成 - 会话ID: {request.session_id}, 角色: {character.name}, 轮次: {game.current_round}")
            
            # 异步检查是否会揭露新证据
            revealed_evidence = await game.evidence_system.try_reveal_evidence(
                character, request.question, game.current_case
            )
            
            # 如果揭露了新证据，发送证据事件
            if revealed_evidence:
                evidence_data = {
                    "type": "evidence_revealed",
                    "evidence": {
                        "name": revealed_evidence.name,
                        "description": revealed_evidence.description,
                        "significance": revealed_evidence.significance,
                        "evidence_type": revealed_evidence.evidence_type.value
                    }
                }
                yield f"data: {json.dumps(evidence_data)}\n\n"
            
            # 记录到数据库
            try:
                if hasattr(game, 'session_id') and game.session_id:
                    db_session = next(get_db())
                    try:
                        # 记录玩家问题
                        game_recorder.record_conversation(
                            db=db_session,
                            session_id=game.session_id,
                            speaker_type="player",
                            speaker_name=None,
                            message_type="question",
                            content=request.question,
                            extra_data={"character_target": character.name}
                        )
                        
                        # 记录角色回答
                        game_recorder.record_conversation(
                            db=db_session,
                            session_id=game.session_id,
                            speaker_type="character",
                            speaker_name=character.name,
                            message_type="answer",
                            content=response_text,
                            extra_data={"revealed_evidence": revealed_evidence.name if revealed_evidence else None}
                        )
                    finally:
                        db_session.close()
            except Exception as db_error:
                logger.warning(f"对话数据库记录失败 - 会话ID: {request.session_id}, 错误: {db_error}")
            
            # 发送最终完成标记
            result = {
                "type": "complete",
                "round_number": game.current_round,
                "remaining_rounds": game.max_rounds - game.current_round,
                "rounds_exhausted": game.current_round >= game.max_rounds
            }
            
            yield f"data: {json.dumps(result)}\n\n"
            
        except Exception as e:
            logger.error(f"流式响应生成错误 - 会话ID: {request.session_id}, 错误: {str(e)}")
            yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"
    
    return StreamingResponse(
        generate_response(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "*"
        }
    )

@game_router.post("/hint")
async def get_hint(request: HintRequest):
    """
    获取游戏提示API
    
    为玩家提供智能提示，帮助推进游戏进度
    """
    if request.session_id not in game_sessions:
        raise HTTPException(status_code=404, detail="游戏会话不存在")
    
    game = game_sessions[request.session_id]
    
    if game.hints_used >= game.max_hints:
        raise HTTPException(status_code=400, detail="提示次数已用完")
    
    try:
        hint = await game._generate_intelligent_hint()
        game.hints_used += 1
        
        return {
            "hint": hint,
            "hints_used": game.hints_used,
            "hints_remaining": game.max_hints - game.hints_used
        }
        
    except Exception as e:
        logger.error(f"生成提示时出错 - 会话: {request.session_id}, 错误: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"生成提示时出错: {str(e)}")


@game_router.post("/accusation/stream")
async def make_accusation_stream(request: AccusationRequest):
    """
    提交指控API（流式审判）
    
    提交对嫌疑人的指控并获取流式审判过程
    """
    try:
        logger.info(f"收到指控请求 - 会话ID: {request.session_id}, 被指控者: {request.accused_name}, 理由长度: {len(request.reasoning)}")
        
        if request.session_id not in game_sessions:
            logger.error(f"游戏会话不存在 - 会话ID: {request.session_id}, 当前会话数: {len(game_sessions)}")
            raise HTTPException(status_code=404, detail="游戏会话不存在")
        
        game = game_sessions[request.session_id]
        logger.info(f"找到游戏会话 - 案例: {game.current_case.title if game.current_case else 'None'}")
        
        # 找到被指控的角色
        accused = None
        available_characters = []
        for char in game.current_case.characters:
            available_characters.append(char.name)
            if char.name == request.accused_name:
                accused = char
                break
        
        if not accused:
            logger.error(f"被指控角色不存在 - 会话ID: {request.session_id}, 角色名: {request.accused_name}, 可用角色: {available_characters}")
            raise HTTPException(status_code=404, detail="被指控角色不存在")
        
        logger.info(f"找到被指控角色: {accused.name}, 是否为真凶: {accused.is_guilty}, 开始审判流程...")
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"指控请求处理失败 - 会话ID: {request.session_id}, 错误: {str(e)}")
        raise HTTPException(status_code=500, detail=f"服务器内部错误: {str(e)}")
    
    async def generate_trial_stream():
        try:
            logger.info(f"开始生成审判流程 - 会话ID: {request.session_id}, 被指控者: {accused.name}")
            
            accusation = Accusation(
                accused=accused,
                accuser_reasoning=request.reasoning,
                witness_testimonies=[],
                votes=[],
                vote_summary={"support": 0, "oppose": 0, "total": 0}
            )
            
            # 发送开始标记
            yield f"data: {json.dumps({'type': 'start', 'accused_name': accused.name})}\n\n"

            # 步骤1: 被告辩护
            yield f"data: {json.dumps({'type': 'step', 'step': 'defense', 'title': '被告辩护'})}\n\n"
            
            # 获取被告辩护（流式）
            defense_stream = game.accusation_system.generate_defense_stream(
                accused, request.reasoning, game.current_case, game.conversation_history
            )
            
            defense_text = ""
            async for chunk in defense_stream:
                defense_text += chunk
                yield f"data: {json.dumps({'type': 'defense_chunk', 'content': chunk})}\n\n"
                await asyncio.sleep(0.03)
            
            yield f"data: {json.dumps({'type': 'defense_complete', 'defense': defense_text})}\n\n"
            
            # 步骤2: 证人证词
            yield f"data: {json.dumps({'type': 'step', 'step': 'testimonies', 'title': '证人证词'})}\n\n"
            
            witness_testimonies = []
            witnesses = game.accusation_system._get_witnesses(game.current_case, accused.name)
            
            for i, witness in enumerate(witnesses):
                yield f"data: {json.dumps({'type': 'witness_start', 'witness_name': witness.name, 'index': i})}\n\n"
                
                # 获取证人证词（流式）
                testimony_stream = game.accusation_system.generate_witness_testimony_stream(
                    witness, accused, request.reasoning, game.current_case, game.conversation_history
                )
                
                testimony_text = ""
                async for chunk in testimony_stream:
                    testimony_text += chunk
                    yield f"data: {json.dumps({'type': 'testimony_chunk', 'witness_name': witness.name, 'content': chunk})}\n\n"
                    await asyncio.sleep(0.03)
                
                witness_testimonies.append({
                    "witness_name": witness.name,
                    "testimony": testimony_text
                })
                
                yield f"data: {json.dumps({'type': 'witness_complete', 'witness_name': witness.name, 'testimony': testimony_text})}\n\n"
            
            # 步骤3: 投票过程
            yield f"data: {json.dumps({'type': 'step', 'step': 'voting', 'title': '陪审团投票'})}\n\n"
            
            for i, voter in enumerate(witnesses):
                yield f"data: {json.dumps({'type': 'vote_start', 'voter_name': voter.name, 'index': i})}\n\n"
                
                # 获取投票和理由（流式）
                vote_stream = game.accusation_system.generate_vote_stream(
                    voter, accusation, game.current_case, game.conversation_history
                )
                
                vote_data = ""
                async for chunk in vote_stream:
                    vote_data += chunk
                    yield f"data: {json.dumps({'type': 'vote_chunk', 'voter_name': voter.name, 'content': chunk})}\n\n"
                    await asyncio.sleep(0.03)
                
                # 解析投票结果并添加到指控对象中
                vote_info = game.accusation_system.add_vote_to_accusation(accusation, voter, vote_data)
                
                yield f"data: {json.dumps({'type': 'vote_complete', 'voter_name': vote_info['voter_name'], 'vote': vote_info['vote'], 'reason': vote_info['reason']})}\n\n"
            
            # 步骤4: 最终判决
            yield f"data: {json.dumps({'type': 'step', 'step': 'verdict', 'title': '最终判决'})}\n\n"
            
                        # 完成指控的最终判决
            final_verdict, is_correct = game.accusation_system.generate_accusation_result(accusation)
            
            yield f"data: {json.dumps({'type': 'vote_summary', 'vote_summary': accusation.vote_summary})}\n\n"
            await asyncio.sleep(1)
            
            yield f"data: {json.dumps({'type': 'verdict', 'final_verdict': final_verdict})}\n\n"
            await asyncio.sleep(1)
            
            yield f"data: {json.dumps({'type': 'correctness', 'is_correct': is_correct})}\n\n"
            await asyncio.sleep(1)
            
            # 步骤5: 案件真相
            solution_text = ""
            solution_stream = game.accusation_system.generate_case_solution_stream(
                game.current_case, accused, is_correct
            )
            
            async for chunk in solution_stream:
                solution_text += chunk
                yield f"data: {json.dumps({'type': 'solution_chunk', 'content': chunk})}\n\n"
                await asyncio.sleep(0.03)

            # 记录审判过程到数据库
            try:
                if hasattr(game, 'session_id') and game.session_id:
                    db_session = next(get_db())
                    try:
                        # 记录指控
                        game_recorder.record_conversation(
                            db=db_session,
                            session_id=game.session_id,
                            speaker_type="player",
                            speaker_name=None,
                            message_type="accusation",
                            content=f"指控 {accused.name}：{request.reasoning}",
                            extra_data={"accused_name": accused.name}
                        )
                        
                        # 记录其他审判过程...
                        # 结束游戏会话
                        game_recorder.end_game_session(db_session, game.session_id, is_solved=is_correct)
                        
                    finally:
                        db_session.close()
            except Exception as db_error:
                logger.warning(f"审判过程数据库记录失败 - 会话ID: {request.session_id}, 错误: {db_error}")
            
            # 发送完整结果
            result = {
                "type": "complete",
                "accused_name": accused.name,
                "accuser_reasoning": request.reasoning,
                "accused_defense": defense_text,
                "witness_testimonies": witness_testimonies,
                "votes": [{"voter_name": voter.name, "vote": vote, "reason": reason} for voter, vote, reason in accusation.votes],
                "vote_summary": accusation.vote_summary,
                "final_verdict": final_verdict,
                "is_correct": is_correct,
                "case_solution": solution_text
            }
            
            yield f"data: {json.dumps(result)}\n\n"
            
        except Exception as e:
            logger.error(f"流式审判过程中出错 - 会话: {request.session_id}, 被告: {accused.name}, 错误: {str(e)}", exc_info=True)
            yield f"data: {json.dumps({'type': 'error', 'message': f'审判过程出错: {str(e)}'})}\n\n"
    
    return StreamingResponse(
        generate_trial_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "*"
        }
    )

@game_router.delete("/{session_id}")
async def end_game(session_id: str):
    """
    结束游戏会话API
    
    手动结束指定的游戏会话，清理相关资源
    """
    if session_id in game_sessions:
        logger.info(f"结束游戏会话 - 会话ID: {session_id}")
        del game_sessions[session_id]
        manager.disconnect(session_id)
        return {"message": "游戏会话已结束"}
    else:
        logger.warning(f"尝试结束不存在的游戏会话 - 会话ID: {session_id}")
        raise HTTPException(status_code=404, detail="游戏会话不存在")

# 获取游戏会话字典的函数，供其他模块使用
def get_game_sessions():
    """获取游戏会话字典"""
    return game_sessions

# 获取连接管理器的函数，供其他模块使用
def get_connection_manager():
    """获取连接管理器"""
    return manager