// 游戏应用主类 - 版本 1.1 (修复光标问题)
class DetectiveGameApp {
    constructor() {
        this.apiBase = '/api';
        this.sessionId = null;
        this.currentCase = null;
        this.gameState = null;
        this.selectedCharacter = null;
        this.evidenceList = [];
        this.websocket = null;
        this.conversationHistory = []; // 存储所有角色的对话历史
        this.hintsHistory = []; // 存储获取的提示历史
        this.appTimezone = 'Asia/Shanghai'; // 默认时区

        
        // 客户端唯一标识（基于浏览器指纹和localStorage）
        this.clientId = this._getOrCreateClientId();
        
        // 异步初始化
        this.init().catch(error => {
            console.error('应用初始化失败:', error);
        });
    }
    
    // 带时间戳的日志方法
    log(message, ...args) {
        console.log(`[${new Date().toLocaleString('zh-CN', { timeZone: this.appTimezone })}] ${message}`, ...args);
    }
    
    logError(message, ...args) {
        console.error(`[${new Date().toLocaleString('zh-CN', { timeZone: this.appTimezone })}] ${message}`, ...args);
    }
    
    logWarn(message, ...args) {
        console.warn(`[${new Date().toLocaleString('zh-CN', { timeZone: this.appTimezone })}] ${message}`, ...args);
    }
    
    // 加载版本信息
    async loadVersionInfo() {
        try {
            const response = await fetch(`${this.apiBase}/version`);
            const versionInfo = await response.json();
            
            // 更新主菜单中的版本显示
            const versionElement = document.getElementById('app-version');
            if (versionElement) {
                versionElement.textContent = `v${versionInfo.version}`;
            }
            
            this.log(`版本信息加载成功: ${versionInfo.version}`);
        } catch (error) {
            this.logError('加载版本信息失败:', error);
            // 如果加载失败，保持默认版本号
        }
    }
    
    async init() {
        try {
            // 加载应用配置（包括时区）
            await this.loadAppConfig();
            
            // 加载版本信息
            await this.loadVersionInfo();
            
            this.bindEvents();
            this.hideLoadingScreen();
        } catch (error) {
            this.logError('初始化失败:', error);
            this.hideLoadingScreen();
        }
    }
    
    // 加载应用配置
    async loadAppConfig() {
        try {
            const response = await fetch(`${this.apiBase}/config`);
            if (response.ok) {
                const config = await response.json();
                this.appTimezone = config.timezone;
                this.log(`应用配置加载成功，时区: ${this.appTimezone}`);
            }
        } catch (error) {
            this.logWarn('加载应用配置失败，使用默认时区:', error);
        }
    }
    
    // 绑定事件监听器
    bindEvents() {
        // 主菜单按钮
        document.getElementById('start-game-btn').addEventListener('click', () => this.showCaseSelection());
        document.getElementById('rules-btn').addEventListener('click', () => this.showModal('rules-modal'));
        document.getElementById('about-btn').addEventListener('click', () => this.showModal('about-modal'));
        
        // 案例选择
        document.getElementById('back-to-menu').addEventListener('click', () => this.showScreen('main-menu'));
        
        // 案情介绍
        document.getElementById('start-investigation-btn').addEventListener('click', () => this.startInvestigation());
        document.getElementById('skip-intro-btn').addEventListener('click', () => this.skipIntroduction());
        
        // 游戏界面
        document.getElementById('get-hint-btn').addEventListener('click', () => this.getHint());
        document.getElementById('make-accusation-btn').addEventListener('click', () => this.showAccusationScreen());
        document.getElementById('ask-question-btn').addEventListener('click', () => this.askQuestion());
        
        // 指控界面
        document.getElementById('submit-accusation-btn').addEventListener('click', () => this.submitAccusation());
        document.getElementById('cancel-accusation-btn').addEventListener('click', () => this.showScreen('game-screen'));
        
        // 模态框关闭
        document.querySelectorAll('.close-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const modal = e.target.closest('.modal');
                this.hideModal(modal.id);
            });
        });
        
        // 点击模态框外部关闭
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.hideModal(modal.id);
                }
            });
        });
        
        // 问题输入框回车提交
        document.getElementById('question-input').addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && e.ctrlKey) {
                this.askQuestion();
            }
        });
    }
    
    // 显示/隐藏加载屏幕
    showLoadingScreen() {
        document.getElementById('loading-screen').style.display = 'flex';
    }
    
    hideLoadingScreen() {
        document.getElementById('loading-screen').style.display = 'none';
    }
    
    // 屏幕切换
    showScreen(screenId) {
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.remove('active');
        });
        document.getElementById(screenId).classList.add('active');
    }
    
    // 模态框显示/隐藏
    showModal(modalId) {
        document.getElementById(modalId).classList.add('active');
    }
    
    hideModal(modalId) {
        document.getElementById(modalId).classList.remove('active');
    }
    
    // 显示消息模态框
    showMessage(title, content, isHtml = false, callback = null) {
        document.getElementById('message-title').textContent = title;
        const messageContent = document.getElementById('message-content');
        
        if (isHtml) {
            messageContent.innerHTML = content;
        } else {
            messageContent.textContent = content;
        }
        
        // 如果有回调函数，设置模态框关闭时的回调
        if (callback) {
            const modal = document.getElementById('message-modal');
            const closeHandler = () => {
                callback();
                modal.removeEventListener('hidden.bs.modal', closeHandler);
            };
            modal.addEventListener('hidden.bs.modal', closeHandler);
        }
        
        this.showModal('message-modal');
    }

    // 显示带确认按钮的消息框
    showConfirmMessage(title, content, isHtml = false, callback = null) {
        document.getElementById('message-title').textContent = title;
        const messageContent = document.getElementById('message-content');
        
        let messageHtml = '';
        if (isHtml) {
            messageHtml = content;
        } else {
            messageHtml = `<p>${content}</p>`;
        }
        
        // 添加确认按钮
        messageHtml += `
            <div class="message-actions" style="margin-top: 20px; text-align: center;">
                <button id="confirm-message-btn" class="btn primary">
                    <i class="fas fa-check"></i> 确认
                </button>
            </div>
        `;
        
        messageContent.innerHTML = messageHtml;
        
        // 绑定确认按钮事件
        const confirmBtn = document.getElementById('confirm-message-btn');
        if (confirmBtn) {
            confirmBtn.addEventListener('click', () => {
                this.hideModal('message-modal');
                if (callback) {
                    callback();
                }
            });
        }
        
        this.showModal('message-modal');
    }
    
    // 显示案例选择
    async showCaseSelection() {
        this.showLoadingScreen();
        
        try {
            // 并行加载案例和分类数据
            const [casesResponse, categoriesResponse] = await Promise.all([
                fetch(`${this.apiBase}/cases`),
                fetch(`${this.apiBase}/categories`)
            ]);
            
            const cases = await casesResponse.json();
            const categories = await categoriesResponse.json();
            
            this.renderCaseFilters(categories);
            this.renderCases(cases);
            this.showScreen('case-selection');
        } catch (error) {
            this.logError('加载案例失败:', error);
            this.showMessage('错误', '加载案例失败，请检查网络连接');
        } finally {
            this.hideLoadingScreen();
        }
    }
    
    // 渲染案例过滤器
    renderCaseFilters(categories) {
        const filtersContainer = document.getElementById('case-filters');
        if (!filtersContainer) return;
        
        filtersContainer.innerHTML = `
            <div class="filter-group">
                <label for="category-filter">分类:</label>
                <select id="category-filter">
                    <option value="">全部分类</option>
                    ${categories.categories.map(cat => 
                        `<option value="${cat.value}">${cat.name}</option>`
                    ).join('')}
                </select>
            </div>
            <div class="filter-group">
                <label for="difficulty-filter">难度:</label>
                <select id="difficulty-filter">
                    <option value="">全部难度</option>
                    ${categories.difficulties.map(diff => 
                        `<option value="${diff.value}">${diff.name}</option>`
                    ).join('')}
                </select>
            </div>
            <button id="apply-filters-btn" class="btn btn-primary">应用过滤</button>
            <button id="clear-filters-btn" class="btn btn-secondary">清除过滤</button>
        `;
        
        // 绑定过滤器事件
        document.getElementById('apply-filters-btn').addEventListener('click', () => this.applyFilters());
        document.getElementById('clear-filters-btn').addEventListener('click', () => this.clearFilters());
    }
    
    // 应用过滤器
    async applyFilters() {
        const category = document.getElementById('category-filter').value;
        const difficulty = document.getElementById('difficulty-filter').value;
        
        this.showLoadingScreen();
        
        try {
            const params = new URLSearchParams();
            if (category) params.append('category', category);
            if (difficulty) params.append('difficulty', difficulty);
            
            const response = await fetch(`${this.apiBase}/cases?${params}`);
            const cases = await response.json();
            
            this.renderCases(cases);
        } catch (error) {
            this.logError('过滤案例失败:', error);
            this.showMessage('错误', '过滤案例失败，请重试');
        } finally {
            this.hideLoadingScreen();
        }
    }
    
    // 清除过滤器
    async clearFilters() {
        document.getElementById('category-filter').value = '';
        document.getElementById('difficulty-filter').value = '';
        await this.applyFilters();
    }
    
    // 渲染案例列表
    renderCases(cases) {
        const casesList = document.getElementById('cases-list');
        casesList.innerHTML = '';
        
        if (cases.length === 0) {
            casesList.innerHTML = '<div class="no-cases">没有找到符合条件的案例</div>';
            return;
        }
        
        cases.forEach((caseData) => {
            const caseCard = document.createElement('div');
            caseCard.className = 'case-card';
            
            // 获取分类和难度的中文名称
            const categoryName = this.getCategoryName(caseData.category);
            const difficultyName = this.getDifficultyName(caseData.difficulty);
            
            // 截取描述，只显示前4行左右的内容
            const shortDescription = this.truncateDescription(caseData.description, 120);
            
            caseCard.innerHTML = `
                <div class="case-header">
                    <h3>${caseData.title}</h3>
                    <div class="case-badges">
                        <span class="badge badge-category">${categoryName}</span>
                        <span class="badge badge-difficulty badge-${caseData.difficulty}">${difficultyName}</span>
                    </div>
                </div>
                <p class="case-description">${shortDescription}</p>
                <div class="case-meta">
                    <span>受害者: ${caseData.victim_name}</span>
                    <span>地点: ${caseData.crime_scene}</span>
                </div>
                <div class="case-meta">
                    <span>时间: ${caseData.time_of_crime}</span>
                    <span>角色: ${caseData.characters.length}人</span>
                </div>
            `;
            
            caseCard.addEventListener('click', () => this.startGame(caseData.index));
            casesList.appendChild(caseCard);
        });
    }
    
    // 截取描述文本，保持在合适的长度
    truncateDescription(description, maxLength = 120) {
        if (description.length <= maxLength) {
            return description;
        }
        
        // 在最大长度附近寻找合适的断点（句号、感叹号、问号）
        let truncated = description.substring(0, maxLength);
        const lastPunctuation = Math.max(
            truncated.lastIndexOf('。'),
            truncated.lastIndexOf('！'),
            truncated.lastIndexOf('？')
        );
        
        if (lastPunctuation > maxLength * 0.7) {
            // 如果找到合适的标点符号，在那里截断
            return description.substring(0, lastPunctuation + 1);
        } else {
            // 否则在最大长度处截断并添加省略号
            return truncated + '...';
        }
    }
    
    // 获取分类中文名称
    getCategoryName(category) {
        const categoryNames = {
            "classic_murder": "经典谋杀案",
            "locked_room": "密室杀人案", 
            "revenge": "复仇案件",
            "family_drama": "家庭纠纷案",
            "kids_friendly": "儿童友好案例",
            "supernatural": "超自然元素案例",
            "financial_crime": "经济犯罪案",
            "missing_person": "失踪案件"
        };
        return categoryNames[category] || category;
    }
    
    // 获取难度中文名称
    getDifficultyName(difficulty) {
        const difficultyNames = {
            "easy": "简单",
            "medium": "中等",
            "hard": "困难", 
            "expert": "专家级"
        };
        return difficultyNames[difficulty] || difficulty;
    }
    
    // 开始游戏
    async startGame(caseIndex) {
        this.showLoadingScreen();
        
        try {
            const response = await fetch(`${this.apiBase}/game/start`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ 
                    case_index: caseIndex,
                    client_id: this.clientId  // 发送客户端ID
                }),
            });
            
            const gameData = await response.json();
            
            this.sessionId = gameData.session_id;
            this.currentCase = gameData.case;
            this.gameState = gameData.game_state;
            
            this.log(`游戏开始 - 会话ID: ${this.sessionId}, 客户端ID: ${this.clientId}`);
            
            // 显示案情介绍而不是直接进入游戏
            this.showCaseIntroduction();
        } catch (error) {
            this.logError('开始游戏失败:', error);
            this.showMessage('错误', '开始游戏失败，请重试');
        } finally {
            this.hideLoadingScreen();
        }
    }
    
    // 显示案情介绍
    showCaseIntroduction() {
        // 显示案情介绍界面
        this.showScreen('case-intro-screen');
        
        // 开始完整的打字机效果序列
        this.startFullTypewriterSequence();
    }
    
    // 渲染介绍页面的角色信息
    renderIntroCharacters() {
        const charactersGrid = document.getElementById('intro-characters');
        charactersGrid.innerHTML = '';
        
        this.currentCase.characters.forEach(character => {
            const characterCard = document.createElement('div');
            characterCard.className = 'intro-character-card';
            characterCard.innerHTML = this._createCharacterCardHTML(character, 'intro');
            charactersGrid.appendChild(characterCard);
        });
    }
    
    // 完整的打字机效果序列
    async startFullTypewriterSequence() {
        // 重置跳过标志
        this.skipTypewriter = false;
        
        // 清空所有内容
        this.clearIntroContent();
        
        // 步骤1: 显示案件标题
        if (!this.skipTypewriter) {
            await this.delay(500); // 开始前的停顿
            await this.typewriterText('intro-case-title', this.currentCase.title, 80);
            await this.delay(1000);
        }
        
        // 步骤2: 显示案件详情部分
        if (!this.skipTypewriter) {
            // 显示案件详情区域
            document.getElementById('case-details-section').style.display = 'block';
            await this.delay(300);
            
            // 打字机显示"案件详情"标题
            await this.typewriterTextForElement(
                document.querySelector('#case-details-title span'), 
                '案件详情', 
                70
            );
            await this.delay(500);
            
            // 逐个显示案件详情
            await this.typewriterCaseDetails();
            await this.delay(1000);
        }
        
        // 步骤3: 显示案情概述部分
        if (!this.skipTypewriter) {
            // 显示案情概述区域
            document.getElementById('description-section').style.display = 'block';
            await this.delay(300);
            
            // 打字机显示"案情概述"标题
            await this.typewriterTextForElement(
                document.querySelector('#description-title span'), 
                '案情概述', 
                70
            );
            await this.delay(500);
            
            // 打字机显示案情描述
            await this.typewriterText('intro-description', this.currentCase.description, 40);
            await this.delay(1000);
        }
        
        // 步骤4: 显示相关人员部分
        if (!this.skipTypewriter) {
            // 显示相关人员区域
            document.getElementById('characters-section').style.display = 'block';
            await this.delay(300);
            
            // 打字机显示"相关人员"标题
            await this.typewriterTextForElement(
                document.querySelector('#characters-title span'), 
                '相关人员', 
                70
            );
            await this.delay(500);
            
            // 逐个显示角色信息
            await this.typewriterCharacters();
            await this.delay(1000);
        }
        
        // 步骤5: 显示调查目标部分
        if (!this.skipTypewriter) {
            // 显示调查目标区域
            document.getElementById('goals-section').style.display = 'block';
            await this.delay(300);
            
            // 打字机显示"调查目标"标题
            await this.typewriterTextForElement(
                document.querySelector('#goals-title span'), 
                '调查目标', 
                70
            );
            await this.delay(500);
            
            // 显示调查目标
            await this.typewriterGoals();
            await this.delay(800);
        }
        
        // 最后启用开始按钮
        if (!this.skipTypewriter) {
            document.getElementById('start-investigation-btn').disabled = false;
        }
    }
    
    // 清空介绍内容
    clearIntroContent() {
        // 清空标题
        document.getElementById('intro-case-title').textContent = '';
        
        // 隐藏所有区域
        document.getElementById('case-details-section').style.display = 'none';
        document.getElementById('description-section').style.display = 'none';
        document.getElementById('characters-section').style.display = 'none';
        document.getElementById('goals-section').style.display = 'none';
        
        // 清空所有标题
        document.querySelector('#case-details-title span').textContent = '';
        document.querySelector('#description-title span').textContent = '';
        document.querySelector('#characters-title span').textContent = '';
        document.querySelector('#goals-title span').textContent = '';
        
        // 清空案件详情标签
        document.getElementById('victim-label').textContent = '';
        document.getElementById('victim-age-label').textContent = '';
        document.getElementById('death-time-label').textContent = '';
        document.getElementById('death-location-label').textContent = '';
        
        // 清空案件详情内容
        document.getElementById('victim-name').textContent = '';
        document.getElementById('victim-age-occupation').textContent = '';
        document.getElementById('death-time').textContent = '';
        document.getElementById('death-location').textContent = '';
        
        // 清空案件详情图标
        document.getElementById('victim-icon').innerHTML = '';
        document.getElementById('victim-age-icon').innerHTML = '';
        document.getElementById('death-time-icon').innerHTML = '';
        document.getElementById('death-location-icon').innerHTML = '';
        
        // 重置案件详情项目状态
        const detailItems = document.querySelectorAll('.detail-item');
        detailItems.forEach(item => item.classList.remove('show'));
        
        // 清空内容
        document.getElementById('intro-description').innerHTML = '';
        document.getElementById('intro-characters').innerHTML = '';
        
        // 清空调查目标
        const goals = document.querySelectorAll('.goal-item span');
        goals.forEach(goal => goal.textContent = '');
        
        // 重置目标项目状态
        const goalItems = document.querySelectorAll('.goal-item');
        goalItems.forEach(item => item.classList.remove('show'));
        
        // 禁用开始按钮
        document.getElementById('start-investigation-btn').disabled = true;
    }
    
    // 通用打字机效果方法
    async typewriterText(elementId, text, speed = 50) {
        if (this.skipTypewriter) return;
        
        // 检查text是否有效
        if (!text || typeof text !== 'string') {
            console.warn(`typewriterText: Invalid text for element ${elementId}:`, text);
            return;
        }
        
        const element = document.getElementById(elementId);
        if (!element) {
            console.warn(`typewriterText: Element not found: ${elementId}`);
            return;
        }
        
        element.innerHTML = '';
        
        // 添加光标
        const cursor = document.createElement('span');
        cursor.className = 'typewriter-cursor';
        cursor.textContent = '|';
        element.appendChild(cursor);
        
        // 逐字显示文本
        for (let i = 0; i < text.length; i++) {
            if (this.skipTypewriter) break;
            
            await new Promise(resolve => setTimeout(resolve, speed));
            
            // 在光标前插入字符
            const textNode = document.createTextNode(text[i]);
            element.insertBefore(textNode, cursor);
        }
        
        // 移除光标
        cursor.remove();
    }
    
    // 图标打字机效果方法
    async typewriterIcon(elementId, iconClasses, speed = 100) {
        if (this.skipTypewriter) return;
        
        const element = document.getElementById(elementId);
        element.innerHTML = '';
        
        // 创建图标元素
        const icon = document.createElement('i');
        icon.className = iconClasses;
        icon.style.opacity = '0';
        icon.style.transform = 'scale(0)';
        icon.style.transition = 'all 0.3s ease';
        
        element.appendChild(icon);
        
        // 延迟后显示图标
        await new Promise(resolve => setTimeout(resolve, speed));
        
        if (!this.skipTypewriter) {
            icon.style.opacity = '1';
            icon.style.transform = 'scale(1)';
        }
    }
    
    // 根据姓名查找受害人角色信息（内部使用）
    _getVictimCharacter() {
        return this.currentCase.characters.find(character => 
            character.name === this.currentCase.victim_name && 
            character.character_type === 'victim'
        );
    }
    
    // 打字机效果显示案件详情
    async typewriterCaseDetails() {
        const victim = this._getVictimCharacter();
        
        const detailItems = [
            {
                iconId: 'victim-icon',
                iconClass: 'fas fa-user-injured',
                labelId: 'victim-label',
                labelText: '受害者',
                valueId: 'victim-name',
                value: this.currentCase.victim_name || '未知'
            },
            {
                iconId: 'victim-age-icon',
                iconClass: 'fas fa-id-card',
                labelId: 'victim-age-label',
                labelText: '年龄职业',
                valueId: 'victim-age-occupation',
                value: victim ? `${victim.age}岁，${victim.occupation}` : '信息不详'
            },
            {
                iconId: 'death-time-icon',
                iconClass: 'fas fa-clock',
                labelId: 'death-time-label',
                labelText: '时间',
                valueId: 'death-time',
                value: this.currentCase.time_of_crime || '时间不详'
            },
            {
                iconId: 'death-location-icon',
                iconClass: 'fas fa-map-marker-alt',
                labelId: 'death-location-label',
                labelText: '地点',
                valueId: 'death-location',
                value: this.currentCase.crime_scene || '地点不详'
            }
        ];
        
        const detailElements = document.querySelectorAll('.detail-item');
        
        for (let i = 0; i < detailItems.length; i++) {
            if (this.skipTypewriter) break;
            
            const detail = detailItems[i];
            const element = detailElements[i];
            
            // 显示图标
            await this.typewriterIcon(detail.iconId, detail.iconClass, 100);
            await this.delay(200);
            
            // 打字机显示标签文本
            await this.typewriterText(detail.labelId, detail.labelText, 60);
            await this.delay(200);
            
            // 打字机显示值文本
            await this.typewriterText(detail.valueId, detail.value, 60);
            
            // 添加显示动画
            element.classList.add('show');
            
            await this.delay(400);
        }
    }
    
    // 打字机效果显示角色信息
    async typewriterCharacters() {
        const charactersGrid = document.getElementById('intro-characters');
        charactersGrid.innerHTML = '';
        
        for (const character of this.currentCase.characters) {
            // 创建角色卡片
            const characterCard = document.createElement('div');
            characterCard.className = 'intro-character-card';
            characterCard.style.opacity = '0';
            characterCard.style.transform = 'translateY(20px)';
            characterCard.style.transition = 'all 0.5s ease';
            characterCard.innerHTML = this._createCharacterCardHTML(character, 'intro-empty');
            
            charactersGrid.appendChild(characterCard);
            
            // 动画显示卡片
            await this.delay(200);
            characterCard.style.opacity = '1';
            characterCard.style.transform = 'translateY(0)';
            
            // 打字机效果显示角色信息
            await this.delay(300);
            await this.typewriterTextForElement(characterCard.querySelector('.intro-character-name'), character.name, 60);
            await this.delay(200);
            await this.typewriterTextForElement(characterCard.querySelector('.intro-character-occupation'), character.occupation, 50);
            await this.delay(200);
            await this.typewriterTextForElement(characterCard.querySelector('.intro-character-type'), typeText, 40);
            await this.delay(400);
        }
    }
    
    // 打字机效果显示调查目标
    async typewriterGoals() {
        const goals = [
            '通过询问相关人员收集线索',
            '分析证据，寻找矛盾之处', 
            '找出真凶并进行指控'
        ];
        
        const goalItems = document.querySelectorAll('.goal-item');
        const goalElements = document.querySelectorAll('.goal-item span');
        
        for (let i = 0; i < goals.length && i < goalElements.length; i++) {
            await this.delay(300);
            
            // 显示目标项目动画
            goalItems[i].classList.add('show');
            await this.delay(200);
            
            // 打字机效果显示文本
            await this.typewriterTextForElement(goalElements[i], goals[i], 45);
        }
    }
    
    // 延迟方法
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    // 为元素添加打字机效果（支持任意元素）
    async typewriterTextForElement(element, text, speed = 50) {
        // 检查参数是否有效
        if (!element) {
            console.warn('typewriterTextForElement: Invalid element:', element);
            return;
        }
        
        if (!text || typeof text !== 'string') {
            console.warn('typewriterTextForElement: Invalid text:', text);
            return;
        }
        
        element.innerHTML = '';
        
        // 添加光标
        const cursor = document.createElement('span');
        cursor.className = 'typewriter-cursor';
        cursor.textContent = '|';
        element.appendChild(cursor);
        
        // 逐字显示文本
        for (let i = 0; i < text.length; i++) {
            await new Promise(resolve => setTimeout(resolve, speed));
            
            // 在光标前插入字符
            const textNode = document.createTextNode(text[i]);
            element.insertBefore(textNode, cursor);
        }
        
        // 移除光标
        cursor.remove();
    }
    
    // 开始调查
    startInvestigation() {
        this.initializeGame();
        this.connectWebSocket();
        this.showScreen('game-screen');
    }
    
    // 跳过介绍
    skipIntroduction() {
        // 停止当前的打字机效果
        this.skipTypewriter = true;
        
        // 立即显示所有内容
        this.showAllIntroContent();
        
        // 启用开始按钮
        document.getElementById('start-investigation-btn').disabled = false;
    }
    
    // 立即显示所有介绍内容
    showAllIntroContent() {
        // 填充标题
        document.getElementById('intro-case-title').textContent = this.currentCase.title;
        
        // 显示所有区域
        document.getElementById('case-details-section').style.display = 'block';
        document.getElementById('description-section').style.display = 'block';
        document.getElementById('characters-section').style.display = 'block';
        document.getElementById('goals-section').style.display = 'block';
        
        // 填充所有标题
        document.querySelector('#case-details-title span').textContent = '案件详情';
        document.querySelector('#description-title span').textContent = '案情概述';
        document.querySelector('#characters-title span').textContent = '相关人员';
        document.querySelector('#goals-title span').textContent = '调查目标';
        
        // 显示案件详情
        this.showCaseDetailsInstant();
        
        // 填充案情描述
        document.getElementById('intro-description').textContent = this.currentCase.description;
        
        // 显示角色信息
        this.renderIntroCharactersInstant();
        
        // 显示调查目标
        this.showGoalsInstant();
        
        // 启用开始按钮
        document.getElementById('start-investigation-btn').disabled = false;
    }
    
    // 立即显示角色信息
    renderIntroCharactersInstant() {
        const charactersGrid = document.getElementById('intro-characters');
        charactersGrid.innerHTML = '';
        
        this.currentCase.characters.forEach(character => {
            const characterCard = document.createElement('div');
            characterCard.className = 'intro-character-card show';
            characterCard.innerHTML = this._createCharacterCardHTML(character, 'intro');
            charactersGrid.appendChild(characterCard);
        });
    }
    
    // 立即显示案件详情
    showCaseDetailsInstant() {
        const victim = this._getVictimCharacter();
        
        // 填充标签文本
        document.getElementById('victim-label').textContent = '受害者';
        document.getElementById('victim-age-label').textContent = '年龄职业';
        document.getElementById('death-time-label').textContent = '时间';
        document.getElementById('death-location-label').textContent = '地点';
        
        // 填充案件详情内容
        document.getElementById('victim-name').textContent = this.currentCase.victim_name || '未知';
        document.getElementById('victim-age-occupation').textContent = victim ? `${victim.age}岁，${victim.occupation}` : '信息不详';
        document.getElementById('death-time').textContent = this.currentCase.time_of_crime || '时间不详';
        document.getElementById('death-location').textContent = this.currentCase.crime_scene || '地点不详';
        
        // 显示图标
        document.getElementById('victim-icon').innerHTML = '<i class="fas fa-user-injured"></i>';
        document.getElementById('victim-age-icon').innerHTML = '<i class="fas fa-id-card"></i>';
        document.getElementById('death-time-icon').innerHTML = '<i class="fas fa-clock"></i>';
        document.getElementById('death-location-icon').innerHTML = '<i class="fas fa-map-marker-alt"></i>';
        
        // 显示所有详情项目
        const detailItems = document.querySelectorAll('.detail-item');
        detailItems.forEach(item => item.classList.add('show'));
    }
    
    // 立即显示调查目标
    showGoalsInstant() {
        const goals = [
            '通过询问相关人员收集线索',
            '分析证据，寻找矛盾之处', 
            '找出真凶并进行指控'
        ];
        
        const goalItems = document.querySelectorAll('.goal-item');
        const goalElements = document.querySelectorAll('.goal-item span');
        
        goalItems.forEach(item => item.classList.add('show'));
        
        for (let i = 0; i < goals.length && i < goalElements.length; i++) {
            goalElements[i].textContent = goals[i];
        }
    }

    // 初始化游戏界面
    initializeGame() {
        // 更新案例信息
        document.getElementById('case-title').textContent = this.currentCase.title;
        document.getElementById('case-description').textContent = this.currentCase.description;
        
        // 调试信息
        this.log('初始化游戏界面，案件数据:', this.currentCase);
        this.log('被害人信息 - 姓名:', this.currentCase.victim_name, '地点:', this.currentCase.crime_scene, '时间:', this.currentCase.time_of_crime);
        
        // 更新被害人信息 - 立即设置
        this.updateVictimInfo();
        
        // 更新游戏状态
        this.updateGameStats();
        
        // 渲染角色列表
        this.renderCharacters();
        
        // 清空对话区域
        this.clearConversation();
        
        // 清空证据列表
        this.evidenceList = [];
        this.updateEvidenceDisplay();
        
        // 清空对话历史
        this.conversationHistory = [];
        
        // 清空提示历史
        this.hintsHistory = [];
        this.updateHintsDisplay();
        
        // 填充指控选择框
        this.populateAccusationSelect();
    }
    
    // 更新被害人信息
    updateVictimInfo() {
        if (!this.currentCase) {
            this.log('⚠️ 当前案件数据为空，无法更新被害人信息');
            return;
        }

        const victimNameEl = document.getElementById('game-victim-name');     
        const crimeSceneEl = document.getElementById('game-crime-scene');
        const crimeTimeEl = document.getElementById('game-crime-time');
        
        this.log('🔄 正在更新被害人信息...');
        this.log('DOM元素查找结果:', {
            victimNameEl: !!victimNameEl,
            crimeSceneEl: !!crimeSceneEl,
            crimeTimeEl: !!crimeTimeEl
        });
        
        if (victimNameEl) {
            const victimName = this.currentCase.victim_name || '未知';
            victimNameEl.textContent = victimName;
            victimNameEl.style.color = '#ffffff';
            victimNameEl.style.fontWeight = '600';
            this.log('✅ 设置被害人姓名:', victimName);
        } else {
            this.log('❌ 找不到 game-victim-name 元素');
        }
        
        if (crimeSceneEl) {
            const crimeScene = this.currentCase.crime_scene || '未知';
            crimeSceneEl.textContent = crimeScene;
            crimeSceneEl.style.color = '#ffffff';
            crimeSceneEl.style.fontWeight = '600';
            this.log('✅ 设置案发地点:', crimeScene);
        } else {
            this.log('❌ 找不到 game-crime-scene 元素');
        }
        
        if (crimeTimeEl) {
            const crimeTime = this.currentCase.time_of_crime || '未知';
            crimeTimeEl.textContent = crimeTime;
            crimeTimeEl.style.color = '#ffffff';
            crimeTimeEl.style.fontWeight = '600';
            this.log('✅ 设置案发时间:', crimeTime);
        } else {
            this.log('❌ 找不到 game-crime-time 元素');
        }
    }
    
    // 更新游戏统计信息
    updateGameStats() {
        // 更新轮次计数显示在提问按钮中
        const currentRoundEl = document.getElementById('current-round');
        const maxRoundsEl = document.getElementById('max-rounds');
        
        if (currentRoundEl) {
            currentRoundEl.textContent = this.gameState.current_round;
        }
        if (maxRoundsEl) {
            maxRoundsEl.textContent = this.gameState.max_rounds;
        }
        
        // 更新提示次数显示在获取提示按钮中
        const hintsUsedEl = document.getElementById('hints-used');
        const maxHintsEl = document.getElementById('max-hints');
        
        if (hintsUsedEl) {
            hintsUsedEl.textContent = this.gameState.hints_used;
        }
        if (maxHintsEl) {
            maxHintsEl.textContent = this.gameState.max_hints;
        }
        
        // 更新提示按钮状态
        const hintBtn = document.getElementById('get-hint-btn');
        if (hintBtn) {
            hintBtn.disabled = this.gameState.hints_used >= this.gameState.max_hints;
            
            // 如果提示次数用完，更新按钮样式
            if (this.gameState.hints_used >= this.gameState.max_hints) {
                hintBtn.style.opacity = '0.6';
            } else {
                hintBtn.style.opacity = '1';
            }
        }
    }
    
    // 渲染角色列表
    renderCharacters() {
        const charactersList = document.getElementById('characters-list');
        charactersList.innerHTML = '';
        
        // 过滤掉受害者，因为死者无法进行对话
        const availableCharacters = this.currentCase.characters.filter(character => 
            character.character_type !== 'victim'
        );
        
        availableCharacters.forEach(character => {
            const characterCard = document.createElement('div');
            characterCard.className = 'character-card';
            characterCard.innerHTML = this._createCharacterCardHTML(character, 'game');
            characterCard.addEventListener('click', () => this.selectCharacter(character));
            charactersList.appendChild(characterCard);
        });
    }
    
    // 获取角色类型文本（内部使用）
    _getCharacterTypeText(type) {
        const typeMap = {
            'suspect': '嫌疑人',
            'witness': '证人',
            'victim': '受害者',
            'expert': '专家'
        };
        return typeMap[type] || type;
    }
    
    // 选择角色
    selectCharacter(character) {
        this.selectedCharacter = character;
        
        // 更新角色卡片状态
        document.querySelectorAll('.character-card').forEach(card => {
            card.classList.remove('active');
        });
        event.currentTarget.classList.add('active');
        
        // 更新对话标题已经在showCharacterBackground中处理
        
        // 显示角色背景信息卡片
        this.showCharacterBackground(character);
        
        // 显示该角色的对话历史
        this.showCharacterConversation(character);
        
        // 检查是否已达到最大轮次
        if (this.gameState.current_round >= this.gameState.max_rounds) {
            // 轮次已用完，调用专门的禁用函数
            this.disableQuestionInput();
            return;
        }
        
        // 轮次未用完，显示问题输入区域
        document.getElementById('question-input-area').style.display = 'block';
        
        // 立即显示空白的参考问题区域，但允许用户开始输入
        const questionsList = document.getElementById('suggested-questions-list');
        questionsList.innerHTML = this._createLoadingSuggestionsHTML();
        
        // 异步获取参考问题，不阻塞用户操作
        this.getSuggestedQuestions(character);
    }
    
    // 显示角色背景信息（整合版）
    showCharacterBackground(character) {
        try {
            // 调试信息
            this.log('显示角色背景信息:', character);
            
            // 获取角色类型（兼容两种字段名）
            const characterType = character.character_type || character.type || 'unknown';
            this.log('角色类型:', characterType);
            
            // 隐藏默认标题，显示角色标题
            document.getElementById('default-header').style.display = 'none';
            document.getElementById('character-header').style.display = 'block';
            
            // 设置角色头像图标
            const avatarIcon = document.getElementById('character-avatar-icon');
            if (avatarIcon) {
                switch (characterType.toLowerCase()) {
                    case 'suspect':
                        avatarIcon.className = 'fas fa-user-secret';
                        break;
                    case 'witness':
                        avatarIcon.className = 'fas fa-eye';
                        break;
                    case 'expert':
                        avatarIcon.className = 'fas fa-user-graduate';
                        break;
                    case 'victim':
                        avatarIcon.className = 'fas fa-user-injured';
                        break;
                    default:
                        avatarIcon.className = 'fas fa-user';
                }
            }
            
            // 设置角色基本信息
            const nameDisplay = document.getElementById('character-name-display');
            const occupationDisplay = document.getElementById('character-occupation-display');
            const typeDisplay = document.getElementById('character-type-display');
            const backgroundText = document.getElementById('character-background-text');
            
            if (nameDisplay) nameDisplay.textContent = character.name || '未知';
            if (occupationDisplay) occupationDisplay.textContent = character.occupation || '职业不详';
            
            // 设置角色类型标签
            if (typeDisplay) {
                typeDisplay.textContent = this._getCharacterTypeText(characterType);
                typeDisplay.className = `character-type-badge-small ${characterType.toLowerCase()}`;
            }
            
            // 设置背景信息
            if (backgroundText) {
                backgroundText.textContent = character.background || '暂无背景信息';
            }
            this.log('角色背景信息显示成功');
            
        } catch (error) {
            this.logError('显示角色背景信息时出错:', error);
        }
    }
    

    
    // 显示特定角色的对话历史
    showCharacterConversation(character) {
        const conversationArea = document.getElementById('conversation-area');
        conversationArea.innerHTML = '';
        
        // 获取该角色的对话历史
        const characterConversations = this.conversationHistory.filter(msg => 
            msg.character === character.name
        );
        
        if (characterConversations.length === 0) {
            // 显示欢迎消息
            conversationArea.innerHTML = `
                <div class="welcome-message">
                    <i class="fas fa-comments"></i>
                    <h3>开始与 ${character.name} 对话</h3>
                    <p>您可以直接在下方输入问题开始对话</p>
                </div>
            `;
        } else {
            // 显示对话历史
            characterConversations.forEach(msg => {
                const conversationItem = document.createElement('div');
                conversationItem.className = 'conversation-item';
                conversationItem.innerHTML = this._createConversationItemHTML(msg.question, msg.response);
                conversationArea.appendChild(conversationItem);
            });
            conversationArea.scrollTop = conversationArea.scrollHeight;
        }
    }

    // 获取参考问题
    async getSuggestedQuestions(character) {
        // 如果轮次已用完，不获取参考问题
        if (this.gameState.current_round >= this.gameState.max_rounds) {
            return;
        }
        
        // 检查是否已经有了加载提示（在selectCharacter中已设置）
        const questionsList = document.getElementById('suggested-questions-list');
        if (!questionsList.querySelector('.loading-suggestions')) {
            // 如果没有加载提示，则显示
            questionsList.innerHTML = this._createLoadingSuggestionsHTML();
        }
        
        if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
            this.websocket.send(JSON.stringify({
                type: 'get_suggested_questions',
                character_name: character.name
            }));
        }
    }
    
    // 连接WebSocket
    connectWebSocket() {
        if (this.websocket) {
            this.websocket.close();
        }
        
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/ws/${this.sessionId}`;
        
        this.websocket = new WebSocket(wsUrl);
        
        this.websocket.onopen = () => {
            this.log('WebSocket连接已建立');
        };
        
        this.websocket.onmessage = (event) => {
            const message = JSON.parse(event.data);
            this.handleWebSocketMessage(message);
        };
        
        this.websocket.onclose = () => {
            this.log('WebSocket连接已关闭');
        };
        
        this.websocket.onerror = (error) => {
            this.logError('WebSocket错误:', error);
        };
    }
    
    // 处理WebSocket消息
    handleWebSocketMessage(message) {
        switch (message.type) {
            case 'suggested_questions':
                this.renderSuggestedQuestions(message.questions);
                break;
            case 'error':
                this.logError('WebSocket错误:', message.message);
                break;
        }
    }
    
    // 渲染参考问题
    renderSuggestedQuestions(questions) {
        const questionsList = document.getElementById('suggested-questions-list');
        questionsList.innerHTML = '';
        
        questions.forEach(question => {
            const questionBtn = document.createElement('button');
            questionBtn.className = 'suggested-question';
            questionBtn.textContent = question;
            questionBtn.addEventListener('click', () => {
                document.getElementById('question-input').value = question;
            });
            questionsList.appendChild(questionBtn);
        });
    }
    
    // 提问
    async askQuestion() {
        if (!this.selectedCharacter) {
            this.showMessage('提示', '请先选择一个角色');
            return;
        }
        
        // 检查是否已达到最大轮次
        if (this.gameState.current_round >= this.gameState.max_rounds) {
            this.disableQuestionInput();
            return;
        }
        
        const questionInput = document.getElementById('question-input');
        const question = questionInput.value.trim();
        
        if (!question) {
            this.showMessage('提示', '请输入问题');
            return;
        }
        
        const askBtn = document.getElementById('ask-question-btn');
        askBtn.disabled = true;
        askBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 提问中...';
        
        // 清空输入框
        questionInput.value = '';
        
        try {
            await this.askQuestionStream(question);
        } catch (error) {
            this.logError('提问失败:', error);
            this.showMessage('错误', '提问失败，请重试');
        } finally {
            askBtn.disabled = false;
            // 恢复按钮原始格式（两行显示，包含计数）
            askBtn.innerHTML = `
                <span class="button-text">
                    <i class="fas fa-paper-plane"></i>
                    提问
                </span>
                <span class="button-count">(${this.gameState.current_round}/${this.gameState.max_rounds})</span>
            `;
        }
    }
    
    // 流式提问
    async askQuestionStream(question) {
        // 添加用户问题到界面
        this.addQuestionToConversation(question);
        
        // 创建AI回答容器
        const responseContainer = this.createResponseContainer();
        
        try {
            const response = await fetch(`${this.apiBase}/game/question/stream`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'text/event-stream',
                    'Cache-Control': 'no-cache'
                },
                body: JSON.stringify({
                    session_id: this.sessionId,
                    character_name: this.selectedCharacter.name,
                    question: question
                }),
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let responseText = '';
            let buffer = '';
            
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                
                // 将新数据添加到缓冲区
                buffer += decoder.decode(value, { stream: true });
                
                // 按行分割处理
                const lines = buffer.split('\n');
                // 保留最后一行（可能不完整）
                buffer = lines.pop() || '';
                
                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        try {
                            const jsonStr = line.slice(6).trim();
                            if (jsonStr) {
                                const data = JSON.parse(jsonStr);
                                
                                switch (data.type) {
                                    case 'start':
                                        this.log('开始接收流式响应');
                                        break;
                                    case 'chunk':
                                        // 添加文本块到响应
                                        responseText += data.content;
                                        this.updateResponseContainer(responseContainer, responseText);
                                        break;
                                    case 'response_complete':
                                        // 对话回复完成，移除打字效果
                                        this.completeResponse(responseContainer, responseText);
                                        break;
                                    case 'evidence_revealed':
                                        // 发现新证据
                                        this.addEvidence(data.evidence);
                                        this.showEvidenceNotification(data.evidence);
                                        break;
                                    case 'complete':
                                        // 整个流程完成
                                        this.finalizeResponse(question, responseText, data);
                                        return; // 完成后退出
                                    case 'error':
                                        throw new Error(data.message);
                                }
                            }
                        } catch (e) {
                            console.warn('JSON解析错误:', e, '原始数据:', line);
                        }
                    }
                }
            }
            
            // 处理缓冲区中剩余的数据
            if (buffer.startsWith('data: ')) {
                try {
                    const jsonStr = buffer.slice(6).trim();
                    if (jsonStr) {
                        const data = JSON.parse(jsonStr);
                        if (data.type === 'complete') {
                            this.finalizeResponse(question, responseText, data);
                        }
                    }
                } catch (e) {
                    console.warn('处理剩余数据时出错:', e);
                }
            }
            
        } catch (error) {
            console.error('流式请求错误:', error);
            responseContainer.innerHTML = '<div class="error-message">回答失败，请重试</div>';
            throw error;
        }
    }
    
    // 添加问题到对话
    addQuestionToConversation(question) {
        const conversationArea = document.getElementById('conversation-area');
        
        // 隐藏欢迎消息
        const welcomeMessage = conversationArea.querySelector('.welcome-message');
        if (welcomeMessage) {
            welcomeMessage.style.display = 'none';
        }
        
        const conversationItem = document.createElement('div');
        conversationItem.className = 'conversation-item';
        conversationItem.innerHTML = this._createConversationItemHTML(question);
        
        conversationArea.appendChild(conversationItem);
        conversationArea.scrollTop = conversationArea.scrollHeight;
        
        return conversationItem;
    }
    
    // 创建响应容器
    createResponseContainer() {
        const conversationArea = document.getElementById('conversation-area');
        const lastItem = conversationArea.lastElementChild;
        
        const responseDiv = document.createElement('div');
        responseDiv.className = 'response streaming';
        responseDiv.innerHTML = '<span class="typing-indicator">正在输入...</span>';
        
        lastItem.appendChild(responseDiv);
        conversationArea.scrollTop = conversationArea.scrollHeight;
        
        return responseDiv;
    }
    
    // 更新响应容器
    updateResponseContainer(container, text) {
        container.className = 'response streaming';
        container.innerHTML = text + '<span class="cursor">|</span>';
        
        // 滚动到底部
        const conversationArea = document.getElementById('conversation-area');
        conversationArea.scrollTop = conversationArea.scrollHeight;
    }
    
    // 完成对话回复（移除打字效果）
    completeResponse(container, text) {
        container.className = 'response';
        container.innerHTML = text;
        
        // 滚动到底部
        const conversationArea = document.getElementById('conversation-area');
        conversationArea.scrollTop = conversationArea.scrollHeight;
    }
    
    // 显示证据发现通知
    showEvidenceNotification(evidence) {
        // 创建证据通知
        const notification = document.createElement('div');
        notification.className = 'evidence-notification';
        notification.innerHTML = `
            <div class="evidence-notification-content">
                <div class="evidence-icon">🔍</div>
                <div class="evidence-info">
                    <div class="evidence-title">发现新证据！</div>
                    <div class="evidence-name">${evidence.name}</div>
                </div>
            </div>
        `;
        
        // 添加到页面
        document.body.appendChild(notification);
        
        // 显示动画
        setTimeout(() => {
            notification.classList.add('show');
        }, 100);
        
        // 3秒后自动消失
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }
    
    // 完成响应
    finalizeResponse(question, responseText, data) {
        // 保存到对话历史
        if (this.selectedCharacter) {
            this.conversationHistory.push({
                character: this.selectedCharacter.name,
                question: question,
                response: responseText,
                timestamp: new Date()
            });
        }
        
        // 更新游戏状态
        this.gameState.current_round = data.round_number;
        this.updateGameStats();
        
        // 检查是否达到最大轮次
        if (data.rounds_exhausted || data.remaining_rounds <= 0) {
            // 禁用问题输入，不显示弹窗
            this.disableQuestionInput();
        } else {
            // 只有在轮次未结束时才更新参考问题
            this.getSuggestedQuestions(this.selectedCharacter);
        }
    }
    
    // 禁用问题输入
    disableQuestionInput() {
        const questionInputDiv = document.querySelector('.question-input');
        const questionsList = document.getElementById('suggested-questions-list');
        const questionInputArea = document.getElementById('question-input-area');
        
        // 确保问题输入区域是显示的，并添加轮次结束样式
        if (questionInputArea) {
            questionInputArea.style.display = 'block';
            questionInputArea.className = 'question-input-area rounds-ended-area';
        }
        
        // 隐藏整个问题输入框区域
        if (questionInputDiv) {
            questionInputDiv.style.display = 'none';
        }
        
        // 隐藏"参考问题："标题
        const suggestedQuestions = document.querySelector('.suggested-questions');
        if (suggestedQuestions) {
            const h4 = suggestedQuestions.querySelector('h4');
            if (h4) h4.style.display = 'none';
        }
        
        // 显示简洁的轮次结束提示
        if (questionsList) {
            questionsList.className = 'suggested-questions-list rounds-ended';
            questionsList.innerHTML = `
                <div class="rounds-exhausted-notice-compact">
                    <div class="rounds-status">
                        <span class="rounds-count">询问轮次已用完 (${this.gameState.max_rounds}/${this.gameState.max_rounds})</span>
                        <span class="rounds-tip">💡 点击左侧角色可回看聊天记录，整理好思路后就开始指控吧！</span>
                    </div>
                    <button class="btn accusation-btn btn-sm" onclick="app.showAccusationDirectly()">
                        <i class="fas fa-gavel"></i> 进行指控
                    </button>
                </div>
            `;
        }
        
        // 不再禁用角色选择，允许玩家查看对话历史
        // 角色卡片保持可点击状态，但提问功能已被禁用
    }
    

    
    // 清空对话
    clearConversation() {
        const conversationArea = document.getElementById('conversation-area');
        conversationArea.innerHTML = `
            <div class="welcome-message">
                <i class="fas fa-arrow-left"></i>
                <p>点击左侧角色开始询问</p>
            </div>
        `;
        
        // 恢复默认标题，隐藏角色标题
        document.getElementById('default-header').style.display = 'block';
        document.getElementById('character-header').style.display = 'none';
        
        // 收起背景信息
        const expandableArea = document.getElementById('character-background-expandable');
        const toggleBtn = document.getElementById('toggle-background-btn');
        if (expandableArea) expandableArea.style.display = 'none';
        if (toggleBtn) {
            toggleBtn.classList.remove('expanded');
            toggleBtn.title = '展开背景信息';
        }
        
        document.getElementById('question-input-area').style.display = 'none';
    }
    
    // 添加证据
    addEvidence(evidence) {
        this.evidenceList.push(evidence);
        this.updateEvidenceDisplay();
        
        // 显示证据通知
        const conversationArea = document.getElementById('conversation-area');
        const notification = document.createElement('div');
        notification.className = 'evidence-notification';
        notification.innerHTML = `
            <i class="fas fa-search"></i>
            <strong>发现新证据：${evidence.name}</strong><br>
            ${evidence.description}<br>
            <em>意义：${evidence.significance}</em>
        `;
        
        conversationArea.appendChild(notification);
        conversationArea.scrollTop = conversationArea.scrollHeight;
    }
    
    // 更新证据显示
    updateEvidenceDisplay() {
        const evidenceList = document.getElementById('evidence-list');
        
        if (this.evidenceList.length === 0) {
            evidenceList.innerHTML = '<p class="no-evidence">暂无发现的证据</p>';
            return;
        }
        
        evidenceList.innerHTML = '';
        this.evidenceList.forEach(evidence => {
            const evidenceItem = document.createElement('div');
            evidenceItem.className = 'evidence-item';
            evidenceItem.innerHTML = `
                <div class="evidence-name">${evidence.name}</div>
                <div class="evidence-description">${evidence.description}</div>
                <div class="evidence-significance">${evidence.significance}</div>
            `;
            evidenceList.appendChild(evidenceItem);
        });
    }
    
    // 更新提示历史显示
    updateHintsDisplay() {
        const hintsList = document.getElementById('hints-list');
        
        if (this.hintsHistory.length === 0) {
            hintsList.innerHTML = '<p class="no-hints">暂无获取的提示</p>';
            return;
        }
        
        hintsList.innerHTML = '';
        this.hintsHistory.forEach(hint => {
            const hintItem = document.createElement('div');
            hintItem.className = 'hint-item';
            hintItem.innerHTML = `
                <div class="hint-content">${hint.content}</div>
                <div class="hint-timestamp">${hint.timestamp}</div>
            `;
            hintsList.appendChild(hintItem);
        });
    }
    
    // 获取提示
    async getHint() {
        const hintBtn = document.getElementById('get-hint-btn');
        hintBtn.disabled = true;
        hintBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 生成中...';
        
        try {
            const response = await fetch(`${this.apiBase}/game/hint`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    session_id: this.sessionId
                }),
            });
            
            const result = await response.json();
            
            if (response.ok) {
                // 添加到提示历史
                this.hintsHistory.push({
                    content: result.hint,
                    timestamp: new Date().toLocaleString('zh-CN', { timeZone: this.appTimezone })
                });
                
                // 更新提示历史显示
                this.updateHintsDisplay();
                
                this.showMessage('💡 智能提示', result.hint);
                
                // 更新提示统计
                this.gameState.hints_used = result.hints_used;
                this.updateGameStats();
            } else {
                this.showMessage('错误', result.detail || '获取提示失败');
            }
        } catch (error) {
            console.error('获取提示失败:', error);
            this.showMessage('错误', '获取提示失败，请重试');
        } finally {
            hintBtn.disabled = this.gameState.hints_used >= this.gameState.max_hints;
            // 恢复按钮原始文本（包含计数）
            hintBtn.innerHTML = `
                <span class="button-text">
                    <i class="fas fa-lightbulb"></i>
                    获取提示
                </span>
                <span class="button-count">(${this.gameState.hints_used}/${this.gameState.max_hints})</span>
            `;
        }
    }
    
    // 显示调查总结
    // 直接进入指控界面
    showAccusationDirectly() {
        this.showAccusationScreen();
        this.populateAccusationSelect();
    }

    // 显示指控界面
    showAccusationScreen() {
        this.showScreen('accusation-screen');
    }
    
    // 填充指控选择框
    populateAccusationSelect() {
        const accusedSelect = document.getElementById('accused-select');
        accusedSelect.innerHTML = '<option value="">请选择...</option>';
        
        this.currentCase.characters.forEach(character => {
            // 过滤掉专家和受害者，因为他们不能被指控
            if (character.character_type !== 'expert' && character.character_type !== 'victim') {
                const option = document.createElement('option');
                option.value = character.name;
                option.textContent = `${character.name} (${character.occupation})`;
                accusedSelect.appendChild(option);
            }
        });
    }
    
    // 提交指控
    async submitAccusation() {
        const accusedName = document.getElementById('accused-select').value;
        const reasoning = document.getElementById('accusation-reasoning').value.trim();
        
        if (!accusedName) {
            this.showMessage('提示', '请选择被指控者');
            return;
        }
        
        if (!reasoning) {
            this.showMessage('提示', '请输入指控理由');
            return;
        }
        
        const submitBtn = document.getElementById('submit-accusation-btn');
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 审判中...';
        
        try {
            await this.submitAccusationStream(accusedName, reasoning);
        } catch (error) {
            console.error('指控失败:', error);
            this.showMessage('错误', '指控失败，请重试');
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fas fa-gavel"></i> 提交指控';
        }
    }
    
    // 流式审判过程
    async submitAccusationStream(accusedName, reasoning) {
        // 切换到审判结果界面
        this.showScreen('trial-result-screen');
        
        const resultContent = document.getElementById('trial-result-content');
        resultContent.innerHTML = `
            <div class="trial-result">
                <div class="trial-header">
                    <h2><i class="fas fa-balance-scale"></i> 审判进行中...</h2>
                    <p>正在对 <strong>${accusedName}</strong> 的指控进行审理</p>
                </div>
                <div id="trial-steps" class="trial-steps"></div>
            </div>
        `;
        
        const trialSteps = document.getElementById('trial-steps');
        let currentStep = null;
        let trialData = {};
        
        try {
            const response = await fetch(`${this.apiBase}/game/accusation/stream`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    session_id: this.sessionId,
                    accused_name: accusedName,
                    reasoning: reasoning
                }),
            });
            
            if (!response.ok) {
                throw new Error('审判请求失败');
            }
            
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';
            
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                
                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';
                
                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        try {
                            const data = JSON.parse(line.slice(6));
                            await this.handleTrialStreamData(data, trialSteps, trialData);
                        } catch (e) {
                            console.error('解析审判数据失败:', e);
                        }
                    }
                }
            }
            
        } catch (error) {
            console.error('流式审判失败:', error);
            trialSteps.innerHTML += `
                <div class="trial-error">
                    <h3><i class="fas fa-exclamation-triangle"></i> 审判过程出现错误</h3>
                    <p>请重试或联系管理员</p>
                </div>
            `;
        }
    }
    
    // 处理审判流式数据
    async handleTrialStreamData(data, trialSteps, trialData) {
        console.log('收到审判事件:', data.type, data);
        
        switch (data.type) {
            case 'start':
                trialSteps.innerHTML = `
                    <div class="trial-intro">
                        <h3>🏛️ 审判开始</h3>
                        <p>现在开始审理对 <strong>${data.accused_name}</strong> 的指控</p>
                    </div>
                `;
                break;
                
            case 'evaluation_chunk':
                // 确保评估容器存在
                let evaluationContainer = document.getElementById('content-evaluation');
                if (!evaluationContainer) {
                    const stepDiv = document.createElement('div');
                    stepDiv.className = 'trial-step';
                    stepDiv.id = 'step-evaluation';
                    stepDiv.innerHTML = `
                        <div class="step-header">
                            <h3><i class="fas fa-chevron-right"></i> 指控评估</h3>
                        </div>
                        <div class="step-content" id="content-evaluation"></div>
                    `;
                    trialSteps.appendChild(stepDiv);
                    stepDiv.scrollIntoView({ behavior: 'smooth' });
                }
                
                                        this._appendToTrialContent('content-evaluation', data.content);
                break;
                
            case 'evaluation_complete':
                trialData.evaluation = {
                    score: data.score,
                    feedback: data.feedback
                };
                                        this._finalizeTrialStep('content-evaluation');
                break;
                
            case 'reasoning_challenge':
                const challengeDiv = document.createElement('div');
                challengeDiv.className = 'reasoning-challenge';
                challengeDiv.innerHTML = `
                    <div class="challenge-content">
                        <h3>⚠️ 指控理由不充分</h3>
                        <p class="challenge-message">${data.message}</p>
                        <p class="challenge-note">审判将继续进行，但其他角色可能对此指控持怀疑态度。</p>
                    </div>
                `;
                trialSteps.appendChild(challengeDiv);
                challengeDiv.scrollIntoView({ behavior: 'smooth' });
                break;
                
            case 'step':
                const stepDiv = document.createElement('div');
                stepDiv.className = 'trial-step';
                stepDiv.id = `step-${data.step}`;
                stepDiv.setAttribute('data-step', data.step); // 添加data-step属性用于CSS样式
                stepDiv.innerHTML = `
                    <div class="step-header">
                        <h3><i class="fas fa-chevron-right"></i> ${data.title}</h3>
                    </div>
                    <div class="step-content" id="content-${data.step}"></div>
                `;
                trialSteps.appendChild(stepDiv);
                
                // 滚动到新步骤
                stepDiv.scrollIntoView({ behavior: 'smooth' });
                break;
                
            case 'defense_chunk':
                // 确保辩护容器存在
                let defenseContainer = document.getElementById('content-defense');
                if (!defenseContainer) {
                    const stepDiv = document.createElement('div');
                    stepDiv.className = 'trial-step';
                    stepDiv.id = 'step-defense';
                    stepDiv.innerHTML = `
                        <div class="step-header">
                            <h3><i class="fas fa-chevron-right"></i> 被告辩护</h3>
                        </div>
                        <div class="step-content" id="content-defense"></div>
                    `;
                    trialSteps.appendChild(stepDiv);
                    stepDiv.scrollIntoView({ behavior: 'smooth' });
                }
                
                this._appendToTrialContent('content-defense', data.content);
                break;
                
            case 'defense_complete':
                trialData.defense = data.defense;
                this._finalizeTrialStep('content-defense');
                break;
                
            case 'witness_start':
                // 确保证人证词容器存在
                let testimoniesContainer = document.getElementById('content-testimonies');
                if (!testimoniesContainer) {
                    const stepDiv = document.createElement('div');
                    stepDiv.className = 'trial-step';
                    stepDiv.id = 'step-testimonies';
                    stepDiv.innerHTML = `
                        <div class="step-header">
                            <h3><i class="fas fa-chevron-right"></i> 证人证词</h3>
                        </div>
                        <div class="step-content" id="content-testimonies"></div>
                    `;
                    trialSteps.appendChild(stepDiv);
                    stepDiv.scrollIntoView({ behavior: 'smooth' });
                    testimoniesContainer = document.getElementById('content-testimonies');
                }
                
                const witnessDiv = document.createElement('div');
                witnessDiv.className = 'witness-testimony';
                witnessDiv.id = `witness-${data.index}`;
                witnessDiv.innerHTML = `
                    <h4><i class="fas fa-user"></i> ${data.witness_name} 作证</h4>
                    <div class="testimony-content" id="testimony-${data.index}"></div>
                `;
                testimoniesContainer.appendChild(witnessDiv);
                break;
                
            case 'testimony_chunk':
                this._appendToTrialContent(`testimony-${this._getWitnessIndex(data.witness_name, trialData)}`, data.content);
                break;
                
            case 'witness_complete':
                if (!trialData.testimonies) trialData.testimonies = [];
                trialData.testimonies.push({
                    witness_name: data.witness_name,
                    testimony: data.testimony
                });
                // 移除证人证词的光标
                this._finalizeTrialStep(`testimony-${this._getWitnessIndex(data.witness_name, trialData)}`);
                break;
                
            case 'vote_start':
                // 确保投票容器存在
                let votingContainer = document.getElementById('content-voting');
                if (!votingContainer) {
                    const stepDiv = document.createElement('div');
                    stepDiv.className = 'trial-step';
                    stepDiv.id = 'step-voting';
                    stepDiv.innerHTML = `
                        <div class="step-header">
                            <h3><i class="fas fa-chevron-right"></i> 角色投票</h3>
                        </div>
                        <div class="step-content" id="content-voting"></div>
                    `;
                    trialSteps.appendChild(stepDiv);
                    stepDiv.scrollIntoView({ behavior: 'smooth' });
                    votingContainer = document.getElementById('content-voting');
                }
                
                const voteDiv = document.createElement('div');
                voteDiv.className = 'vote-item';
                voteDiv.id = `vote-${data.index}`;
                voteDiv.innerHTML = `
                    <h4><i class="fas fa-vote-yea"></i> ${data.voter_name} 投票</h4>
                    <div class="vote-content" id="vote-content-${data.index}">
                        <div class="thinking-indicator">
                            <i class="fas fa-brain fa-pulse"></i>
                            <span class="thinking-text">正在分析证据信息，思考中...</span>
                            <div class="thinking-dots">
                                <span>.</span><span>.</span><span>.</span>
                            </div>
                        </div>
                    </div>
                `;
                votingContainer.appendChild(voteDiv);
                break;
                
            case 'vote_chunk':
                // 清除思考提示（如果存在）
                const voteContentElement = document.getElementById(`vote-content-${this._getVoterIndex(data.voter_name, trialData)}`);
                if (voteContentElement && voteContentElement.querySelector('.thinking-indicator')) {
                    voteContentElement.innerHTML = '';
                }
                
                this._appendToTrialContent(`vote-content-${this._getVoterIndex(data.voter_name, trialData)}`, data.content);
                break;
                
            case 'vote_complete':
                if (!trialData.votes) trialData.votes = [];
                trialData.votes.push({
                    voter_name: data.voter_name,
                    vote: data.vote,
                    reason: data.reason
                });
                
                // 更新投票显示
                const voteElement = document.getElementById(`vote-content-${trialData.votes.length - 1}`);
                if (voteElement) {
                    // 先移除光标
                    this._finalizeTrialStep(`vote-content-${this._getVoterIndex(data.voter_name, trialData)}`);
                    
                    // 然后更新显示内容
                    voteElement.className += data.vote === '支持' ? ' vote-support' : ' vote-oppose';
                    voteElement.innerHTML = `
                        <div class="vote-result">
                            <span class="vote-decision ${data.vote === '支持' ? 'support' : 'oppose'}">
                                ${data.vote === '支持' ? '✅ 支持指控' : '❌ 反对指控'}
                            </span>
                        </div>
                        <div class="vote-reason">${data.reason.replace(/\\n/g, '<br/>').replace(/\n/g, '<br/>')}</div>
                    `;
                }
                break;
                
            case 'vote_summary':
                // 确保投票容器存在
                let votingSummaryContainer = document.getElementById('content-voting');
                if (!votingSummaryContainer) {
                    const stepDiv = document.createElement('div');
                    stepDiv.className = 'trial-step';
                    stepDiv.id = 'step-voting';
                    stepDiv.innerHTML = `
                        <div class="step-header">
                            <h3><i class="fas fa-chevron-right"></i> 角色投票</h3>
                        </div>
                        <div class="step-content" id="content-voting"></div>
                    `;
                    trialSteps.appendChild(stepDiv);
                    stepDiv.scrollIntoView({ behavior: 'smooth' });
                    votingSummaryContainer = document.getElementById('content-voting');
                }
                
                votingSummaryContainer.innerHTML += `
                    <div class="vote-summary">
                        <h4>📊 投票统计</h4>
                        <div class="vote-stats">
                            <div class="vote-stat support">
                                <span class="number">${data.vote_summary.support}</span>
                                <span>支持</span>
                            </div>
                            <div class="vote-stat oppose">
                                <span class="number">${data.vote_summary.oppose}</span>
                                <span>反对</span>
                            </div>
                        </div>
                        <p>需要过半数(${Math.floor(data.vote_summary.total / 2) + 1}票)支持才能定罪</p>
                    </div>
                `;
                break;
                
            case 'verdict':
                const verdictClass = data.final_verdict ? 'guilty' : 'innocent';
                const verdictText = data.final_verdict ? '指控成立' : '指控不成立';
                
                // 确保verdict容器存在
                let verdictContainer = document.getElementById('content-verdict');
                if (!verdictContainer) {
                    // 创建审判结果步骤
                    const stepDiv = document.createElement('div');
                    stepDiv.className = 'trial-step';
                    stepDiv.id = 'step-verdict';
                    stepDiv.innerHTML = `
                        <div class="step-header">
                            <h3><i class="fas fa-chevron-right"></i> 最终判决</h3>
                        </div>
                        <div class="step-content" id="content-verdict"></div>
                    `;
                    trialSteps.appendChild(stepDiv);
                    stepDiv.scrollIntoView({ behavior: 'smooth' });
                    verdictContainer = document.getElementById('content-verdict');
                }
                
                verdictContainer.innerHTML = `
                    <div class="verdict" style="color: #495057; background: #f8f9fa; border: 1px solid #dee2e6;">
                        <i class="fas fa-balance-scale"></i>
                        ${verdictText}
                    </div>
                `;
                break;
                
            case 'correctness':
                const correctnessText = data.is_correct ? '🎉 恭喜！你找到了真凶！' : '😔 很遗憾，你指控了错误的人。';
                
                // 确保verdict容器存在
                let correctnessContainer = document.getElementById('content-verdict');
                if (!correctnessContainer) {
                    // 创建审判结果步骤
                    const stepDiv = document.createElement('div');
                    stepDiv.className = 'trial-step';
                    stepDiv.id = 'step-verdict';
                    stepDiv.innerHTML = `
                        <div class="step-header">
                            <h3><i class="fas fa-chevron-right"></i> 最终判决</h3>
                        </div>
                        <div class="step-content" id="content-verdict"></div>
                    `;
                    trialSteps.appendChild(stepDiv);
                    stepDiv.scrollIntoView({ behavior: 'smooth' });
                    correctnessContainer = document.getElementById('content-verdict');
                }
                
                correctnessContainer.innerHTML += `
                    <div class="correctness-indicator">
                        <h3>${correctnessText}</h3>
                    </div>
                `;
                break;
                
            case 'solution_chunk':
                // 确保solution容器存在
                let solutionContainer = document.getElementById('content-solution');
                if (!solutionContainer) {
                    // 创建案件真相步骤
                    const stepDiv = document.createElement('div');
                    stepDiv.className = 'trial-step';
                    stepDiv.id = 'step-solution';
                    stepDiv.innerHTML = `
                        <div class="step-header">
                            <h3><i class="fas fa-chevron-right"></i> 案件真相</h3>
                        </div>
                        <div class="step-content" id="content-solution"></div>
                    `;
                    trialSteps.appendChild(stepDiv);
                    stepDiv.scrollIntoView({ behavior: 'smooth' });
                }
                
                this._appendToTrialContent('content-solution', data.content);
                break;
                
            case 'complete':
                console.log('收到complete事件:', data);
                this._finalizeTrialStep('content-solution');
                
                // 添加操作按钮
                trialSteps.innerHTML += `
                    <div class="trial-actions">
                        <button class="btn primary" onclick="app.goToEvaluation()">
                            <i class="fas fa-star"></i> 游戏评价
                        </button>
                        <button class="btn secondary" onclick="app.showScreen('main-menu')">
                            <i class="fas fa-home"></i> 返回主菜单
                        </button>
                        <button class="btn secondary" onclick="app.startNewGame()">
                            <i class="fas fa-redo"></i> 重新开始
                        </button>
                    </div>
                `;
                console.log('评价按钮已添加');
                break;
                
            case 'error':
                trialSteps.innerHTML += `
                    <div class="trial-error">
                        <h3><i class="fas fa-exclamation-triangle"></i> 错误</h3>
                        <p>${data.message}</p>
                    </div>
                `;
                break;
        }
    }
    
    // 添加内容到审判步骤（内部使用）
    _appendToTrialContent(elementId, content) {
        const element = document.getElementById(elementId);
        if (element) {
            if (!element.querySelector('.streaming-text')) {
                element.innerHTML = '<div class="streaming-text"></div>';
            }
            const streamingText = element.querySelector('.streaming-text');
            
            // 先移除现有光标
            const existingCursor = streamingText.querySelector('.cursor');
            if (existingCursor) {
                existingCursor.remove();
            }
            
            // 获取当前文本内容（不包括HTML标签和光标）
            let currentText = streamingText.innerHTML || '';
            // 移除可能存在的光标HTML
            currentText = currentText.replace(/<span class="cursor">.*?<\/span>/g, '');
            
            // 将换行符转换为HTML换行标签 - 处理各种形式的换行符
            const formattedContent = content
                .replace(/\\n/g, '<br/>')  // 处理转义的换行符 \n
                .replace(/\n/g, '<br/>');  // 处理真实的换行符
            
            // 添加新内容
            streamingText.innerHTML = currentText + formattedContent + '<span class="cursor">|</span>';
        }
    }
    
    // 完成审判步骤（内部使用）
    _finalizeTrialStep(elementId) {
        const element = document.getElementById(elementId);
        if (element) {
            // 移除所有光标元素
            const cursors = element.querySelectorAll('.cursor');
            cursors.forEach(cursor => cursor.remove());
            
            // 额外保险：移除所有包含竖线的span元素
            const spans = element.querySelectorAll('span');
            spans.forEach(span => {
                if (span.textContent === '|' || span.innerHTML === '|') {
                    span.remove();
                }
            });
            
            // 确保换行符被正确处理
            const streamingText = element.querySelector('.streaming-text');
            if (streamingText) {
                let content = streamingText.innerHTML || '';
                // 移除光标相关的HTML
                content = content.replace(/<span class="cursor">.*?<\/span>/g, '');
                // 确保 \n 被转换为 <br/>
                content = content.replace(/\\n/g, '<br/>').replace(/\n/g, '<br/>');
                streamingText.innerHTML = content;
            }
        }
    }
    
    // 获取证人索引（内部使用）
    _getWitnessIndex(witnessName, trialData) {
        if (!trialData.witnessIndexMap) {
            trialData.witnessIndexMap = {};
            trialData.witnessCounter = 0;
        }
        
        if (!(witnessName in trialData.witnessIndexMap)) {
            trialData.witnessIndexMap[witnessName] = trialData.witnessCounter++;
        }
        
        return trialData.witnessIndexMap[witnessName];
    }
    
    // 获取投票者索引（内部使用）
    _getVoterIndex(voterName, trialData) {
        if (!trialData.voterIndexMap) {
            trialData.voterIndexMap = {};
            trialData.voterCounter = 0;
        }
        
        if (!(voterName in trialData.voterIndexMap)) {
            trialData.voterIndexMap[voterName] = trialData.voterCounter++;
        }
        
        return trialData.voterIndexMap[voterName];
    }
    
    // 显示审判结果
    showTrialResult(result) {
        const resultContent = document.getElementById('trial-result-content');
        
        const verdictClass = result.final_verdict ? 'guilty' : 'innocent';
        const verdictText = result.final_verdict ? '指控成立' : '指控不成立';
        const correctnessText = result.is_correct ? '🎉 恭喜！你找到了真凶！' : '😔 很遗憾，你指控了错误的人。';
        
        resultContent.innerHTML = `
            <div class="trial-result">
                <div class="verdict ${verdictClass}">
                    <i class="fas fa-balance-scale"></i>
                    ${verdictText}
                </div>
                
                <div class="correctness-indicator">
                    <h3>${correctnessText}</h3>
                </div>
                
                <div class="defense-section">
                    <h4><i class="fas fa-shield-alt"></i> 被告辩护</h4>
                    <div class="defense-text">${result.accused_defense.replace(/\\n/g, '<br/>').replace(/\n/g, '<br/>')}</div>
                </div>
                
                <div class="testimonies-section">
                    <h4><i class="fas fa-users"></i> 证人证词</h4>
                    ${result.witness_testimonies.map(testimony => `
                        <div class="testimony-item">
                            <div class="testimony-header">${testimony.witness_name}：</div>
                            <div>${testimony.testimony.replace(/\\n/g, '<br/>').replace(/\n/g, '<br/>')}</div>
                        </div>
                    `).join('')}
                </div>
                
                <div class="vote-summary">
                    <h4>投票结果</h4>
                    <div class="vote-stats">
                        <div class="vote-stat support">
                            <span class="number">${result.vote_summary.support}</span>
                            <span>支持</span>
                        </div>
                        <div class="vote-stat oppose">
                            <span class="number">${result.vote_summary.oppose}</span>
                            <span>反对</span>
                        </div>
                    </div>
                    <p>需要过半数(${Math.floor(result.vote_summary.total / 2) + 1}票)支持才能定罪</p>
                </div>
                
                <div class="votes-section">
                    <h4><i class="fas fa-vote-yea"></i> 详细投票</h4>
                    ${result.votes.map(vote => `
                        <div class="vote-item vote-${vote.vote === '支持' ? 'support' : 'oppose'}">
                            <div class="vote-header">${vote.voter_name}：${vote.vote}</div>
                            <div>${vote.reason.replace(/\\n/g, '<br/>').replace(/\n/g, '<br/>')}</div>
                        </div>
                    `).join('')}
                </div>
                
                <div class="solution-section">
                    <h4><i class="fas fa-lightbulb"></i> 案件真相</h4>
                    <div class="solution-text">${result.case_solution.replace(/\\n/g, '<br/>').replace(/\n/g, '<br/>')}</div>
                </div>
                
                <div class="form-actions">
                    <button class="btn primary" onclick="app.goToEvaluation()">
                        <i class="fas fa-star"></i> 游戏评价
                    </button>
                    <button class="btn secondary" onclick="app.showScreen('main-menu')">
                        <i class="fas fa-home"></i> 返回主菜单
                    </button>
                    <button class="btn secondary" onclick="app.startNewGame()">
                        <i class="fas fa-redo"></i> 重新开始
                    </button>
                </div>
            </div>
        `;
        
        this.showScreen('trial-result-screen');
    }
    
    // 跳转到游戏评价页面
    goToEvaluation() {
        if (this.sessionId) {
            window.location.href = `evaluation.html?session_id=${this.sessionId}`;
        } else {
            this.showMessage('错误', '无法获取游戏会话ID，无法进行评价。');
        }
    }

    // 开始新游戏
    startNewGame() {
        // 清理当前会话
        if (this.sessionId) {
            fetch(`${this.apiBase}/game/${this.sessionId}`, {
                method: 'DELETE'
            }).catch(console.error);
        }
        
        // 重置状态
        this.sessionId = null;
        this.currentCase = null;
        this.gameState = null;
        this.selectedCharacter = null;
        this.evidenceList = [];
        
        if (this.websocket) {
            this.websocket.close();
        }
        
        // 显示案例选择
        this.showCaseSelection();
    }
    
    // 获取或创建客户端唯一标识（内部使用）
    _getOrCreateClientId() {
        // 尝试从localStorage中获取现有的客户端ID
        let clientId = localStorage.getItem('detective_game_client_id');
        
        if (!clientId) {
            // 生成新的客户端ID（基于时间戳和随机数）
            const timestamp = Date.now();
            const random = Math.random().toString(36).substring(2, 15);
            const browserInfo = this._getBrowserFingerprint();
            
            clientId = `client_${timestamp}_${random}_${browserInfo}`;
            
            // 保存到localStorage
            localStorage.setItem('detective_game_client_id', clientId);
            this.log(`生成新的客户端ID: ${clientId}`);
        } else {
            this.log(`使用现有客户端ID: ${clientId}`);
        }
        
        return clientId;
    }
    
    // 获取浏览器指纹信息（简化版，内部使用）
    _getBrowserFingerprint() {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        ctx.textBaseline = 'top';
        ctx.font = '14px Arial';
        ctx.fillText('Browser fingerprint', 2, 2);
        
        const fingerprint = [
            navigator.userAgent,
            navigator.language,
            screen.width + 'x' + screen.height,
            new Date().getTimezoneOffset(),
            canvas.toDataURL()
        ].join('|');
        
        // 生成简单的hash
        let hash = 0;
        for (let i = 0; i < fingerprint.length; i++) {
            const char = fingerprint.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // 转换为32位整数
        }
        
        return Math.abs(hash).toString(36);
    }

    // 通用角色卡片模板生成函数（内部使用）
    _createCharacterCardHTML(character, cardType = 'intro') {
        const typeClass = character.character_type;
        const typeText = this._getCharacterTypeText(character.character_type);
        
        switch (cardType) {
            case 'intro':
                return `
                    <div class="intro-character-name">${character.name}</div>
                    <div class="intro-character-occupation">${character.occupation}</div>
                    <div class="intro-character-type ${typeClass}">${typeText}</div>
                `;
            case 'intro-empty':
                return `
                    <div class="intro-character-name"></div>
                    <div class="intro-character-occupation"></div>
                    <div class="intro-character-type ${typeClass}"></div>
                `;
            case 'game':
                return `
                    <div class="character-info-left">
                        <div class="character-name">${character.name}</div>
                        <div class="character-occupation">${character.occupation}</div>
                    </div>
                    <div class="character-type">${typeText}</div>
                `;
            default:
                return this._createCharacterCardHTML(character, 'intro');
        }
    }

    // 通用加载建议模板生成函数（内部使用）
    _createLoadingSuggestionsHTML() {
        return `
            <div class="loading-suggestions">
                <i class="fas fa-spinner fa-spin"></i>
                <span>正在生成参考问题...</span>
                <p style="font-size: 12px; color: #666; margin-top: 5px;">您可以直接在上方输入框中提问，无需等待</p>
            </div>
        `;
    }

    // 通用对话项目模板生成函数（内部使用）
    _createConversationItemHTML(question, response = null) {
        if (response) {
            // 完整的对话项目（问题+回答）
            return `
                <div class="question">${question}</div>
                <div class="response">${response}</div>
            `;
        } else {
            // 只有问题的对话项目
            return `
                <div class="question">${question}</div>
            `;
        }
    }
}

// 初始化应用
let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new DetectiveGameApp();
}); 