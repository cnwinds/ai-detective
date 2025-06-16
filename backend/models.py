from dataclasses import dataclass
from enum import Enum
from typing import List, Optional

class CharacterType(Enum):
    SUSPECT = "suspect"      # 嫌疑人
    WITNESS = "witness"      # 证人
    VICTIM = "victim"        # 受害者（如果还活着）
    EXPERT = "expert"        # 专家（法医、技术人员等）

class EvidenceType(Enum):
    PHYSICAL = "physical"    # 物理证据（现场痕迹、凶器等）
    TESTIMONY = "testimony"  # 证词证据（目击、听证等）
    DOCUMENT = "document"    # 文件证据（通话记录、文件等）
    BEHAVIORAL = "behavioral" # 行为证据（异常行为、动机等）

class CaseCategory(Enum):
    CLASSIC_MURDER = "classic_murder"        # 经典谋杀案
    LOCKED_ROOM = "locked_room"              # 密室杀人案
    REVENGE = "revenge"                      # 复仇案件
    FAMILY_DRAMA = "family_drama"            # 家庭纠纷案
    KIDS_FRIENDLY = "kids_friendly"          # 儿童友好案例
    SUPERNATURAL = "supernatural"            # 超自然元素案例
    FINANCIAL_CRIME = "financial_crime"      # 经济犯罪案
    MISSING_PERSON = "missing_person"        # 失踪案件

class CaseDifficulty(Enum):
    EASY = "easy"           # 简单（适合新手）
    MEDIUM = "medium"       # 中等难度
    HARD = "hard"           # 困难（复杂推理）
    EXPERT = "expert"       # 专家级（多重诡计）

@dataclass
class Character:
    """游戏角色"""
    name: str
    age: int
    occupation: str
    personality: str
    background: str
    secret: str              # 角色隐藏的秘密
    alibi: str              # 不在场证明
    motive: str             # 动机（如果是嫌疑人）
    knowledge: List[str]     # 角色知道的信息
    character_type: CharacterType
    is_guilty: bool = False  # 是否是真凶
    stress_level: int = 0    # 压力值（影响回答）
    trust_level: int = 50    # 对侦探的信任度

@dataclass
class Evidence:
    """证据"""
    name: str
    description: str
    location: str
    evidence_type: EvidenceType
    significance: str
    discovered: bool = False
    
    # 简化的证据属性
    known_by: List[str] = None  # 知道这个证据的角色名单
    
    def __post_init__(self):
        if self.known_by is None:
            self.known_by = []
    
    def is_known_by(self, character_name: str) -> bool:
        """检查角色是否知道这个证据"""
        return character_name in self.known_by

@dataclass
class Case:
    """案件"""
    title: str
    description: str
    victim_name: str
    crime_scene: str
    time_of_crime: str
    characters: List[Character]
    evidence: List[Evidence]
    solution: str            # 案件真相
    key_clues: List[str]     # 关键线索
    category: CaseCategory   # 案件分类
    difficulty: CaseDifficulty = CaseDifficulty.MEDIUM  # 案件难度，默认中等

@dataclass
class Accusation:
    """指控"""
    accused: Character
    accuser_reasoning: str
    accused_defense: str = ""
    witness_testimonies: Optional[List[tuple]] = None  # (角色, 证词)
    votes: Optional[List[tuple]] = None  # (角色, 投票结果, 投票理由)
    vote_summary: Optional[dict] = None  # 投票统计 {"support": 数量, "oppose": 数量, "total": 总数}
    final_verdict: bool = False
    
    def __post_init__(self):
        if self.witness_testimonies is None:
            self.witness_testimonies = []
        if self.votes is None:
            self.votes = []
        if self.vote_summary is None:
            self.vote_summary = {"support": 0, "oppose": 0, "total": 0} 