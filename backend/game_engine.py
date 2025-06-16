import asyncio
from typing import List, Optional, Dict, Any

from .ai_service import AIService
from .models import Case, Character, CharacterType
from .case_data import load_cases
from .accusation_system import AccusationSystem
from .evidence_system import EvidenceSystem
from .config import GameConfig

class DetectiveGameEngine:
    """侦探推理游戏引擎"""
    
    def __init__(self):
        self.ai_service = AIService()
        self.evidence_system = EvidenceSystem(self.ai_service)
        self.accusation_system = AccusationSystem(self.ai_service, self.evidence_system)
        self.current_case: Optional[Case] = None
        self.conversation_history: Dict[str, List[Dict]] = {}
        self.current_character: Optional[Character] = None
        self.max_rounds = GameConfig.MAX_ROUNDS
        self.current_round = 0
        self.hints_used = 0
        self.max_hints = GameConfig.MAX_HINTS
        
        # 加载案例库
        self.cases = load_cases()
        
        self.session_id: Optional[str] = None
        
    def initialize_case(self, case_index: int = 0):
        """初始化案件"""
        self.current_case = self.cases[case_index]
        
        # 重置游戏状态
        self.conversation_history = {char.name: [] for char in self.current_case.characters}
        self.current_character = None
        self.current_round = 0
        self.hints_used = 0
        
        # 初始化证据系统
        self.evidence_system.initialize_case(self.current_case)

    async def _get_character_response_stream(self, character: Character, question: str):
        """获取角色的AI流式回应"""
        conversation_context = ""
        if character.name in self.conversation_history:
            recent_conversations = self.conversation_history[character.name][-3:]
            for conv in recent_conversations:
                conversation_context += f"侦探问：{conv['question']}\n我答：{conv['response']}\n\n"
        
        present_people = [char.name for char in self.current_case.characters if char.name != character.name]
        present_people_str = "、".join(present_people)
        
        # 构建通用时间线信息
        timeline_info = f"""
【案件基本信息】
- 案发时间：{self.current_case.time_of_crime}
- 案发地点：{self.current_case.crime_scene}
- 受害者：{self.current_case.victim_name}
        """
        
        # 获取角色的证据上下文
        evidence_context = await self.evidence_system.get_character_evidence_context(character, self.current_case)
        
        prompt = f"""你正在扮演案件中的角色{character.name}，需要根据角色设定自然地回答侦探的问题。

【角色设定】
我是{character.name}，{character.age}岁，{character.occupation}。
性格：{character.personality}
背景：{character.background}
我的秘密：{character.secret}
我的不在场证明：{character.alibi}
{"我的动机：" + character.motive if character.character_type == CharacterType.SUSPECT else ""}

【案件情况】
{self.current_case.description}
受害者是{self.current_case.victim_name}，案发时间{self.current_case.time_of_crime}，地点在{self.current_case.crime_scene}。

【在场人员】
当晚在场的人只有：{present_people_str}和我自己。

{timeline_info}

【我知道的信息】
{chr(10).join(character.knowledge)}

{evidence_context}

【对话历史】
{conversation_context}

【回答要求】
1. 以第一人称自然回答，符合我的性格和身份
2. {"如果我是真凶，要巧妙隐瞒但绝不承认，可以转移话题或质疑证据" if character.is_guilty else "诚实回答，但只说我知道的事实"}
3. 回答要简洁自然，不要太长
4. 严格按照时间线回答，不要出现时间矛盾
5. 保持角色一致性，不轻易改变立场
6. 根据证据信息合理回答，但要符合我的角色立场
7. 对于缺乏证据的指控，要表现出合理的怀疑
8. 如果侦探说"我确定XX是凶手"，我不会轻易附和，需要侦探提供充分的证据和理由
9. 我只会陈述我知道的事实，不会主动指认任何人为凶手
10. 如果侦探的指控缺乏证据，我会质疑或保持中立态度

侦探问：{question}
我回答："""

        return self.ai_service.get_stream_response(prompt)
    
    async def _generate_suggested_questions(self, character: Character) -> List[str]:
        """生成推荐问题"""
        conversation_context = ""
        if character.name in self.conversation_history:
            recent_conversations = self.conversation_history[character.name][-2:]
            for conv in recent_conversations:
                conversation_context += f"侦探问：{conv['question']}\n{character.name}答：{conv['response']}\n\n"
        
        # 收集所有人的对话历史，用于发现矛盾
        all_conversations = ""
        has_other_conversations = False
        for char_name, conversations in self.conversation_history.items():
            if conversations and char_name != character.name:
                has_other_conversations = True
                for conv in conversations[-2:]:  # 每人最近2轮对话
                    all_conversations += f"{char_name}说：{conv['response']}\n"
        
        present_people = [char.name for char in self.current_case.characters if char.name != character.name]
        present_people_str = "、".join(present_people)
        
        # 如果没有其他人的对话历史，生成基础问题
        if not has_other_conversations:
            # 第一次对话或没有其他人证词时的基础问题
            if not conversation_context:
                prompt = f"""你是一个侦探推理游戏的助手，需要为侦探生成3个初次询问{character.name}的问题。

【案件背景】
{self.current_case.description}
受害者：{self.current_case.victim_name}
案发时间：{self.current_case.time_of_crime}
案发地点：{self.current_case.crime_scene}

【角色信息】
{character.name}，{character.age}岁，{character.occupation}
性格：{character.personality}

【在场人员】
{present_people_str}

【生成要求】
1. 这是第一次与{character.name}对话，问题要从基础开始
2. 询问基本信息：当晚在做什么、不在场证明、对案件的了解等
3. 问题要简洁明了，一句话表达
4. 符合侦探初次调查的逻辑

请直接输出3个问题，每行一个，不要编号："""
            else:
                # 继续与同一人对话，但没有其他人证词
                prompt = f"""你是一个侦探推理游戏的助手，需要为侦探生成3个继续询问{character.name}的问题。

【案件背景】
{self.current_case.description}
受害者：{self.current_case.victim_name}
案发时间：{self.current_case.time_of_crime}
案发地点：{self.current_case.crime_scene}

【角色信息】
{character.name}，{character.age}岁，{character.occupation}
性格：{character.personality}

【与{character.name}的对话历史】
{conversation_context}

【生成要求】
1. 基于之前的对话内容，深入询问更多细节
2. 不要重复已经问过的问题
3. 可以询问：具体时间、见到的人、听到的声音、对其他人的看法等
4. 问题要简洁明了，一句话表达

请直接输出3个问题，每行一个，不要编号："""
        else:
            # 有其他人的对话历史时，分析矛盾和深入调查
            prompt = f"""你是一个侦探推理游戏的助手，需要为侦探生成3个最佳的问题来询问{character.name}。

【案件背景】
{self.current_case.description}
受害者：{self.current_case.victim_name}
案发时间：{self.current_case.time_of_crime}
案发地点：{self.current_case.crime_scene}

【角色信息】
{character.name}，{character.age}岁，{character.occupation}
性格：{character.personality}

【与{character.name}的对话历史】
{conversation_context if conversation_context else "尚未开始对话"}

【其他人的证词】
{all_conversations}

【生成要求】
1. 仔细分析其他人的证词，看是否与{character.name}之前的说法有冲突
2. 如果发现矛盾，生成质疑问题，并在问题前加上"🔍矛盾："标记
3. 关注时间线问题：如果有人说在某时间看到{character.name}，但{character.name}说自己在别处
4. 询问关键信息：不在场证明、当晚见闻、对其他人的看法、动机相关等
5. 问题要简洁明了，一句话表达，具有针对性
6. 不要重复已经问过的问题

请直接输出3个问题，每行一个，不要编号。如果发现矛盾，请在问题前加上"🔍矛盾："："""

        try:
            response = await self.ai_service.get_fast_response(prompt)
            questions = [q.strip() for q in response.strip().split('\n') if q.strip()]
            return questions[:3] if len(questions) >= 3 else questions
        except Exception as e:
            # 备用问题
            backup_questions = [
                f"你能详细说说案发当晚{self.current_case.time_of_crime}左右你在做什么吗？",
                f"你对{self.current_case.victim_name}的印象如何？",
                "你注意到什么异常情况吗？"
            ]
            return backup_questions

    def _build_investigation_summary(self) -> str:
        """构建调查状态摘要"""
        summary_parts = []
        total_conversations = sum(len(convs) for convs in self.conversation_history.values())
        
        for char_name, conversations in self.conversation_history.items():
            if conversations:
                char = next(c for c in self.current_case.characters if c.name == char_name)
                summary_parts.append(f"与{char_name}({char.occupation})对话{len(conversations)}次")
        
        untouched_characters = [char.name for char in self.current_case.characters 
                              if char.name not in self.conversation_history or not self.conversation_history[char.name]]
        
        if untouched_characters:
            summary_parts.append(f"未对话：{', '.join(untouched_characters)}")
        
        progress_percentage = min(100, (total_conversations / (len(self.current_case.characters) * 3)) * 100)
        summary_parts.append(f"调查进度：{progress_percentage:.0f}%")
        
        return "\n".join(summary_parts) if summary_parts else "尚未开始调查"

    async def _generate_intelligent_hint(self) -> str:
        """根据调查进度生成智能提示"""
        total_conversations = sum(len(convs) for convs in self.conversation_history.values())
        talked_characters = [name for name, convs in self.conversation_history.items() if convs]
        untouched_characters = [char.name for char in self.current_case.characters 
                              if char.name not in talked_characters]
        
        if total_conversations == 0:
            return "建议先与所有在场人员都对话一轮，了解基本情况和每个人的不在场证明。"
        elif total_conversations < len(self.current_case.characters):
            untouched_names = "、".join(untouched_characters)
            return f"你还没有与{untouched_names}对话过，他们可能掌握关键信息。"
        else:
            return await self._analyze_conversations_for_hint()



    async def _analyze_conversations_for_hint(self) -> str:
        """分析对话内容生成提示"""
        all_conversations = []
        for char_name, conversations in self.conversation_history.items():
            for conv in conversations:
                all_conversations.append(f"{char_name}: {conv['question']} -> {conv['response']}")
        
        if not all_conversations:
            return "建议开始与在场人员对话，了解案发当晚的情况。"
        
        conversations_text = "\n".join(all_conversations[-10:])
        
        prompt = f"""你是一个侦探推理游戏的智能助手，需要分析玩家的调查进度并给出有针对性的提示。

【案件信息】
{self.current_case.description}
受害者：{self.current_case.victim_name}
案发时间：{self.current_case.time_of_crime}
案发地点：{self.current_case.crime_scene}

【在场人员】
{chr(10).join([f"{char.name}({char.occupation})" for char in self.current_case.characters])}

【已进行的对话】
{conversations_text}

【分析要求】
1. 分析玩家已经收集到的信息
2. 识别还缺少哪些关键信息
3. 发现对话中的矛盾点或可疑之处
4. 给出具体的调查建议

请给出一个简洁但有针对性的提示（不超过50字），帮助玩家推进调查："""

        try:
            response = await self.ai_service.get_fast_response(prompt)
            return response.strip()
        except Exception as e:
            return "重新审视每个人的动机，谁最有理由伤害受害者？" 