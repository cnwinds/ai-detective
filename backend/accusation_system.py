import logging
from typing import List, Dict, Optional
from .models import Character, Accusation, Case
from .ai_service import AIService

# 配置日志
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class AccusationSystem:
    """指控和反驳系统"""
    
    def __init__(self, ai_service: AIService, evidence_system=None):
        self.ai_service = ai_service
        self.evidence_system = evidence_system
    
    def _parse_vote_result(self, vote_text: str) -> tuple:
        """解析投票结果 - 使用最简单的算法"""
        if not vote_text:
            return "反对", "无法获取投票信息"
        
        vote_text = vote_text.strip()
        
        # 记录解析过程用于调试
        logger.info(f"投票解析 - 原始文本: {repr(vote_text)}...")
        
        # 1. 通过"理由："切割字符串
        if "理由：" in vote_text:
            vote_part, reason_part = vote_text.split("理由：", 1)
        else:
            vote_part = vote_text
            reason_part = ""
        
        vote_part = vote_part.strip()
        reason_part = reason_part.strip()
        
        # 2. 在投票部分判断是支持还是反对
        vote_result = "反对"  # 默认反对
        
        if "支持" in vote_part:
            vote_result = "支持"
        elif "反对" in vote_part:
            vote_result = "反对"
        
        # 3. 处理理由
        if reason_part:
            vote_reason = reason_part
        else:
            # 如果没有理由，提供默认理由
            if vote_result == "支持":
                vote_reason = "认为指控有道理"
            else:
                vote_reason = "认为证据不足"
        
        logger.info(f"投票解析 - 最终结果: {vote_result}, 理由: {vote_reason}...")
        
        return vote_result, vote_reason

    def _get_witnesses(self, case: Case, accused_name: str):
        """获取证人列表（统一方法）"""
        return [char for char in case.characters 
                if char.name != accused_name and char.character_type.value not in ["expert", "victim"]]

    def _analyze_contradictions(self, accused: Character, conversation_history: Dict[str, List[Dict]]) -> str:
        """分析对话中的矛盾点"""
        accused_conversations = conversation_history.get(accused.name, [])
        if not accused_conversations:
            return "被指控者没有与侦探进行过对话。"
        
        # 收集其他人的证词
        other_testimonies = []
        for char_name, conversations in conversation_history.items():
            if char_name != accused.name and conversations:
                for conv in conversations:
                    other_testimonies.append(f"{char_name}说：{conv['response']}")
        
        if not other_testimonies:
            return "没有其他证人的证词可供对比。"
        
        # 构建矛盾分析
        contradictions = []
        
        # 分析时间线矛盾
        accused_timeline = []
        for conv in accused_conversations:
            if any(time_word in conv['question'].lower() or time_word in conv['response'].lower() 
                   for time_word in ['时间', '几点', '什么时候', '当时', '那时']):
                accused_timeline.append(f"问：{conv['question']} 答：{conv['response']}")
        
        if accused_timeline:
            contradictions.append("【时间线相关证词】")
            contradictions.extend(accused_timeline)
        
        # 分析行为矛盾
        accused_behaviors = []
        for conv in accused_conversations:
            if any(behavior_word in conv['question'].lower() or behavior_word in conv['response'].lower()
                   for behavior_word in ['在做', '去了', '看到', '听到', '遇到']):
                accused_behaviors.append(f"问：{conv['question']} 答：{conv['response']}")
        
        if accused_behaviors:
            contradictions.append("\n【行为相关证词】")
            contradictions.extend(accused_behaviors)
        
        return "\n".join(contradictions) if contradictions else "暂未发现明显矛盾。"

    def _build_conversation_context(self, voter: Character, conversation_history: Dict[str, List[Dict]]) -> str:
        """构建投票者的对话上下文"""
        voter_conversations = conversation_history.get(voter.name, []) if conversation_history else []
        
        if not voter_conversations:
            return "【我与侦探没有进行过对话】"
        
        conversation_context = "【我与侦探的完整对话记录】\n"
        for i, conv in enumerate(voter_conversations, 1):
            conversation_context += f"第{i}轮对话：\n"
            conversation_context += f"侦探问：{conv['question']}\n"
            conversation_context += f"我答：{conv['response']}\n\n"
        
        return conversation_context

    def _build_testimonies_context(self, voter: Character, accusation: 'Accusation') -> str:
        """构建证词上下文"""
        testimonies_context = ""
        for witness, testimony in accusation.witness_testimonies:
            if witness.name == voter.name:
                testimonies_context += f"我的证词：{testimony}\n\n"
            else:
                testimonies_context += f"{witness.name}的证词：{testimony}\n\n"
        return testimonies_context

    async def _build_evidence_context(self, case: Case, voter: Character) -> str:
        """构建证据上下文"""
        evidence_info = ""
        
        if self.evidence_system:
            try:
                evidence_info = await self.evidence_system.get_evidence_for_voting(case, voter)
                evidence_info += "\n"
            except Exception as e:
                # 备用方案：使用基本证据信息
                evidence_info = self._build_basic_evidence_info(case)
        else:
            # 没有证据系统时的备用方案
            evidence_info = self._build_basic_evidence_info(case)
        
        return evidence_info

    def _build_basic_evidence_info(self, case: Case) -> str:
        """构建基本证据信息"""
        if not case.evidence:
            return ""
        
        evidence_info = "【现场物理证据】\n"
        for evidence in case.evidence:
            evidence_info += f"- {evidence.name}：{evidence.description}（发现地点：{evidence.location}）\n"
        evidence_info += "\n"
        
        return evidence_info

    async def _generate_error_vote(self, voter: Character, accusation: 'Accusation'):
        """生成错误时的默认投票"""
        if voter.is_guilty:
            # 真凶倾向于支持对其他人的指控
            async def error_stream():
                yield f"支持指控。我觉得{accusation.accused.name}确实很可疑，侦探的分析有道理。"
        else:
            # 无辜角色更谨慎
            async def error_stream():
                yield f"反对指控。我认为证据还不够充分，不能仅凭这些就断定{accusation.accused.name}是凶手。"
        
        async for chunk in error_stream():
            yield chunk

    def add_vote_to_accusation(self, accusation: 'Accusation', voter: Character, vote_text: str) -> dict:
        """解析投票结果并添加到指控对象中"""
        # 解析投票结果
        vote, reason = self._parse_vote_result(vote_text)
        
        # 添加到指控对象的投票列表
        accusation.votes.append((voter, vote, reason))
        
        # 更新投票统计
        if vote == "支持":
            accusation.vote_summary["support"] += 1
        else:
            accusation.vote_summary["oppose"] += 1
        
        accusation.vote_summary["total"] = len(accusation.votes)
        
        # 返回投票信息用于流式输出
        return {
            "voter_name": voter.name,
            "vote": vote,
            "reason": reason
        }
    
    async def generate_defense_stream(self, 
                                     accused: Character, 
                                     accuser_reasoning: str,
                                     case: Case,
                                     conversation_history: Dict[str, List[Dict]]):
        """生成被指控者的流式反驳"""
        
        try:
            # 获取被指控者的完整对话历史
            accused_conversations = conversation_history.get(accused.name, [])
            conversation_context = ""
            if accused_conversations:
                conversation_context = "【我与侦探的完整对话记录】\n"
                for i, conv in enumerate(accused_conversations, 1):
                    conversation_context += f"第{i}轮对话：\n"
                    conversation_context += f"侦探问：{conv['question']}\n"
                    conversation_context += f"我答：{conv['response']}\n\n"
            else:
                conversation_context = "【我与侦探没有进行过对话】"
            
            # 获取在场人员
            present_people = [char.name for char in case.characters 
                             if char.name != accused.name and char.character_type.value != "expert"]
            present_people_str = "、".join(present_people)
            
            prompt = f"""你正在扮演被指控的{accused.name}，现在侦探指控你是凶手，你需要为自己辩护。
     
    【你的角色设定】
    我是{accused.name}，{accused.age}岁，{accused.occupation}。
    性格：{accused.personality}
    背景：{accused.background}
    我的秘密：{accused.secret}
    我的不在场证明：{accused.alibi}
    {"我的动机：" + accused.motive if accused.motive else ""}
    
    【案件情况】
    {case.description}
    受害者是{case.victim_name}，案发时间{case.time_of_crime}，地点在{case.crime_scene}。
     
    【侦探的指控】
    侦探指控我是凶手，理由是：{accuser_reasoning}
     
    {conversation_context}
     
    【在场人员】
    当晚在场的还有：{present_people_str}
     
    【反驳要求】
    1. 以第一人称进行反驳，符合我的性格
    2. {"如果我确实是凶手，要巧妙反驳但不能撒谎太明显，可以转移注意力或质疑证据" if accused.is_guilty else "我是无辜的，要据理力争，指出指控的漏洞"}
    3. 可以提到我的不在场证明
    4. 可以暗示其他人更可疑
    5. 反驳要有逻辑性，不要太长
    6. 表现出相应的情绪（愤怒、委屈、震惊等）
    
    我的反驳："""
            logger.info(f"生成反驳, 提示词: {prompt}")
            # 使用异步生成器正确地流式输出
            async for chunk in self.ai_service.get_stream_response(prompt):
                yield chunk
                
        except Exception as e:
            logger.error(f"生成被告辩护时出错 - 被告: {accused.name}, 错误: {str(e)}", exc_info=True)
            yield f"[{accused.name}显得很震惊，一时说不出话来]"
    
    async def generate_witness_testimony_stream(self,
                                               witness: Character,
                                               accused: Character,
                                               accuser_reasoning: str,
                                               case: Case,
                                               conversation_history: Dict[str, List[Dict]]):
        """生成证人证词的流式输出"""
        
        # 使用已有的对话上下文构建函数
        conversation_context = self._build_conversation_context(witness, conversation_history)
        
        prompt = f"""你正在扮演{witness.name}，现在侦探指控{accused.name}是凶手，你需要作为证人发表看法。

【你的角色设定】
我是{witness.name}，{witness.age}岁，{witness.occupation}。
性格：{witness.personality}
背景：{witness.background}
我的秘密：{witness.secret}
我知道的信息：{chr(10).join(witness.knowledge)}

【案件情况】
{case.description}
受害者是{case.victim_name}，案发时间{case.time_of_crime}。

【指控情况】
侦探指控{accused.name}是凶手，理由是：{accuser_reasoning}

{conversation_context}

【证词要求】
1. 以第一人称发表看法，符合我的性格
2. 基于我知道的信息和观察到的情况
3. {"如果我是真凶，要巧妙地支持对{accused.name}的指控，转移注意力" if witness.is_guilty else "诚实地说出我的观察和看法"}
4. 可以提到当晚观察到的{accused.name}的行为
5. 可以支持或质疑这个指控
6. 证词要简洁，不要太长

我的证词："""

        try:
            logger.info(f"生成证词, 提示词: {prompt}")
            async for chunk in self.ai_service.get_stream_response(prompt):
                yield chunk
        except Exception as e:
            logger.error(f"生成证人证词时出错 - 证人: {witness.name}, 错误: {str(e)}", exc_info=True)
            yield f"[{witness.name}沉默了一会儿，似乎在思考]"

    async def generate_vote_stream(self,
                                  voter: Character,
                                  accusation: 'Accusation',
                                  case: Case,
                                  conversation_history: Dict[str, List[Dict]] = None):
        """生成投票者的流式投票分析"""
        
        # 构建各种上下文信息
        conversation_context = self._build_conversation_context(voter, conversation_history)
        testimonies_context = self._build_testimonies_context(voter, accusation)
        evidence_info = await self._build_evidence_context(case, voter)
        contradictions = self._analyze_contradictions(accusation.accused, conversation_history)
        
        # 构建投票提示词
        prompt = f"""你正在扮演{voter.name}，现在需要对侦探的指控进行投票。你要仔细分析所有信息，做出理性的判断。

【你的角色设定】
我是{voter.name}，{voter.age}岁，{voter.occupation}。
性格：{voter.personality}
背景：{voter.background}
我的秘密：{voter.secret}
我知道的信息：{chr(10).join(voter.knowledge)}
{"我是真凶，需要转移注意力到其他人身上" if voter.is_guilty else "我是无辜的，会客观分析证据"}

【案件情况】
{case.description}
受害者是{case.victim_name}，案发时间{case.time_of_crime}，地点在{case.crime_scene}。

{evidence_info}

【指控情况】
侦探指控：{accusation.accused.name}是凶手
指控理由：{accusation.accuser_reasoning}

【被告辩护】
{accusation.accused.name}的辩护：{accusation.accused_defense}

【证据分析】
{contradictions}

【证人证词】
{testimonies_context}

{conversation_context}

【投票要求】
1. 你需要投票：支持指控 或 反对指控
2. {"如果你是真凶，应该支持对{accusation.accused.name}的指控，转移注意力" if voter.is_guilty else "作为理性的观察者，综合分析所有证据"}
3. 重点分析以下关键点：
   - 时间线是否存在明显矛盾
   - 证词前后是否一致
   - 行为是否异常可疑
   - 动机是否充分
   - 物理证据是否支持指控
4. 如果发现明显的时间线矛盾、证词不一致或有充分动机，应该支持指控
5. 给出详细的投票理由（2-3句话，说明具体的矛盾点或证据）
6. 符合你的性格特点和观察能力

请按以下格式回答：
投票：[支持/反对]
理由：[你的理由]"""

        try:
            logger.info(f"生成投票，提示词：{prompt}")
            async for chunk in self.ai_service.get_stream_response(prompt):
                if chunk:
                    yield chunk
        except Exception as e:
            logger.error(f"生成投票流式分析时出错 - 投票者: {voter.name}, 被告: {accusation.accused.name}, 错误: {str(e)}", exc_info=True)
            # 错误时根据角色特点给出默认投票
            async for chunk in self._generate_error_vote(voter, accusation):
                yield chunk

    def generate_accusation_result(self, accusation: 'Accusation') -> tuple:
        """完成指控的最终判决"""
        # 计算最终判决：需要过半数支持票才算定罪成功
        total_votes = accusation.vote_summary["total"]
        final_verdict = accusation.vote_summary["support"] > total_votes / 2
        
        # 判断是否指控正确：指控成立且指认了真凶
        is_correct = final_verdict and accusation.accused.is_guilty
        
        # 更新指控对象
        accusation.final_verdict = final_verdict
        
        return final_verdict, is_correct

    async def generate_case_solution_stream(self, case: Case, accused: Character, is_correct: bool):
        """输出案件真相 - 只有指控正确时才显示真相"""
        
        if is_correct:
            # 指控正确，显示真实的案件真相
            if not hasattr(case, 'solution') or not case.solution:
                async def error_stream():
                    yield "案件数据错误：未找到案件真相信息。"
                async for chunk in error_stream():
                    yield chunk
                return
            
            prefix = f"🎉 恭喜！侦探成功破案！\n\n【案件真相】\n"
            full_solution = prefix + case.solution
            
            try:
                import asyncio
                for char in full_solution:
                    yield char
                    await asyncio.sleep(0.02)  # 控制输出速度，营造打字机效果
            except Exception as e:
                logger.error(f"输出案件真相时出错 - 案件: {case.title}, 错误: {str(e)}", exc_info=True)
                # 如果流式输出失败，直接输出完整内容
                yield full_solution
        else:
            # 指控错误，不显示真相，只给出失败信息
            failure_message = f"""❌ 很遗憾，侦探指控错误。{accused.name}并不是真凶。

指控不成立，案件将继续调查。

真相仍然隐藏在迷雾之中...

也许，真正的凶手此刻正在暗自窃喜，
而正义的天平，还在等待着那个关键的砝码。

推理之路从不平坦，
每一次失败都是通往真相的垫脚石。"""
            
            try:
                import asyncio
                for char in failure_message:
                    yield char
                    await asyncio.sleep(0.02)  # 控制输出速度，营造打字机效果
            except Exception as e:
                logger.error(f"输出失败信息时出错 - 案件: {case.title}, 错误: {str(e)}", exc_info=True)
                # 如果流式输出失败，直接输出完整内容
                yield failure_message
