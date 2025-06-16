from typing import List
from .models import Case, Character, Evidence, CharacterType, EvidenceType, CaseCategory, CaseDifficulty

CASES = [
        Case(
            title="豪宅谋杀案",
            description="深夜的豪宅中传来一声闷响，随后便是死一般的寂静...当管家推开书房门时，眼前的景象让他瞬间僵住：富商李明倒在血泊中，头部遭受致命重击。更诡异的是，房间门窗从内部紧锁，仿佛死神亲自造访。在这个看似和睦的家庭中，究竟隐藏着怎样的秘密？是贪婪的妻子、叛逆的儿子，还是忠诚的下属？每个人都有不为人知的一面，每个人都可能是凶手...",
            victim_name="李明",
            crime_scene="李明豪宅书房",
            time_of_crime="昨晚10点30分左右",
            category=CaseCategory.FAMILY_DRAMA,
            difficulty=CaseDifficulty.MEDIUM,
            characters=[
                Character(
                    name="李明",
                    age=45,
                    occupation="房地产开发商",
                    personality="性格强势，在商场上手段狠辣，但在家庭关系上处理不当",
                    background="白手起家的成功商人，经营多家房地产公司，身家过亿。近年来工作繁忙，与家人相处时间减少，家庭关系出现一些问题。",
                    secret="在商业上有一些见不得光的手段，同时家庭关系处理不当，让家人感到失望",
                    alibi="死者，无法提供不在场证明",
                    motive="作为受害者，无作案动机",
                    knowledge=["家庭内部的所有秘密", "商业伙伴的情况", "妻子和儿子的真实想法"],
                    character_type=CharacterType.VICTIM
                ),
                Character(
                    name="王美丽",
                    age=35,
                    occupation="妻子",
                    personality="表面温柔贤惠，实则心机深沉，善于伪装和操控他人情绪",
                    background="嫁给李明5年，曾经恩爱甜蜜，但近年来夫妻关系出现问题。对家庭财务状况比较关心，希望维护家庭稳定。",
                    secret="最近遇到了一些家庭问题，内心承受着巨大压力，对未来感到不安",
                    alibi="声称10点后一直在厨房准备夜宵，期间没有离开过",
                    motive="复杂的家庭情感纠纷，既有愤怒也有不甘",
                    knowledge=["家庭财产状况", "保险箱密码", "当晚每个人的大致位置", "最近家庭的一些变化"],
                    character_type=CharacterType.SUSPECT,
                    is_guilty=True
                ),
                Character(
                    name="李小华",
                    age=28,
                    occupation="儿子",
                    personality="叛逆冲动，但内心还有良知。说话直接，不善于掩饰情绪",
                    background="大学毕业后无所事事，与父亲关系恶劣，经常因为钱发生争吵。最近遇到了一些经济困难，压力很大。",
                    secret="最近遇到了严重的经济困难，急需大笔资金解决问题，但不敢告诉家人具体情况",
                    alibi="声称晚上9点后一直在房间打游戏，但中途确实出来过几次",
                    motive="急需大笔资金解决个人问题",
                    knowledge=["父亲的脾气和习惯", "家里的布局和作息", "10点25分左右听到书房传来争吵声", "10点30分左右听到重物倒地声", "王美丽最近行为很奇怪，经常偷偷打电话"],
                    character_type=CharacterType.SUSPECT
                ),
                Character(
                    name="张秘书",
                    age=26,
                    occupation="私人秘书",
                    personality="表面专业谨慎，内心情感复杂。观察力敏锐，善于察言观色",
                    background="名牌大学毕业，为李明工作3年。工作能力强深受信任，对老板有着复杂的情感。知道很多家庭内部秘密。",
                    secret="对老板有着复杂的个人情感，既敬业又有个人想法，内心经常感到矛盾",
                    alibi="声称晚上一直在客厅整理明天的工作文件，10点15分左右去厨房倒水时听到书房有动静",
                    motive="复杂的情感纠葛，对家庭现状有自己的看法",
                    knowledge=["李明的工作安排和秘密", "王美丽最近的一些异常行为", "10点15分听到书房有动静", "10点35分看到王美丽从洗手间出来，神色慌张", "家庭内部的一些文件情况"],
                    character_type=CharacterType.SUSPECT
                ),
                Character(
                    name="刘管家",
                    age=55,
                    occupation="管家",
                    personality="忠诚老实，但有强烈的道德观念。说话谨慎，但内心正义感很强",
                    background="在李家工作15年，从李小华小时候就照顾这个家。视李家为自己的家，对家庭的变化感到担忧。",
                    secret="知道家庭内部的很多秘密，对最近的家庭氛围变化感到不安，内心很矛盾",
                    alibi="晚上在厨房和餐厅之间忙碌，准备宵夜和收拾餐具，11点左右去书房找李明汇报明日安排时发现尸体",
                    motive="对家庭现状的担忧和对某些行为的不满",
                    knowledge=["家庭15年来的变化", "所有人的日常习惯", "10点05分后王美丽就不在厨房了", "10点20分听到书房争吵声", "10点40分发现洗手间有异常", "11点发现李明尸体并立即报警"],
                    character_type=CharacterType.SUSPECT
                ),
                Character(
                    name="陈医生",
                    age=45,
                    occupation="法医",
                    personality="专业，客观，注重细节",
                    background="有20年法医经验，是李明的私人医生，当晚恰好在附近处理其他事务",
                    secret="无特殊秘密，但对李明家庭状况有所了解",
                    alibi="当晚11点接到刘管家电话后赶到现场，之前在附近的医院值班",
                    motive="无作案动机",
                    knowledge=["死亡时间推断：10点30分到45分之间", "死因：头部钝器重击", "现场门窗确实从内部锁闭", "血迹分析显示一次性致命打击"],
                    character_type=CharacterType.EXPERT
                )
            ],
            evidence=[
                # 第一层：动机证据
                Evidence(
                    name="离婚协议草稿",
                    description="在王美丽的包中发现离婚协议草稿，上面详细列出了财产分割方案",
                    location="王美丽包中",
                    evidence_type=EvidenceType.DOCUMENT,
                    significance="表明王美丽早有离婚打算，对财产分割有明确规划",
                    known_by=["张秘书"]  # 秘书整理文件时偶然看到
                ),
                Evidence(
                    name="出轨照片",
                    description="李明与年轻女子的亲密照片，拍摄时间显示为一周前",
                    location="王美丽手机中",
                    evidence_type=EvidenceType.DOCUMENT,
                    significance="王美丽掌握了丈夫出轨的确凿证据，这是强烈的作案动机",
                    known_by=["王美丽"]  # 只有她自己知道
                ),
                
                # 第二层：时间线证据
                Evidence(
                    name="神秘电话",
                    description="李明手机显示10点20分接到3分钟通话，来电显示为'老婆'",
                    location="受害者身上",
                    evidence_type=EvidenceType.DOCUMENT,
                    significance="证明王美丽在案发前主动联系了李明，与她声称的不知情矛盾",
                    known_by=["陈医生"]  # 法医检查手机时发现
                ),
                Evidence(
                    name="厨房监控时间",
                    description="厨房的时钟显示王美丽最后一次出现是10点05分，之后再无踪影",
                    location="厨房",
                    evidence_type=EvidenceType.PHYSICAL,
                    significance="与王美丽声称10点后一直在厨房的说法矛盾",
                    known_by=["刘管家"]  # 管家注意到厨房的异常
                ),
                
                # 第三层：物理证据
                Evidence(
                    name="血迹铜像",
                    description="书房铜像底座有血迹，经检验与受害者血型匹配，表面有擦拭痕迹",
                    location="书房",
                    evidence_type=EvidenceType.PHYSICAL,
                    significance="凶器被人故意清理过，说明凶手有反侦察意识",
                    known_by=["陈医生"]  # 法医发现擦拭痕迹
                ),
                Evidence(
                    name="女式拖鞋印",
                    description="书房地毯上发现女式拖鞋印，尺码约37码，花纹特殊",
                    location="书房",
                    evidence_type=EvidenceType.PHYSICAL,
                    significance="证明有女性进入过书房，需要与在场女性的鞋子比对",
                    known_by=["陈医生"]  # 法医仔细勘察发现
                ),
                Evidence(
                    name="保险箱密码",
                    description="保险箱被正确密码打开，没有暴力破解痕迹，现金被取走部分",
                    location="书房",
                    evidence_type=EvidenceType.PHYSICAL,
                    significance="凶手知道密码，说明是内部人员作案",
                    known_by=["王美丽", "刘管家"]  # 知道密码的人
                ),
                
                # 第四层：行为证据
                Evidence(
                    name="银行转账记录",
                    description="案发前三天，王美丽分批转移了500万资金到海外账户",
                    location="银行记录",
                    evidence_type=EvidenceType.DOCUMENT,
                    significance="表明王美丽早有预谋，提前转移财产",
                    known_by=["张秘书"]  # 秘书处理财务时发现异常
                ),
                Evidence(
                    name="清洁用品异常",
                    description="案发后发现洗手间的毛巾和清洁剂被大量使用，有血迹残留",
                    location="洗手间",
                    evidence_type=EvidenceType.PHYSICAL,
                    significance="凶手案发后进行了清理，试图销毁证据",
                    known_by=["刘管家"]  # 管家清理时发现异常
                )
            ],
            solution="王美丽是真凶。她发现丈夫出轨并掌握证据后，提前制定了谋杀计划。案发当晚，她主动打电话约李明到书房谈话，趁机用铜像将其击毙，然后清理现场并转移部分财产，伪造不在场证明。",
            key_clues=["出轨照片提供动机", "提前转移财产显示预谋", "电话记录证明主动约见", "时间线证明不在场证明虚假", "女式拖鞋印证明进入书房", "清洁用品异常显示事后清理"]
        ),
        
        Case(
            title="雪夜山庄密室杀人案",
            description="暴雪肆虐的深山中，一座孤立的山庄成了文学界朋友们的避难所。然而，当夜幕降临，恐怖也随之而来...一个戴着惨白面具的黑袍身影在窗外游荡，如同死神的使者。翌日清晨，才华横溢的女作家苏雅琴被发现死在密室中，房门从内反锁，窗户紧闭，没有任何人能够进出。这是超自然的诅咒，还是精心策划的完美犯罪？在这个与世隔绝的雪夜山庄里，每个人都有秘密，每个人都可能是凶手...",
            victim_name="苏雅琴",
            crime_scene="山庄二楼密室书房",
            time_of_crime="昨夜11点45分左右",
            category=CaseCategory.LOCKED_ROOM,
            difficulty=CaseDifficulty.HARD,
            characters=[
                Character(
                    name="赵文轩",
                    age=42,
                    occupation="知名小说家",
                    personality="表面儒雅温和，实则内心阴暗，善于隐藏真实情感。对文学创作极其执着",
                    background="成名作家，但近年来创作陷入瓶颈。与苏雅琴曾是大学同窗，两人在文学创作上既是朋友又是竞争对手。",
                    secret="过去在文学创作上有一些不光彩的经历，一直担心被人发现，最近压力很大",
                    alibi="声称11点30分后一直在一楼客厅与大家聊天，但中途确实离开过一段时间",
                    motive="害怕过去的秘密被揭露，同时对苏雅琴的才华感到嫉妒",
                    knowledge=["山庄的所有房间布局", "苏雅琴的作息习惯", "密室的基本构造", "文学圈内的一些秘密"],
                    character_type=CharacterType.SUSPECT,
                    is_guilty=True
                ),
                Character(
                    name="苏雅琴",
                    age=38,
                    occupation="女作家",
                    personality="才华横溢但性格直率，不善于人际关系，对文学有纯粹的热爱",
                    background="新锐女作家，作品深受好评但商业成功有限。与赵文轩是大学同学，对文学界的一些现象有自己的看法。",
                    secret="掌握着一些文学圈内的重要信息，准备在合适的时候公开，为文学界正名",
                    alibi="死者，无法提供不在场证明",
                    motive="作为受害者，动机是维护文学界的纯洁性",
                    knowledge=["文学圈内的各种秘密", "一些重要的证据材料", "自己的正义计划"],
                    character_type=CharacterType.VICTIM
                ),
                Character(
                    name="钱编辑",
                    age=35,
                    occupation="出版社编辑",
                    personality="精明能干，商业嗅觉敏锐，但有时为了利益会妥协原则",
                    background="知名出版社的资深编辑，负责赵文轩和苏雅琴的作品出版。深知两人的关系，也了解文学圈的内幕。",
                    secret="对文学圈的一些问题早有察觉，但因为商业考虑选择了沉默，内心很矛盾",
                    alibi="声称11点后一直在房间里修改稿件，但房间隔音不好，听到了楼下的动静",
                    motive="担心某些真相曝光会影响出版社的利益和自己的职业生涯",
                    knowledge=["两人的创作风格差异", "出版界的一些内幕", "11点45分听到楼上有异响", "看到有人神色慌张地从楼上下来"],
                    character_type=CharacterType.SUSPECT
                ),
                Character(
                    name="林助理",
                    age=28,
                    occupation="赵文轩的助理",
                    personality="忠诚但天真，对老板崇拜有加，不愿相信他会做坏事",
                    background="文学专业毕业，一直梦想成为作家。非常崇拜赵文轩，为他工作两年来尽心尽力。",
                    secret="无意中发现了一些可疑的情况，但不敢深究。当晚注意到老板行为有些异常",
                    alibi="11点30分后在厨房准备夜宵，但中途去过二楼找赵文轩汇报明天的行程安排",
                    motive="无直接作案动机，但可能为了保护老板而隐瞒一些情况",
                    knowledge=["赵文轩的日常习惯", "山庄的基本布局", "11点40分左右在二楼走廊看到可疑情况", "发现密室门锁有异常"],
                    character_type=CharacterType.SUSPECT
                ),
                Character(
                    name="老王",
                    age=60,
                    occupation="山庄管理员",
                    personality="朴实憨厚，但观察力敏锐，对山庄的一切都了如指掌",
                    background="在山庄工作十多年，熟悉每一个房间的构造。为人正直，不喜欢城里人的勾心斗角。",
                    secret="知道山庄的一些建筑秘密，但从未告诉过客人。当晚注意到有人在深夜活动",
                    alibi="11点后在一楼值夜班，负责检查门窗和供暖设备，12点发现苏雅琴的尸体并报警",
                    motive="无作案动机，但可能因为不了解情况而提供不准确的信息",
                    knowledge=["山庄所有房间的构造", "建筑的一些特殊设计", "11点50分听到二楼有奇怪声音", "发现现场时门窗确实从内部锁死"],
                    character_type=CharacterType.SUSPECT
                ),
                Character(
                    name="张警官",
                    age=45,
                    occupation="刑警",
                    personality="经验丰富，逻辑思维强，注重证据和细节",
                    background="从事刑侦工作20年，处理过多起复杂案件。因暴雪被困在附近，接到报案后立即赶到现场。",
                    secret="无特殊秘密，但对文学界的内幕不太了解",
                    alibi="接到报案后从镇上赶来，凌晨1点到达现场开始勘察",
                    motive="无作案动机",
                    knowledge=["死亡时间推断：11点45分左右", "死因：颈部被锐器割断", "现场确实是密室状态", "发现了一些可疑的痕迹"],
                    character_type=CharacterType.EXPERT
                )
            ],
            evidence=[
                # 第一层：动机证据
                Evidence(
                    name="剽窃证据档案",
                    description="苏雅琴房间发现一个文件夹，内含十年前的原始手稿、邮件往来和创作时间记录",
                    location="苏雅琴房间",
                    evidence_type=EvidenceType.DOCUMENT,
                    significance="证明赵文轩确实剽窃了苏雅琴的作品，这是强烈的杀人动机",
                    known_by=["钱编辑"]  # 编辑协助整理过这些材料
                ),
                Evidence(
                    name="威胁短信",
                    description="苏雅琴手机中发现赵文轩发送的短信：'有些事情最好永远埋在心里'",
                    location="受害者手机",
                    evidence_type=EvidenceType.DOCUMENT,
                    significance="表明赵文轩知道苏雅琴掌握证据，并试图威胁她保持沉默",
                    known_by=["张警官"]  # 警官检查手机时发现
                ),
                
                # 第二层：伪装证据
                Evidence(
                    name="白色面具和黑袍",
                    description="在赵文轩房间的衣柜深处发现白色面具和黑袍，上面有血迹残留",
                    location="赵文轩房间",
                    evidence_type=EvidenceType.PHYSICAL,
                    significance="证明神秘人影是赵文轩伪装的，用来制造外部入侵的假象",
                    known_by=["张警官"]  # 警官搜查时发现
                ),
                Evidence(
                    name="假体填充物",
                    description="在黑袍内发现大量填充物，可以伪装成更魁梧的身材",
                    location="赵文轩房间",
                    evidence_type=EvidenceType.PHYSICAL,
                    significance="赵文轩通过改变体型来误导目击者，制造不是自己作案的假象",
                    known_by=["张警官"]  # 与面具一起发现
                ),
                
                # 第三层：密室诡计证据
                Evidence(
                    name="秘密通道机关",
                    description="密室书房的书架后发现一个隐藏通道，可以通往隔壁房间",
                    location="密室书房",
                    evidence_type=EvidenceType.PHYSICAL,
                    significance="凶手利用秘密通道进出密室，制造不可能犯罪的假象",
                    known_by=["老王"]  # 管理员知道这个秘密
                ),
                Evidence(
                    name="自动锁定装置",
                    description="密室门上发现精巧的延时锁定机关，可以在人离开后自动锁门",
                    location="密室门",
                    evidence_type=EvidenceType.PHYSICAL,
                    significance="凶手预先设置机关，确保离开后房间自动锁死，伪造密室现场",
                    known_by=["张警官"]  # 警官仔细检查门锁时发现
                ),
                
                # 第四层：时间线证据
                Evidence(
                    name="监控时间记录",
                    description="山庄大厅的时钟显示11点42分时有人影快速经过，身形与赵文轩相符",
                    location="大厅",
                    evidence_type=EvidenceType.PHYSICAL,
                    significance="证明赵文轩在关键时间离开了客厅，与他的不在场证明矛盾",
                    known_by=["老王"]  # 管理员注意到时钟异常
                ),
                Evidence(
                    name="血迹清理痕迹",
                    description="在通往密室的秘密通道中发现清理过的血迹和毛发",
                    location="秘密通道",
                    evidence_type=EvidenceType.PHYSICAL,
                    significance="凶手作案后匆忙清理现场，但留下了痕迹",
                    known_by=["张警官"]  # 警官用专业设备检测发现
                ),
                
                # 第五层：心理证据
                Evidence(
                    name="创作风格分析",
                    description="文学专家分析显示，赵文轩成名作的写作风格与其他作品存在明显差异",
                    location="文学作品",
                    evidence_type=EvidenceType.DOCUMENT,
                    significance="从专业角度证实了剽窃行为，支持苏雅琴的指控",
                    known_by=["钱编辑"]  # 编辑的专业判断
                ),
                Evidence(
                    name="精神状态异常",
                    description="案发后赵文轩表现出明显的心理压力症状，多次自相矛盾",
                    location="现场观察",
                    evidence_type=EvidenceType.BEHAVIORAL,
                    significance="心理压力暴露了他的内疚感和恐惧感",
                    known_by=["张警官", "林助理"]  # 多人观察到异常
                )
            ],
            solution="赵文轩是真凶。他因害怕剽窃丑闻曝光而预谋杀害苏雅琴。案发当晚，他先伪装成神秘人影制造恐慌，然后利用对山庄构造的了解，通过秘密通道进入密室杀害苏雅琴，再设置自动锁定机关制造密室假象，最后清理痕迹并销毁伪装道具。整个计划精心策划，但最终被细致的证据链条揭露。",
            key_clues=["剽窃证据提供杀人动机", "威胁短信显示预谋", "伪装道具证明制造假象", "秘密通道揭示密室诡计", "时间记录打破不在场证明", "血迹痕迹暴露作案路径", "心理异常反映内疚恐惧"]
        ),
        
        Case(
            title="古宅傀儡师之谜",
            description="在这座百年古宅中，数百个精美木偶静静地注视着每一个访客，它们的眼神仿佛蕴含着古老的秘密...当收藏家陈志远的尸体被发现时，他正悬挂在展示厅中央，周围是无数根诡异的丝线，将他与木偶们连接在一起，仿佛他也成了某个傀儡师手中的玩物。更令人毛骨悚然的是，现场的木偶们似乎都在微笑，那种诡异的笑容让人不寒而栗。这是自杀，还是一场精心策划的复仇？在这个充满怨念的古宅中，过去的罪恶正在索取代价...",
            victim_name="陈志远",
            crime_scene="古宅木偶展示厅",
            time_of_crime="昨夜10点15分左右",
            category=CaseCategory.REVENGE,
            difficulty=CaseDifficulty.HARD,
            characters=[
                Character(
                    name="陈志远",
                    age=45,
                    occupation="古董收藏家",
                    personality="表面和善，实则贪婪狡诈，为了收藏品不择手段",
                    background="继承祖业的古董商，痴迷木偶收藏。在收藏界有一定声誉，但手段有时比较激进，曾经与一些人发生过纠纷。",
                    secret="过去在收藏过程中有一些不光彩的行为，伤害了一些人，一直隐瞒这段历史",
                    alibi="死者，无法提供不在场证明",
                    motive="作为受害者，过去的行为成为被报复的原因",
                    knowledge=["木偶的真实价值", "古宅的机关设计", "过去的一些纠纷"],
                    character_type=CharacterType.VICTIM
                ),
                Character(
                    name="马克",
                    age=35,
                    occupation="外国艺术商",
                    personality="表面友善热情，实则内心充满复杂情感，善于隐藏真实想法",
                    background="自称来华寻找艺术品的外国商人，对中国古董文化很有研究，特别关注木偶艺术的历史。",
                    secret="真实身份和来华目的并不简单，与陈志远有着深层的个人恩怨",
                    alibi="声称10点后一直在客房整理明天的商务资料，但行为有些可疑",
                    motive="与陈志远有着深仇大恨，要让他付出代价",
                    knowledge=["古宅的所有机关", "木偶操控技术", "陈志远的作息习惯", "复仇的详细计划"],
                    character_type=CharacterType.SUSPECT,
                    is_guilty=True
                ),
                Character(
                    name="孙师傅",
                    age=58,
                    occupation="木偶修复师",
                    personality="技艺精湛，为人正直，但对过去的不公愤愤不平",
                    background="在陈家工作20年的木偶修复师，见证了陈志远的种种行为。对古董收藏界的一些现象深感不满。",
                    secret="知道陈志远过去的一些恶行，也了解马克的真实情况，但选择了沉默",
                    alibi="晚上在工作室修复木偶，10点30分听到展示厅有异响，但没有立即查看",
                    motive="对陈志远的某些行为感到愤怒，同情受害者的遭遇",
                    knowledge=["所有木偶的机关原理", "古宅的历史和构造", "马克的一些情况", "过去发生的一些事件"],
                    character_type=CharacterType.SUSPECT
                ),
                Character(
                    name="李秘书",
                    age=30,
                    occupation="私人秘书",
                    personality="工作认真，但胆小怕事，容易被恐吓",
                    background="为陈志远工作3年，负责古董交易的文书工作。不太了解老板过去的详细情况，但察觉到最近气氛异常。",
                    secret="无意中发现了一些可疑的文件和照片，但不敢深究。当晚看到了奇怪的现象",
                    alibi="10点后在书房整理账目，听到展示厅传来奇怪的声音，但太害怕不敢查看",
                    motive="无作案动机，但可能因恐惧而隐瞒重要信息",
                    knowledge=["陈志远的商业往来", "最近的异常情况", "听到的可疑声音", "看到的奇怪现象"],
                    character_type=CharacterType.SUSPECT
                ),
                Character(
                    name="王管家",
                    age=52,
                    occupation="管家",
                    personality="忠诚但迂腐，严格按规矩办事，对主人言听计从",
                    background="在陈家工作15年，对陈志远忠心耿耿。知道一些家族秘密，但从不多嘴。",
                    secret="知道古宅有很多机关和秘密通道，也隐约知道一些过去的事情，但选择忠于主人",
                    alibi="10点15分去展示厅找陈志远汇报明日安排，发现尸体并立即报警",
                    motive="无作案动机，但可能为了保护主人名誉而隐瞒一些真相",
                    knowledge=["古宅的所有秘密", "陈志远的日常习惯", "发现尸体时的现场情况", "家族的一些历史"],
                    character_type=CharacterType.SUSPECT
                ),
                Character(
                    name="刘警官",
                    age=40,
                    occupation="刑警",
                    personality="经验丰富，善于观察细节，不轻信表面现象",
                    background="从事刑侦工作15年，擅长处理复杂案件。对民俗传说和机械诡计都有研究。",
                    secret="无特殊秘密，但对案件的超自然现象保持怀疑态度",
                    alibi="接到报案后立即赶到现场，开始勘察和调查",
                    motive="无作案动机",
                    knowledge=["死亡时间和死因分析", "现场机关的工作原理", "各种物证的科学解释", "案件的逻辑推理"],
                    character_type=CharacterType.EXPERT
                )
            ],
            evidence=[
                Evidence(
                    name="复仇计划书",
                    description="在马克房间发现详细的复仇计划，包括陈志远的作息时间和古宅机关图",
                    location="马克房间",
                    evidence_type=EvidenceType.DOCUMENT,
                    significance="证明马克早有预谋，这是精心策划的复仇行动",
                    known_by=["刘警官"]
                ),
                Evidence(
                    name="身份证明文件",
                    description="马克的真实身份证件显示其原名陈小雨，与十年前的孤儿案件相关",
                    location="马克随身物品",
                    evidence_type=EvidenceType.DOCUMENT,
                    significance="揭露马克的真实身份和复仇动机",
                    known_by=["刘警官"]
                ),
                Evidence(
                    name="傀儡操控装置",
                    description="展示厅天花板发现精密的滑轮和钢丝系统，可以远程操控木偶和尸体",
                    location="展示厅天花板",
                    evidence_type=EvidenceType.PHYSICAL,
                    significance="揭示密室上吊的机械诡计原理",
                    known_by=["孙师傅", "刘警官"]
                ),
                Evidence(
                    name="遥控器",
                    description="在马克房间发现可以控制展示厅机关的遥控装置",
                    location="马克房间",
                    evidence_type=EvidenceType.PHYSICAL,
                    significance="证明马克可以远程操控现场，制造超自然假象",
                    known_by=["刘警官"]
                ),
                Evidence(
                    name="妹妹的遗书",
                    description="马克保存的妹妹陈小月的遗书，详述了被陈志远迫害的经过",
                    location="马克随身物品",
                    evidence_type=EvidenceType.DOCUMENT,
                    significance="提供了复仇的直接动机和当年事件的真相",
                    known_by=["马克", "刘警官"]
                ),
                Evidence(
                    name="木偶丝线痕迹",
                    description="在陈志远颈部发现细微的丝线勒痕，与展示厅的钢丝材质相同",
                    location="受害者身上",
                    evidence_type=EvidenceType.PHYSICAL,
                    significance="证明死者是被钢丝勒死后伪造成上吊",
                    known_by=["刘警官"]
                ),
                Evidence(
                    name="时间差记录",
                    description="机关装置的计时器显示在10点12分启动，比发现尸体时间早3分钟",
                    location="机关装置",
                    evidence_type=EvidenceType.PHYSICAL,
                    significance="证明凶手预先设置了延时装置，制造不在场证明",
                    known_by=["刘警官"]
                ),
                Evidence(
                    name="古董交易记录",
                    description="十年前的交易记录显示陈志远以极低价格强制收购孤儿姐妹的祖传木偶",
                    location="陈志远书房",
                    evidence_type=EvidenceType.DOCUMENT,
                    significance="证实了当年的迫害事件，为复仇提供了正当理由",
                    known_by=["孙师傅", "刘警官"]
                ),
                Evidence(
                    name="监控录像",
                    description="古宅监控显示马克在案发前曾多次秘密勘察展示厅的机关位置",
                    location="监控系统",
                    evidence_type=EvidenceType.DOCUMENT,
                    significance="证明马克提前踩点，熟悉现场环境和机关操作",
                    known_by=["刘警官"]
                )
            ],
            solution="马克（真名陈小雨）是真凶。她是十年前被陈志远迫害的孤儿姐姐，妹妹因无法承受失去祖传木偶而自杀。马克改名换姓，以外国商人身份接近陈志远，利用对古宅机关的了解，设计了精密的傀儡操控装置。她先用钢丝勒死陈志远，然后通过遥控装置操控机关，将尸体吊起制造上吊假象，借助木偶和丝线营造超自然氛围掩盖谋杀真相。",
            key_clues=["身份证明揭露真实动机", "妹妹遗书提供复仇理由", "傀儡装置揭示诡计原理", "遥控器证明远程操控", "丝线痕迹暴露真实死因", "时间差显示预设机关", "监控录像证明踩点行为"]
        ),
        
        Case(
            title="古寺水龙传说杀人案",
            description="千年古刹龙泉寺，瀑布轰鸣如龙吟...传说中，水龙会在月黑风高之夜降临，惩罚那些玷污佛门净土的恶人。当慧明法师的尸体在高塔密室中被发现时，现场的景象让所有人毛骨悚然：墙壁破裂如被巨力撞击，地面积水未干，空气中弥漫着诡异的水汽。这一切都与古老传说中'水龙破壁入室，卷恶人而去'的恐怖预言完全吻合。是神灵的审判，还是人间的复仇？在这座充满神秘色彩的古寺中，真相比传说更加扑朔迷离...",
            victim_name="慧明法师",
            crime_scene="龙泉寺高塔密室",
            time_of_crime="昨夜凌晨2点30分左右",
            category=CaseCategory.SUPERNATURAL,
            difficulty=CaseDifficulty.EXPERT,
            characters=[
                Character(
                    name="慧明法师",
                    age=55,
                    occupation="寺院主持",
                    personality="表面慈悲为怀，实则内心复杂，善于利用宗教地位",
                    background="担任龙泉寺主持15年，在信众中威望很高。但最近寺院财务出现问题，面临一些困难。",
                    secret="在寺院财务管理上有一些不当行为，最近面临被发现的危机",
                    alibi="死者，无法提供不在场证明",
                    motive="作为受害者，不当行为成为被杀害的原因",
                    knowledge=["寺院财务的真实状况", "高塔密室的构造", "水龙传说的详细内容"],
                    character_type=CharacterType.VICTIM
                ),
                Character(
                    name="释悟空",
                    age=42,
                    occupation="副主持",
                    personality="表面恭敬谦逊，内心正义感强烈，对师父的某些行为深感失望",
                    background="在龙泉寺修行20年，一直是慧明法师的得力助手。最近发现师父在财务管理上有问题，内心极度痛苦。",
                    secret="发现了慧明法师的不当行为，原本想劝说师父改正，但遭到拒绝，决定采取极端手段",
                    alibi="声称凌晨2点后一直在禅房打坐念经，但行踪有些可疑",
                    motive="为了维护佛门声誉，惩罚有问题的师父，同时利用传说掩盖真相",
                    knowledge=["寺院所有建筑的构造", "瀑布水流的规律", "高塔密室的特殊设计", "水龙传说的每个细节"],
                    character_type=CharacterType.SUSPECT,
                    is_guilty=True
                ),
                Character(
                    name="小沙弥明心",
                    age=22,
                    occupation="寺院僧人",
                    personality="纯真善良，对师父们崇敬有加，不愿相信佛门中有不当行为",
                    background="5年前来到龙泉寺出家，一直跟随慧明法师学习。对寺院的财务状况一无所知，单纯地相信师父们都是好人。",
                    secret="无意中看到过释悟空深夜在高塔附近活动，但不敢多问",
                    alibi="凌晨2点在厨房准备明日的斋饭，听到瀑布方向有异响但以为是水声",
                    motive="无作案动机，但可能因为保护师父而隐瞒信息",
                    knowledge=["寺院的日常作息", "各位师父的习惯", "听到的异常声音", "看到的可疑行为"],
                    character_type=CharacterType.SUSPECT
                ),
                Character(
                    name="李施主",
                    age=48,
                    occupation="虔诚信徒",
                    personality="迷信传统，对佛法深信不疑，容易被超自然现象影响判断",
                    background="十年来一直是龙泉寺的大施主，每年捐献大量香火钱。对慧明法师极其信任，不知道一些内情。",
                    secret="最近准备再次大额捐款，如果知道真相会非常愤怒",
                    alibi="当晚在客房休息，凌晨3点被异响惊醒，看到高塔方向有奇异光影",
                    motive="如果知道被欺骗的真相，可能有报复动机",
                    knowledge=["慧明法师的表面形象", "寺院的捐款情况", "水龙传说的民间版本", "看到的神秘现象"],
                    character_type=CharacterType.SUSPECT
                ),
                Character(
                    name="张工程师",
                    age=35,
                    occupation="水利工程师",
                    personality="理性务实，不信鬼神，善于分析水流和建筑结构",
                    background="受邀来寺院勘察瀑布对建筑的影响，对古建筑和水利工程都很精通。当晚借宿寺院。",
                    secret="发现高塔的建筑结构有人为改动的痕迹，但不确定用途",
                    alibi="凌晨2点还在房间研究建筑图纸，听到水流声异常但以为是瀑布涨水",
                    motive="无作案动机，但专业知识可能揭露诡计真相",
                    knowledge=["建筑结构的专业知识", "水流力学原理", "高塔改动的技术细节", "现场积水的成因分析"],
                    character_type=CharacterType.EXPERT
                ),
                Character(
                    name="王警官",
                    age=45,
                    occupation="刑警",
                    personality="经验丰富，不迷信，善于从科学角度分析超自然现象",
                    background="从事刑侦工作18年，处理过多起利用迷信作案的案件。对宗教场所的案件有丰富经验。",
                    secret="怀疑这起案件背后有经济纠纷，不相信水龙传说",
                    alibi="接到报案后立即赶到现场，开始科学勘察",
                    motive="无作案动机",
                    knowledge=["死亡时间和死因分析", "现场物理证据", "水流诡计的科学原理", "案件的逻辑推理"],
                    character_type=CharacterType.EXPERT
                )
            ],
            evidence=[
                # 第一层：动机证据
                Evidence(
                    name="贪污账目",
                    description="在慧明法师房间发现隐藏的账本，记录了挪用香火钱的详细情况",
                    location="慧明法师房间",
                    evidence_type=EvidenceType.DOCUMENT,
                    significance="证明慧明法师确实贪污了大量香火钱，这是强烈的杀人动机",
                    known_by=["释悟空"]  # 副主持发现了这个秘密
                ),
                Evidence(
                    name="投资亏损证明",
                    description="股票交易记录显示慧明法师用寺院资金炒股，亏损500万元",
                    location="慧明法师电脑",
                    evidence_type=EvidenceType.DOCUMENT,
                    significance="揭露贪污资金的去向，证明经济动机",
                    known_by=["王警官"]  # 警官调查时发现
                ),
                
                # 第二层：诡计证据
                Evidence(
                    name="墙壁凿孔痕迹",
                    description="高塔密室墙壁发现精确的凿孔痕迹，孔洞大小刚好能引入瀑布水流",
                    location="高塔密室墙壁",
                    evidence_type=EvidenceType.PHYSICAL,
                    significance="证明有人预先在墙壁上凿孔，为引水做准备",
                    known_by=["张工程师"]  # 工程师的专业眼光发现
                ),
                Evidence(
                    name="橡皮艇残片",
                    description="在密室角落发现橡皮艇的碎片，上面有绳索摩擦痕迹",
                    location="高塔密室",
                    evidence_type=EvidenceType.PHYSICAL,
                    significance="证明凶手使用橡皮艇在水中操作，将受害者吊上横梁",
                    known_by=["王警官"]  # 警官仔细搜查发现
                ),
                Evidence(
                    name="水位标记",
                    description="墙壁上发现明显的水位线，显示房间曾被水淹至1.5米高度",
                    location="高塔密室墙壁",
                    evidence_type=EvidenceType.PHYSICAL,
                    significance="证明房间确实曾经积水很深，支持水淹诡计理论",
                    known_by=["张工程师"]  # 工程师专业分析
                ),
                
                # 第三层：时间线证据
                Evidence(
                    name="水流控制装置",
                    description="在瀑布上游发现可以控制水流方向的简易闸门装置",
                    location="瀑布上游",
                    evidence_type=EvidenceType.PHYSICAL,
                    significance="证明有人可以人为控制瀑布水流，引导水进入密室",
                    known_by=["张工程师"]  # 工程师勘察时发现
                ),
                Evidence(
                    name="排水管道",
                    description="密室另一侧墙壁发现隐蔽的排水管道，可以快速排出积水",
                    location="高塔密室",
                    evidence_type=EvidenceType.PHYSICAL,
                    significance="解释了积水如何快速消失，完善了诡计的技术细节",
                    known_by=["张工程师"]  # 专业知识发现
                ),
                
                # 第四层：身份证据
                Evidence(
                    name="工程工具",
                    description="在释悟空房间发现专业的凿墙工具和防水设备",
                    location="释悟空房间",
                    evidence_type=EvidenceType.PHYSICAL,
                    significance="证明释悟空具备实施水淹诡计的工具和能力",
                    known_by=["王警官"]  # 警官搜查发现
                ),
                Evidence(
                    name="建筑图纸",
                    description="释悟空房间发现高塔的详细建筑图纸，标注了水流路径和改造方案",
                    location="释悟空房间",
                    evidence_type=EvidenceType.DOCUMENT,
                    significance="证明释悟空早有预谋，精心设计了整个诡计",
                    known_by=["王警官"]  # 与工具一起发现
                ),
                
                # 第五层：心理证据
                Evidence(
                    name="忏悔日记",
                    description="释悟空的日记记录了发现师父贪污后的痛苦挣扎和复仇决心",
                    location="释悟空房间",
                    evidence_type=EvidenceType.DOCUMENT,
                    significance="揭露释悟空的内心世界和杀人动机的形成过程",
                    known_by=["王警官"]  # 警官深入调查发现
                ),
                Evidence(
                    name="水龙传说研究",
                    description="释悟空收集的大量水龙传说资料，详细分析如何利用传说掩盖犯罪",
                    location="释悟空房间",
                    evidence_type=EvidenceType.DOCUMENT,
                    significance="证明释悟空故意利用迷信传说来误导调查方向",
                    known_by=["王警官"]  # 与其他证据一起发现
                )
            ],
            solution="释悟空是真凶。他发现师父慧明法师贪污香火钱后，决定用极端手段维护佛门清净。他精心设计了水淹密室诡计：深夜在高塔墙壁凿孔，利用瀑布水流灌满房间，乘橡皮艇将已被勒死的慧明法师吊上横梁，然后打开排水管道快速排水，破坏墙壁制造'水龙破壁'的假象。整个过程完美对应水龙传说，利用迷信心理掩盖谋杀真相。",
            key_clues=["贪污账目提供杀人动机", "凿孔痕迹揭示引水方法", "橡皮艇证明水中操作", "水位标记证实积水事实", "控制装置显示人为操控", "排水管道解释水流消失", "工程工具证明作案能力", "建筑图纸显示预谋计划", "忏悔日记暴露内心动机", "传说研究证明故意误导"]
        ),
        
        # 适合小朋友的推理案例
        Case(
            title="失踪的小猫咪",
            description="阳光小学里发生了一件让所有人都担心的事情！校园里最受欢迎的小明星——白色小猫咪'雪球'神秘失踪了！平时总是在花坛边懒洋洋晒太阳的雪球，今天早上竟然不见了踪影。它会去哪里呢？是被什么好玩的东西吸引走了，还是遇到了什么麻烦？同学们都很着急，老师们也在到处寻找。你能帮助大家找到可爱的雪球吗？这个温馨的小谜团等待着小侦探们来解开！",
            victim_name="雪球（小猫咪）",
            crime_scene="阳光小学校园",
            time_of_crime="今天早上7点到8点之间",
            category=CaseCategory.KIDS_FRIENDLY,
            difficulty=CaseDifficulty.EASY,
            characters=[
                Character(
                    name="雪球",
                    age=2,
                    occupation="校园小猫",
                    personality="温顺可爱，喜欢晒太阳，很聪明会找食物",
                    background="在学校生活了一年，是所有师生的宠物。平时喜欢在花坛边晒太阳，偶尔会去食堂附近找食物",
                    secret="其实很好奇，喜欢探索新地方，但从不离开学校太远",
                    alibi="失踪者，无法提供证明",
                    motive="作为失踪者，可能是被什么吸引走了",
                    knowledge=["学校的每个角落", "哪里有好吃的", "哪里最温暖"],
                    character_type=CharacterType.VICTIM
                ),
                Character(
                    name="小明",
                    age=8,
                    occupation="三年级学生",
                    personality="活泼好动，很喜欢小动物，观察力强",
                    background="班级的班长，每天最早到学校。很喜欢雪球，经常带小鱼干给它吃",
                    secret="昨天放学时看到雪球跟着一个陌生人走向学校后门，但没有告诉老师",
                    alibi="今天7点30分到校，发现雪球不在花坛边就开始到处找",
                    motive="非常担心雪球，想要找到它",
                    knowledge=["雪球的生活习惯", "昨天看到的可疑情况", "学校的各个角落", "雪球最喜欢的食物"],
                    character_type=CharacterType.SUSPECT
                ),
                Character(
                    name="李老师",
                    age=35,
                    occupation="语文老师",
                    personality="温柔耐心，关心学生和小动物，做事细心",
                    background="在学校工作5年，很喜欢雪球。负责管理学校的小花园，经常照顾雪球",
                    secret="昨天下午发现雪球有点不舒服，想带它去看兽医，但雪球跑掉了",
                    alibi="今天早上7点到校准备上课，发现雪球不见了很着急",
                    motive="担心雪球的健康和安全",
                    knowledge=["雪球的健康状况", "学校的管理制度", "昨天雪球的异常行为", "可能的藏身地点"],
                    character_type=CharacterType.SUSPECT
                ),
                Character(
                    name="张大爷",
                    age=65,
                    occupation="学校保安",
                    personality="和蔼可亲，责任心强，对学校的一切都很了解",
                    background="在学校当保安10年，见证了雪球从小猫长大。每天负责开关校门，巡视校园",
                    secret="昨天晚上巡逻时发现学校后门的栅栏有个小洞，可能是雪球钻出去的",
                    alibi="昨晚值夜班，今天早上6点交班，没有看到雪球",
                    motive="希望找到雪球，确保学校安全",
                    knowledge=["学校的安全情况", "校园的每个角落", "栅栏的破洞", "昨晚的巡逻情况"],
                    character_type=CharacterType.SUSPECT
                ),
                Character(
                    name="王阿姨",
                    age=45,
                    occupation="食堂工作人员",
                    personality="热心肠，喜欢小动物，做饭很香",
                    background="在学校食堂工作3年，经常给雪球留一些小鱼和肉。知道雪球的饮食喜好",
                    secret="今天早上准备了雪球最爱的小鱼，放在食堂后门想引它过来",
                    alibi="早上6点30分到食堂准备早餐，一直在厨房忙碌",
                    motive="想要照顾雪球，给它好吃的",
                    knowledge=["雪球的饮食习惯", "食堂周围的情况", "准备的食物", "雪球平时的活动路线"],
                    character_type=CharacterType.SUSPECT
                ),
                Character(
                    name="陈校长",
                    age=50,
                    occupation="小学校长",
                    personality="严谨负责，关心师生，善于分析问题",
                    background="管理学校多年，对校园安全很重视。虽然表面严肃，但其实很喜欢雪球",
                    secret="无特殊秘密，但担心雪球走失会影响学校声誉",
                    alibi="今天8点到校，听说雪球失踪后立即组织寻找",
                    motive="希望尽快找到雪球，维护学校的和谐氛围",
                    knowledge=["学校的整体情况", "安全管理制度", "寻找的组织方案", "校园的布局"],
                    character_type=CharacterType.EXPERT
                )
            ],
            evidence=[
                # 第一层：行踪证据
                Evidence(
                    name="小鱼干包装",
                    description="在学校后门附近发现了小鱼干的包装袋，是雪球最喜欢的牌子",
                    location="学校后门",
                    evidence_type=EvidenceType.PHYSICAL,
                    significance="说明有人用食物引导雪球到后门附近",
                    known_by=["小明"]  # 小明经常买这个牌子给雪球
                ),
                Evidence(
                    name="栅栏破洞",
                    description="学校后门的栅栏下方有一个刚好够小猫钻过的洞",
                    location="学校后门栅栏",
                    evidence_type=EvidenceType.PHYSICAL,
                    significance="雪球可能从这里离开了学校",
                    known_by=["张大爷"]  # 保安发现的
                ),
                Evidence(
                    name="白色猫毛",
                    description="在栅栏洞口发现了几根白色的猫毛",
                    location="栅栏洞口",
                    evidence_type=EvidenceType.PHYSICAL,
                    significance="证明雪球确实从这里通过了",
                    known_by=["陈校长"]  # 校长仔细检查发现
                ),
                
                # 第二层：时间线证据
                Evidence(
                    name="食堂的小鱼",
                    description="王阿姨在食堂后门放了雪球最爱的小鱼，但没有被吃掉",
                    location="食堂后门",
                    evidence_type=EvidenceType.PHYSICAL,
                    significance="说明雪球今天早上没有去食堂，可能已经离开学校",
                    known_by=["王阿姨"]  # 她准备的食物
                ),
                Evidence(
                    name="花坛的脚印",
                    description="雪球平时最爱的花坛边有新鲜的脚印，但不是雪球的爪印",
                    location="学校花坛",
                    evidence_type=EvidenceType.PHYSICAL,
                    significance="有人昨天或今天早上来过这里，可能在寻找雪球",
                    known_by=["李老师"]  # 老师管理花坛
                ),
                
                # 第三层：目击证据
                Evidence(
                    name="陌生人目击",
                    description="昨天放学时有同学看到一个陌生人在学校附近，手里拿着猫粮",
                    location="学校门口",
                    evidence_type=EvidenceType.BEHAVIORAL,
                    significance="可能有人故意用食物引诱雪球",
                    known_by=["小明"]  # 小明看到的
                ),
                Evidence(
                    name="雪球的异常行为",
                    description="昨天下午雪球显得有些不安，不停地往学校后门方向看",
                    location="学校各处",
                    evidence_type=EvidenceType.BEHAVIORAL,
                    significance="雪球可能感觉到了什么，或者被什么吸引",
                    known_by=["李老师"]  # 老师观察到的
                ),
                
                # 第四层：关键线索
                Evidence(
                    name="邻居家的新猫窝",
                    description="学校隔壁的居民楼里，有人新买了猫窝和猫玩具",
                    location="学校附近居民楼",
                    evidence_type=EvidenceType.PHYSICAL,
                    significance="可能有人想要收养雪球，为它准备了新家",
                    known_by=["张大爷"]  # 保安巡逻时注意到
                ),
                Evidence(
                    name="爱心人士的联系方式",
                    description="在学校公告栏发现一张纸条，有人留言想要收养流浪猫",
                    location="学校公告栏",
                    evidence_type=EvidenceType.DOCUMENT,
                    significance="可能有好心人想要给雪球一个家",
                    known_by=["陈校长"]  # 校长管理公告栏
                )
            ],
            solution="雪球并没有真正'失踪'，而是被一位好心的爱心人士收养了。这位居民看到雪球在学校里生活，担心它的安全和健康，用小鱼干引导它到自己家里，给它准备了温暖的新家。虽然出发点是好的，但应该先和学校沟通。最终大家找到了雪球，它很健康快乐，学校和爱心人士达成协议，让雪球白天在学校，晚上回到温暖的家里。",
            key_clues=["小鱼干包装显示有人引导", "栅栏破洞是离开路径", "猫毛证明通过路径", "陌生人目击提供线索", "新猫窝显示收养意图", "爱心纸条揭示动机"]
        ),
        
        Case(
            title="消失的生日蛋糕",
            description="今天本该是小红最开心的日子——她的9岁生日！妈妈特意订制了一个超级漂亮的草莓蛋糕，粉红色的奶油上装饰着新鲜草莓，看起来就像童话里的公主蛋糕。可是当小红兴冲冲地放学回家，准备享受这个甜蜜时刻时，眼前的景象让她惊呆了：厨房桌上只剩下一个空空的蛋糕盒！蛋糕竟然神秘消失了！这是魔法吗？还是家里来了蛋糕小偷？快来帮助小红找到她的生日蛋糕，让这个特殊的日子重新充满欢声笑语吧！",
            victim_name="草莓生日蛋糕",
            crime_scene="小红家厨房",
            time_of_crime="今天下午1点到4点之间",
            category=CaseCategory.KIDS_FRIENDLY,
            difficulty=CaseDifficulty.EASY,
            characters=[
                Character(
                    name="小红",
                    age=9,
                    occupation="四年级学生",
                    personality="活泼开朗，喜欢甜食，有点急性子",
                    background="今天的生日女孩，早上上学前看到了漂亮的蛋糕，一整天都在期待放学后的生日派对",
                    secret="其实早上偷偷尝了一点蛋糕上的奶油，但没有告诉妈妈",
                    alibi="下午1点到4点在学校上课，4点15分才到家",
                    motive="想要找回自己的生日蛋糕",
                    knowledge=["蛋糕的样子和味道", "家里的布局", "家人的习惯", "早上偷尝奶油的事"],
                    character_type=CharacterType.VICTIM
                ),
                Character(
                    name="小红妈妈",
                    age=35,
                    occupation="会计",
                    personality="细心负责，很爱女儿，做事有条理",
                    background="为了女儿的生日精心准备，上午去蛋糕店取了蛋糕，下午要上班",
                    secret="其实买了两个蛋糕，一个放在厨房，另一个藏在卧室准备给小红惊喜",
                    alibi="下午1点到5点在公司上班，有同事可以证明",
                    motive="想要给女儿一个完美的生日",
                    knowledge=["蛋糕的购买情况", "家里的安排", "隐藏的惊喜蛋糕", "家人的时间安排"],
                    character_type=CharacterType.SUSPECT
                ),
                Character(
                    name="小红爸爸",
                    age=38,
                    occupation="程序员",
                    personality="幽默风趣，有时有点迷糊，很疼爱女儿",
                    background="在家工作，负责照看家里。平时喜欢开玩笑，有时会做一些小恶作剧逗女儿开心",
                    secret="为了给小红惊喜，把蛋糕藏到了地下室，准备晚上拿出来",
                    alibi="下午在家工作，但中途出去买了生日礼物",
                    motive="想要给女儿一个惊喜",
                    knowledge=["蛋糕的真实位置", "购买礼物的情况", "家里的秘密藏身处", "惊喜计划"],
                    character_type=CharacterType.SUSPECT,
                    is_guilty=True
                ),
                Character(
                    name="小黄（小狗）",
                    age=3,
                    occupation="家庭宠物",
                    personality="贪吃好动，很聪明，喜欢捣蛋",
                    background="小红家养的金毛犬，平时很乖但有时会偷吃东西。对甜食特别感兴趣",
                    secret="下午确实想吃蛋糕，但只是舔了舔盒子，没有吃到蛋糕",
                    alibi="下午一直在家里，在客厅和厨房之间活动",
                    motive="被蛋糕的香味吸引，想要尝一尝",
                    knowledge=["蛋糕的香味", "厨房的情况", "家里人的活动", "自己的行为"],
                    character_type=CharacterType.SUSPECT
                ),
                Character(
                    name="张奶奶",
                    age=70,
                    occupation="邻居",
                    personality="热心肠，喜欢小孩，有时记性不太好",
                    background="住在隔壁的邻居，经常来串门。很疼爱小红，知道今天是她的生日",
                    secret="下午确实来过，但只是送了生日礼物就走了，没有碰蛋糕",
                    alibi="下午2点左右来送生日礼物，待了半小时就回家了",
                    motive="想要祝小红生日快乐",
                    knowledge=["小红的生日", "家里的情况", "送礼物的经过", "下午的访问"],
                    character_type=CharacterType.SUSPECT
                ),
                Character(
                    name="李叔叔",
                    age=42,
                    occupation="侦探",
                    personality="观察力敏锐，逻辑思维强，善于分析",
                    background="小红爸爸的朋友，专业侦探。听说蛋糕失踪后来帮忙调查",
                    secret="通过观察很快发现了真相，但想让小红自己推理出来",
                    alibi="下午5点接到电话后赶来帮忙",
                    motive="帮助朋友解决问题，锻炼小红的推理能力",
                    knowledge=["侦探技巧", "观察到的线索", "推理方法", "案件的真相"],
                    character_type=CharacterType.EXPERT
                )
            ],
            evidence=[
                # 第一层：现场证据
                Evidence(
                    name="空蛋糕盒",
                    description="厨房桌上的蛋糕盒是空的，但盒子很干净，没有被破坏",
                    location="厨房桌子",
                    evidence_type=EvidenceType.PHYSICAL,
                    significance="蛋糕是被小心取出的，不是被偷吃或破坏的",
                    known_by=["李叔叔"]  # 侦探的专业观察
                ),
                Evidence(
                    name="奶油痕迹",
                    description="厨房台面上有少量奶油痕迹，但不多",
                    location="厨房台面",
                    evidence_type=EvidenceType.PHYSICAL,
                    significance="有人接触过蛋糕，但很小心",
                    known_by=["小红"]  # 小红发现的
                ),
                Evidence(
                    name="小黄的行为",
                    description="小黄一直在厨房附近转悠，显得很兴奋",
                    location="厨房周围",
                    evidence_type=EvidenceType.BEHAVIORAL,
                    significance="小黄闻到了蛋糕的味道，但表现不像偷吃了东西",
                    known_by=["张奶奶"]  # 奶奶下午来时观察到
                ),
                
                # 第二层：时间线证据
                Evidence(
                    name="爸爸的外出记录",
                    description="下午2点30分左右，爸爸开车出去了一趟，3点30分回来",
                    location="家门口",
                    evidence_type=EvidenceType.BEHAVIORAL,
                    significance="爸爸在关键时间段离开过家",
                    known_by=["张奶奶"]  # 奶奶看到的
                ),
                Evidence(
                    name="购物小票",
                    description="在爸爸的口袋里发现了下午的购物小票，买了生日礼物",
                    location="爸爸口袋",
                    evidence_type=EvidenceType.DOCUMENT,
                    significance="证明爸爸下午确实出去买东西了",
                    known_by=["小红妈妈"]  # 妈妈整理衣服时发现
                ),
                
                # 第三层：隐藏线索
                Evidence(
                    name="地下室的脚印",
                    description="地下室楼梯上有新鲜的脚印，平时很少有人下去",
                    location="地下室楼梯",
                    evidence_type=EvidenceType.PHYSICAL,
                    significance="有人最近去过地下室",
                    known_by=["李叔叔"]  # 侦探仔细搜查发现
                ),
                Evidence(
                    name="冰箱的异常",
                    description="地下室的小冰箱今天被打开过，里面比平时冷",
                    location="地下室冰箱",
                    evidence_type=EvidenceType.PHYSICAL,
                    significance="有人在地下室存放了什么东西",
                    known_by=["李叔叔"]  # 专业观察
                ),
                
                # 第四层：关键证据
                Evidence(
                    name="蛋糕的香味",
                    description="地下室里有淡淡的草莓蛋糕香味",
                    location="地下室",
                    evidence_type=EvidenceType.PHYSICAL,
                    significance="蛋糕很可能就在地下室",
                    known_by=["小红"]  # 小红鼻子灵敏
                ),
                Evidence(
                    name="惊喜计划纸条",
                    description="在爸爸的书桌上发现了写着生日惊喜计划的纸条",
                    location="爸爸书桌",
                    evidence_type=EvidenceType.DOCUMENT,
                    significance="爸爸策划了一个生日惊喜",
                    known_by=["小红妈妈"]  # 妈妈无意中看到
                )
            ],
            solution="蛋糕并没有真正消失，而是被爸爸藏在了地下室的冰箱里！爸爸想要给小红一个惊喜，计划在晚上生日派对时重新拿出蛋糕，配合他买的特殊生日礼物一起给小红惊喜。虽然让小红担心了一下午，但这是一个充满爱意的恶作剧。",
            key_clues=["空盒子显示小心取出", "爸爸外出时间吻合", "地下室脚印证明去向", "冰箱异常显示存放", "香味暴露位置", "计划纸条揭示动机"]
        ),
        
        Case(
            title="神秘的花园小偷",
            description="春暖花开的季节，阳光社区的花园变成了一个五彩斑斓的仙境！红玫瑰、黄郁金香、紫薰衣草...每一朵花都在阳光下绽放着最美的笑容。可是最近，一个神秘的'花朵大盗'出现了！每天早晨，总有居民发现自己精心照料的最美花朵不翼而飞，只留下光秃秃的花茎在风中摇摆。这个神秘小偷从不贪心，每次只取最美的那一朵，就像有魔法一样悄无声息。是调皮的小精灵在作怪，还是有人有着不为人知的秘密？快来揭开这个温馨花园里的小小谜团吧！",
            victim_name="花园里的美丽花朵",
            crime_scene="阳光社区花园",
            time_of_crime="最近一周，主要在早晨时间",
            category=CaseCategory.KIDS_FRIENDLY,
            difficulty=CaseDifficulty.EASY,
            characters=[
                Character(
                    name="花朵们",
                    age=1,
                    occupation="花园装饰",
                    personality="美丽芬芳，为大家带来快乐",
                    background="社区居民精心种植的各种花朵，有玫瑰、郁金香、向日葵等",
                    secret="其实很享受被欣赏和被需要的感觉",
                    alibi="无法移动，只能静静开放",
                    motive="作为受害者，希望能继续美化环境",
                    knowledge=["谁经常来看自己", "什么时候被采摘", "周围的环境变化"],
                    character_type=CharacterType.VICTIM
                ),
                Character(
                    name="小丽",
                    age=7,
                    occupation="一年级学生",
                    personality="天真可爱，喜欢美丽的东西，有时不太懂规则",
                    background="住在社区里的小女孩，每天上学路过花园。很喜欢花朵，经常停下来看",
                    secret="确实摘过几朵花，但是想送给生病的奶奶，让奶奶开心",
                    alibi="每天早上7点30分路过花园去上学",
                    motive="想要让生病的奶奶看到美丽的花朵，心情变好",
                    knowledge=["哪些花最漂亮", "奶奶的病情", "上学的路线", "摘花的时间"],
                    character_type=CharacterType.SUSPECT,
                    is_guilty=True
                ),
                Character(
                    name="王爷爷",
                    age=68,
                    occupation="退休工人",
                    personality="勤劳善良，喜欢园艺，有点固执",
                    background="社区花园的主要管理者，每天早上都来浇水施肥。对花园很有感情",
                    secret="有时会把一些快要凋谢的花摘下来，避免影响整体美观",
                    alibi="每天早上6点到8点在花园里工作",
                    motive="维护花园的整体美观，让所有花朵都健康成长",
                    knowledge=["每种花的生长情况", "花园的管理制度", "谁经常来花园", "花朵的护理方法"],
                    character_type=CharacterType.SUSPECT
                ),
                Character(
                    name="李阿姨",
                    age=45,
                    occupation="花店老板",
                    personality="热爱花朵，生意头脑灵活，但很有原则",
                    background="在社区附近开花店，也在花园里种了一些花。对各种花卉很了解",
                    secret="偶尔会从自己种的花中摘一些做花束，但从不碰别人的花",
                    alibi="每天早上在花店准备开业，偶尔来花园看看自己的花",
                    motive="维护自己的花朵，同时观察市场上受欢迎的花卉品种",
                    knowledge=["花卉的商业价值", "不同花朵的特点", "花园里的种植情况", "社区居民的喜好"],
                    character_type=CharacterType.SUSPECT
                ),
                Character(
                    name="小蜜蜂嗡嗡",
                    age=1,
                    occupation="花粉传播者",
                    personality="勤劳忙碌，对花朵很熟悉，飞来飞去很活跃",
                    background="花园里的常客，每天都来采蜜。对花园的变化很敏感",
                    secret="看到了真正的'花朵小偷'，但无法用人类的语言表达",
                    alibi="每天在花园里飞来飞去采蜜",
                    motive="需要花蜜生存，希望花园里的花越来越多",
                    knowledge=["谁经常来花园", "花朵消失的具体时间", "真正的小偷是谁", "花园里的所有秘密"],
                    character_type=CharacterType.SUSPECT
                ),
                Character(
                    name="陈老师",
                    age=40,
                    occupation="小学老师",
                    personality="观察细致，善于教育，喜欢用故事启发孩子",
                    background="小丽的班主任，住在社区里。注意到了花园的异常情况",
                    secret="其实已经猜到了真相，但想通过引导让大家自己发现",
                    alibi="每天早上8点左右路过花园去学校",
                    motive="希望通过这个事件教育孩子们正确的价值观",
                    knowledge=["教育心理学", "小丽的家庭情况", "观察到的线索", "解决问题的方法"],
                    character_type=CharacterType.EXPERT
                )
            ],
            evidence=[
                # 第一层：现场证据
                Evidence(
                    name="花朵的切口",
                    description="被摘的花朵切口很整齐，像是用小剪刀剪的",
                    location="花园各处",
                    evidence_type=EvidenceType.PHYSICAL,
                    significance="不是随意折断的，而是小心剪下的",
                    known_by=["王爷爷"]  # 有园艺经验的人能看出来
                ),
                Evidence(
                    name="小脚印",
                    description="花坛边有小孩子的脚印，鞋码很小",
                    location="花坛周围",
                    evidence_type=EvidenceType.PHYSICAL,
                    significance="有小孩子经常在这里活动",
                    known_by=["陈老师"]  # 老师对孩子的观察很敏锐
                ),
                Evidence(
                    name="掉落的花瓣",
                    description="从花园到社区某个方向的路上有零星的花瓣",
                    location="社区小路",
                    evidence_type=EvidenceType.PHYSICAL,
                    significance="有人拿着花朵走过这条路",
                    known_by=["李阿姨"]  # 开花店的人对花瓣敏感
                ),
                
                # 第二层：时间线证据
                Evidence(
                    name="早晨的目击",
                    description="有人看到一个小女孩早上在花园里停留",
                    location="花园入口",
                    evidence_type=EvidenceType.BEHAVIORAL,
                    significance="确定了可疑人员和时间",
                    known_by=["王爷爷"]  # 爷爷早起看到的
                ),
                Evidence(
                    name="上学时间吻合",
                    description="花朵消失的时间正好是小学生上学的时间段",
                    location="时间分析",
                    evidence_type=EvidenceType.BEHAVIORAL,
                    significance="缩小了嫌疑人范围",
                    known_by=["陈老师"]  # 老师了解学生作息
                ),
                
                # 第三层：动机线索
                Evidence(
                    name="奶奶的病房",
                    description="小丽奶奶的病房里有新鲜的花朵，每天都有新的",
                    location="医院病房",
                    evidence_type=EvidenceType.PHYSICAL,
                    significance="有人在给病人送花，而且很频繁",
                    known_by=["陈老师"]  # 老师家访时发现
                ),
                Evidence(
                    name="小剪刀",
                    description="小丽的书包里有一把小剪刀，上面有花朵的汁液",
                    location="小丽书包",
                    evidence_type=EvidenceType.PHYSICAL,
                    significance="这是剪花的工具",
                    known_by=["陈老师"]  # 老师检查时发现
                ),
                
                # 第四层：情感证据
                Evidence(
                    name="奶奶的笑容",
                    description="小丽奶奶最近心情很好，总是对着床头的花朵微笑",
                    location="医院病房",
                    evidence_type=EvidenceType.BEHAVIORAL,
                    significance="花朵确实带来了积极的影响",
                    known_by=["小丽"]  # 小丽观察到的
                ),
                Evidence(
                    name="小丽的日记",
                    description="小丽的日记里写着'希望奶奶快点好起来，花朵会保佑奶奶的'",
                    location="小丽家",
                    evidence_type=EvidenceType.DOCUMENT,
                    significance="揭示了摘花的真正动机",
                    known_by=["陈老师"]  # 老师家访时了解到
                )
            ],
            solution="花园小偷就是小丽！她每天上学路过花园时，会摘一些最美的花朵带给住院的奶奶。虽然摘花是不对的，但她的动机是纯真的爱心。最后，社区居民被小丽的孝心感动，决定专门为她种一块'爱心花园'，让她可以正当地摘花送给奶奶，同时教育她要先征得别人同意。",
            key_clues=["整齐切口显示工具", "小脚印确定年龄", "花瓣路径指向方向", "时间吻合缩小范围", "病房花朵揭示去向", "小剪刀证明工具", "日记暴露动机"]
        ),
        
        # 案例8: 健身房深夜谋杀案
        Case(
            title="健身房深夜谋杀案",
            description="深夜的健身房本该是挥洒汗水的圣地，却成了血腥的犯罪现场...当清洁工推开健身房大门时，眼前的景象让她尖叫出声：知名健身教练马强倒在器械区的血泊中，头部遭受致命重击。在这个充满力量与激情的地方，隐藏着怎样的黑暗秘密？是商业竞争的恶性报复，还是被压抑已久的愤怒爆发？监控录像显示当晚有多人进出，每个人都有着不为人知的动机。在这个看似阳光健康的健身房里，真相比任何训练都更加残酷...",
            victim_name="马强",
            crime_scene="力量健身房器械区",
            time_of_crime="昨夜11点30分左右",
            category=CaseCategory.CLASSIC_MURDER,
            difficulty=CaseDifficulty.MEDIUM,
            characters=[
                Character(
                    name="马强",
                    age=32,
                    occupation="健身教练",
                    personality="表面阳光健康，但私下行为有问题，利用职务便利做一些不当的事",
                    background="知名健身教练，在健身房工作5年，技术过硬但人品有问题。最近与一些会员发生了纠纷。",
                    secret="利用职务便利做一些不当的事情，侵犯了一些女学员的权益",
                    alibi="死者，无法提供不在场证明",
                    motive="作为受害者，不当行为成为被杀害的原因",
                    knowledge=["健身房的内部情况", "会员的个人信息", "自己的不当行为"],
                    character_type=CharacterType.VICTIM
                ),
                Character(
                    name="李娜",
                    age=28,
                    occupation="健身房会员",
                    personality="外表柔弱但内心坚强，对不公正的事情很愤怒",
                    background="公司白领，最近因为工作压力大开始健身减压。在健身房遇到了一些不愉快的经历。",
                    secret="发现马强的不当行为，准备举报他，但遭到了威胁",
                    alibi="声称10点就离开了健身房，但监控显示时间有出入",
                    motive="马强的不当行为让她感到愤怒和恐惧",
                    knowledge=["马强的不当行为", "其他女学员的遭遇", "健身房的安全漏洞"],
                    character_type=CharacterType.SUSPECT,
                    is_guilty=True
                ),
                Character(
                    name="王大力",
                    age=35,
                    occupation="健身房股东",
                    personality="商人气质，精明但有些贪婪",
                    background="健身房的投资人之一，与马强在经营理念上有分歧，最近矛盾加剧。",
                    secret="想要改变健身房的经营模式，但马强阻挠他的计划",
                    alibi="在办公室处理财务到很晚",
                    motive="马强阻挠他的商业计划，影响了他的利益",
                    knowledge=["健身房的财务状况", "马强的合同细节", "其他股东的态度"],
                    character_type=CharacterType.SUSPECT
                ),
                Character(
                    name="张小美",
                    age=24,
                    occupation="健身房前台",
                    personality="活泼开朗，但最近情绪低落",
                    background="在健身房工作一年，对马强的行为有所察觉，但不敢声张。",
                    secret="受到马强的不当对待，但害怕失去工作不敢举报",
                    alibi="下班后去朋友家，但朋友不在家",
                    motive="对马强的不当行为忍无可忍",
                    knowledge=["健身房的日常运营", "会员的投诉", "马强的作息时间"],
                    character_type=CharacterType.SUSPECT
                ),
                Character(
                    name="陈教练",
                    age=32,
                    occupation="健身教练",
                    personality="专业敬业，但有些嫉妒心",
                    background="马强的同事，技术不如马强但更有责任心，一直想获得更好的发展机会。",
                    secret="一直想取代马强成为首席教练，对马强的成功感到嫉妒",
                    alibi="在家休息，但无人证明",
                    motive="马强阻碍了他的职业发展，抢走了他的重要客户",
                    knowledge=["健身房的内部矛盾", "马强的训练方法", "会员的评价"],
                    character_type=CharacterType.SUSPECT
                ),
                Character(
                    name="老刘",
                    age=58,
                    occupation="健身房保安",
                    personality="忠厚老实，观察力强",
                    background="在健身房工作多年，对每个人都很了解，是大家信任的长者。",
                    secret="知道很多人的秘密，但选择保持沉默",
                    alibi="当晚在门口值班",
                    motive="无明显动机",
                    knowledge=["进出人员记录", "监控系统情况", "健身房的各种情况"],
                    character_type=CharacterType.WITNESS
                ),
                Character(
                    name="赵警官",
                    age=42,
                    occupation="刑警",
                    personality="经验丰富，逻辑清晰",
                    background="负责此案的主办警官，有多年办案经验，善于从细节中发现真相。",
                    secret="对健身房的管理问题早有关注",
                    alibi="接到报警后第一时间赶到现场",
                    motive="无",
                    knowledge=["现场勘查结果", "法医初步报告", "相关法律条文"],
                    character_type=CharacterType.EXPERT
                )
            ],
            evidence=[
                Evidence(
                    name="监控录像",
                    description="显示李娜11点还在健身房，与她的证词不符",
                    location="健身房监控室",
                    evidence_type=EvidenceType.PHYSICAL,
                    significance="证明李娜撒谎了",
                    known_by=["老刘", "赵警官"]
                ),
                Evidence(
                    name="偷拍设备",
                    description="在马强的储物柜中发现微型摄像头和存储卡",
                    location="马强的储物柜",
                    evidence_type=EvidenceType.PHYSICAL,
                    significance="揭示马强的违法行为",
                    known_by=["赵警官"]
                ),
                Evidence(
                    name="威胁短信",
                    description="李娜手机中收到马强发来的威胁信息",
                    location="李娜的手机",
                    evidence_type=EvidenceType.DOCUMENT,
                    significance="证明马强威胁李娜",
                    known_by=["李娜", "赵警官"]
                ),
                Evidence(
                    name="哑铃上的血迹",
                    description="20公斤哑铃上发现血迹和毛发",
                    location="健身房器械区",
                    evidence_type=EvidenceType.PHYSICAL,
                    significance="可能是凶器",
                    known_by=["赵警官"]
                ),
                Evidence(
                    name="李娜的手套",
                    description="在垃圾桶中发现带血的运动手套",
                    location="健身房垃圾桶",
                    evidence_type=EvidenceType.PHYSICAL,
                    significance="凶手试图销毁证据",
                    known_by=["赵警官"]
                ),
                Evidence(
                    name="受害者日记",
                    description="马强的日记记录了他对多名女学员的不当想法",
                    location="马强的办公桌",
                    evidence_type=EvidenceType.DOCUMENT,
                    significance="显示马强的品行问题",
                    known_by=["赵警官"]
                ),
                Evidence(
                    name="财务纠纷记录",
                    description="马强与王大力关于健身房经营的争执邮件",
                    location="健身房办公室电脑",
                    evidence_type=EvidenceType.DOCUMENT,
                    significance="显示经济动机",
                    known_by=["王大力", "赵警官"]
                ),
                Evidence(
                    name="张小美的投诉记录",
                    description="张小美向上级投诉马强骚扰的邮件草稿",
                    location="张小美的电脑",
                    evidence_type=EvidenceType.DOCUMENT,
                    significance="证明马强的不当行为",
                    known_by=["张小美", "赵警官"]
                ),
                Evidence(
                    name="现场脚印",
                    description="现场发现女性运动鞋的脚印，尺码与李娜相符",
                    location="健身房现场",
                    evidence_type=EvidenceType.PHYSICAL,
                    significance="将李娜与现场联系起来",
                    known_by=["赵警官"]
                )
            ],
            solution="李娜是真正的凶手。她发现马强偷拍女学员更衣并威胁她，在愤怒和恐惧下用哑铃击打马强致死。虽然马强的行为确实不当，但李娜选择了错误的解决方式。案件揭示了健身房管理的漏洞和对女性权益保护的重要性。",
            key_clues=["监控录像显示李娜撒谎", "偷拍设备证明马强的违法行为", "威胁短信显示动机", "带血手套和脚印指向李娜"]
        )
]


def load_cases() -> List[Case]:
    """加载所有案例"""
    return CASES