from typing import List, Dict, Optional, Set
from .models import Character, Evidence, Case, EvidenceType
from .ai_service import AIService

class EvidenceSystem:
    """智能证据管理系统"""
    
    def __init__(self, ai_service: AIService):
        self.ai_service = ai_service
        self.revealed_evidence: Set[str] = set()  # 已经被揭露的证据
        self.character_evidence_knowledge: Dict[str, Set[str]] = {}  # 每个角色知道的证据
    
    def initialize_case(self, case: Case):
        """初始化案件的证据系统"""
        self.revealed_evidence.clear()
        self.character_evidence_knowledge.clear()
        
        # 初始化每个角色的证据知识
        for character in case.characters:
            self.character_evidence_knowledge[character.name] = set()
            
            # 根据证据的known_by字段初始化角色知识
            for evidence in case.evidence:
                if evidence.is_known_by(character.name):
                    self.character_evidence_knowledge[character.name].add(evidence.name)
    
    def get_character_known_evidence(self, character: Character, case: Case) -> List[Evidence]:
        """获取角色知道的证据列表"""
        known_evidence = []
        character_known = self.character_evidence_knowledge.get(character.name, set())
        
        for evidence in case.evidence:
            if evidence.name in character_known:
                known_evidence.append(evidence)
        
        return known_evidence
    
    async def get_character_evidence_context(self, character: Character, case: Case) -> str:
        """获取角色的证据上下文信息（AI智能判断是否提及）"""
        known_evidence = self.get_character_known_evidence(character, case)
        
        if not known_evidence:
            return "我没有掌握特殊的证据信息。"
        
        # 让AI判断角色会如何处理这些证据
        evidence_list = []
        for evidence in known_evidence:
            evidence_list.append(f"- {evidence.name}：{evidence.description}（意义：{evidence.significance}）")
        
        prompt = f"""你正在扮演{character.name}，需要决定如何处理你知道的证据信息。

【你的角色设定】
我是{character.name}，{character.age}岁，{character.occupation}。
性格：{character.personality}
背景：{character.background}
我的秘密：{character.secret}
{"我是真凶" if character.is_guilty else "我是无辜的"}

【我知道的证据】
{chr(10).join(evidence_list)}

【判断要求】
1. 分析每个证据对我是否有利或不利
2. 决定我会主动提及哪些证据，隐瞒哪些证据
3. {"如果我是真凶，我会隐瞒对我不利的证据，但不能表现得太明显" if character.is_guilty else "如果我是无辜的，我通常会诚实地分享我知道的信息"}
4. 考虑我的性格特点和处境

请按以下格式回答，每个证据一行：
证据名称：[会提及/会隐瞒] - 理由"""

        try:
            response = await self.ai_service.get_fast_response(prompt)
            
            # 解析AI的回答，构建上下文
            context_parts = ["【我知道的证据信息】"]
            
            for line in response.strip().split('\n'):
                if '：' in line and ('会提及' in line or '会隐瞒' in line):
                    evidence_name = line.split('：')[0].strip()
                    # 找到对应的证据
                    for evidence in known_evidence:
                        if evidence.name == evidence_name:
                            if '会提及' in line:
                                context_parts.append(f"- {evidence.name}：{evidence.description}")
                            else:
                                context_parts.append(f"- {evidence.name}：我知道但不会主动提及")
                            break
            
            return "\n".join(context_parts)
            
        except Exception as e:
            # AI调用失败时的备用逻辑
            context_parts = ["【我知道的证据信息】"]
            for evidence in known_evidence:
                # 简单的备用逻辑：凶手隐瞒可能不利的证据
                if character.is_guilty and any(keyword in evidence.significance.lower() 
                                             for keyword in ['矛盾', '指纹', '不利', '证明']):
                    context_parts.append(f"- {evidence.name}：我知道但不会主动提及")
                else:
                    context_parts.append(f"- {evidence.name}：{evidence.description}")
            
            return "\n".join(context_parts)
    
    async def try_reveal_evidence(self, 
                                character: Character, 
                                question: str, 
                                case: Case) -> Optional[Evidence]:
        """尝试通过问题揭露新证据（AI智能判断）"""
        
        known_evidence = self.get_character_known_evidence(character, case)
        unrevealed_evidence = [e for e in known_evidence if e.name not in self.revealed_evidence]
        
        if not unrevealed_evidence:
            return None
        
        # 让AI判断这个问题是否会触发某个证据的揭露
        evidence_list = []
        for evidence in unrevealed_evidence:
            evidence_list.append(f"- {evidence.name}：{evidence.description}（意义：{evidence.significance}）")
        
        prompt = f"""你正在扮演{character.name}，侦探问了你一个问题，你需要判断是否会揭露某个证据。

【你的角色设定】
我是{character.name}，{character.age}岁，{character.occupation}。
性格：{character.personality}
{"我是真凶，会尽量隐瞒对我不利的证据" if character.is_guilty else "我是无辜的，通常会诚实回答"}

【侦探的问题】
{question}

【我知道但尚未公开的证据】
{chr(10).join(evidence_list)}

【判断要求】
1. 分析这个问题是否直接涉及某个证据
2. 考虑我的性格和处境，我是否会在回答中提及这个证据
3. {"如果我是真凶，我会尽量避免提及对我不利的证据" if character.is_guilty else "如果我是无辜的，我通常会如实回答"}

如果我会在回答中揭露某个证据，请回答：
揭露：证据名称

如果我不会揭露任何证据，请回答：
不揭露"""

        try:
            response = await self.ai_service.get_fast_response(prompt)
            
            if response.strip().startswith("揭露："):
                evidence_name = response.strip().replace("揭露：", "").strip()
                # 找到对应的证据
                for evidence in unrevealed_evidence:
                    if evidence.name == evidence_name:
                        self.revealed_evidence.add(evidence.name)
                        return evidence
            
            return None
            
        except Exception as e:
            # AI调用失败时不揭露证据
            return None
    
    async def get_evidence_for_voting(self, case: Case, character: Character) -> str:
        """获取投票时角色应该考虑的证据信息（AI智能分析）"""
        known_evidence = self.get_character_known_evidence(character, case)
        revealed_evidence = self.get_all_revealed_evidence(case)
        
        if not known_evidence and not revealed_evidence:
            return "我没有掌握特殊的证据信息。"
        
        # 构建证据列表
        all_relevant_evidence = []
        
        # 已公开的证据
        for evidence in revealed_evidence:
            all_relevant_evidence.append(f"【已公开】{evidence.name}：{evidence.description}（意义：{evidence.significance}）")
        
        # 角色私下知道的证据
        for evidence in known_evidence:
            if evidence.name not in self.revealed_evidence:
                all_relevant_evidence.append(f"【我私下知道】{evidence.name}：{evidence.description}（意义：{evidence.significance}）")
        
        if not all_relevant_evidence:
            return "目前没有重要的证据信息。"
        
        # 让AI分析这些证据对投票的影响
        prompt = f"""你正在扮演{character.name}，现在需要基于已知证据进行投票分析。

【你的角色设定】
我是{character.name}，{character.age}岁，{character.occupation}。
性格：{character.personality}
{"我是真凶，需要转移注意力" if character.is_guilty else "我是无辜的，会客观分析"}

【相关证据信息】
{chr(10).join(all_relevant_evidence)}

【分析要求】
请分析这些证据的重要性和对案件的影响，为投票提供参考。
{"注意：作为真凶，我可能会有选择性地分析证据" if character.is_guilty else "注意：我会尽量客观地分析所有证据"}

分析结果："""

        try:
            response = await self.ai_service.get_fast_response(prompt)
            return f"【我知道的关键证据分析】\n{response.strip()}"
        except Exception as e:
            # AI调用失败时返回基本信息
            evidence_parts = ["【我知道的关键证据】"]
            for evidence in all_relevant_evidence:
                evidence_parts.append(evidence)
            return "\n".join(evidence_parts)
    
    def get_all_revealed_evidence(self, case: Case) -> List[Evidence]:
        """获取所有已揭露的证据"""
        revealed = []
        for evidence in case.evidence:
            if evidence.name in self.revealed_evidence:
                revealed.append(evidence)
        return revealed
    
    def force_reveal_evidence(self, evidence_name: str):
        """强制揭露某个证据（比如法医检验结果）"""
        self.revealed_evidence.add(evidence_name)
    
    def get_evidence_summary_for_character(self, character: Character, case: Case) -> str:
        """获取角色视角下的证据总结"""
        known_evidence = self.get_character_known_evidence(character, case)
        revealed_evidence = self.get_all_revealed_evidence(case)
        
        summary_parts = []
        
        if revealed_evidence:
            summary_parts.append("【已公开的证据】")
            for evidence in revealed_evidence:
                summary_parts.append(f"- {evidence.name}：{evidence.description}")
        
        # 角色私下知道但未公开的证据
        private_evidence = [e for e in known_evidence if e.name not in self.revealed_evidence]
        if private_evidence and not character.is_guilty:
            summary_parts.append("\n【我私下知道的信息】")
            for evidence in private_evidence:
                summary_parts.append(f"- {evidence.name}：{evidence.description}")
        
        return "\n".join(summary_parts) if summary_parts else "目前没有重要的证据信息。" 