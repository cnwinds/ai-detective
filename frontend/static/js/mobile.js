// 手机端侦探游戏应用
class MobileDetectiveApp {
    constructor() {
        this.apiBase = '/api';
        this.sessionId = null;
        this.currentCase = null;
        this.gameState = null;
        this.selectedCharacter = null;
        this.evidenceList = [];
        this.conversationHistory = [];
        this.hintsHistory = [];
        this.activeTab = 'characters';
        this.websocket = null;
        this.clientId = this._getOrCreateClientId();
        this.skipTypewriter = false;
        this.evidenceList = [];
        this.conversationHistory = [];
        this.hintsHistory = [];
        this.selectedCharacter = null;
        
        // 初始化
        this.init();
    }
    
    async init() {
        try {
            this.bindEvents();
            await this.loadVersionInfo();
            
            // 模拟加载时间
            setTimeout(() => {
                this.hideLoadingScreen();
            }, 2000);
            
        } catch (error) {
            console.error('初始化失败:', error);
            this.hideLoadingScreen();
        }
    }
    
    async loadVersionInfo() {
        try {
            const response = await fetch(`${this.apiBase}/version`);
            const versionInfo = await response.json();
            
            // 更新移动端页面底部的版本显示
            const mobileVersionElement = document.getElementById('mobile-version-info');
            if (mobileVersionElement) {
                mobileVersionElement.textContent = `AI Detective Game v${versionInfo.version}`;
            }
            
            // 兼容原有的app-version元素（如果存在）
            const versionElement = document.getElementById('app-version');
            if (versionElement) {
                versionElement.textContent = `v${versionInfo.version}`;
            }
            
            console.log(`移动端版本信息加载成功: ${versionInfo.version}`);
        } catch (error) {
            console.error('加载版本信息失败:', error);
        }
    }
    
    bindEvents() {
        // 主菜单
        document.getElementById('start-game-main-btn').addEventListener('click', () => this.showCaseSelection());
        document.getElementById('rules-btn').addEventListener('click', () => this.showRules());
        document.getElementById('about-btn').addEventListener('click', () => this.showAbout());
        
        // 案件选择
        document.getElementById('back-to-menu').addEventListener('click', () => this.showScreen('main-menu'));
        
        // 游戏界面
        document.getElementById('case-info-btn').addEventListener('click', () => this.showCaseInfo());
        document.getElementById('menu-btn').addEventListener('click', () => this.showGameMenu());
        
        // 标签切换
        document.getElementById('characters-tab').addEventListener('click', () => this.switchTab('characters'));
        document.getElementById('chat-tab').addEventListener('click', () => this.switchTab('chat'));
        document.getElementById('evidence-tab').addEventListener('click', () => this.switchTab('evidence'));
        document.getElementById('notes-tab').addEventListener('click', () => this.switchTab('notes'));
        
        // 操作按钮
        document.getElementById('get-hint-btn').addEventListener('click', () => this.getHint());
        document.getElementById('make-accusation-btn').addEventListener('click', () => this.makeAccusation());
        
        // 对话
        document.getElementById('clear-chat-btn').addEventListener('click', () => this.clearConversation());
        document.getElementById('send-question-btn').addEventListener('click', () => this.askQuestion());
        document.getElementById('question-input').addEventListener('input', (e) => this.handleQuestionInput(e));
        document.getElementById('question-input').addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.askQuestion();
            }
        });
        
        // 笔记
        document.getElementById('clear-notes-btn').addEventListener('click', () => this.clearNotes());
        
        // 模态框
        document.getElementById('close-modal').addEventListener('click', () => this.hideModal());
        
        // 案情介绍页面
        document.getElementById('skip-intro-btn').addEventListener('click', () => this.skipIntroduction());
        document.getElementById('start-game-btn').addEventListener('click', () => this.startGameFromIntro());
        
        // 禁止页面滚动和缩放
        document.addEventListener('touchmove', (e) => {
            e.preventDefault();
        }, { passive: false });
        
        document.addEventListener('gesturestart', (e) => {
            e.preventDefault();
        });
    }
    
    showScreen(screenId) {
        document.querySelectorAll('.mobile-screen').forEach(screen => {
            screen.classList.remove('active');
        });
        document.getElementById(screenId).classList.add('active');
    }
    
    hideLoadingScreen() {
        this.showScreen('main-menu');
    }
    
    async showCaseSelection() {
        this.showScreen('case-selection');
        await this.loadCases();
    }
    
    async loadCases() {
        try {
            const response = await fetch(`${this.apiBase}/game/cases`);
            const data = await response.json();
            
            if (data.success) {
                this.renderCases(data.cases);
            } else {
                this.showToast('加载案件失败', 'error');
            }
        } catch (error) {
            console.error('加载案件失败:', error);
            this.showToast('网络错误', 'error');
        }
    }
    
    renderCases(cases) {
        const casesList = document.getElementById('cases-list');
        casesList.innerHTML = '';
        
        cases.forEach((caseData, index) => {
            const caseCard = document.createElement('div');
            caseCard.className = 'case-card';
            caseCard.innerHTML = `
                <h3>${caseData.title}</h3>
                <p>${this.truncateText(caseData.description, 100)}</p>
                <div class="case-meta">
                    <span class="badge badge-difficulty">${this.getDifficultyText(caseData.difficulty)}</span>
                    <span class="badge badge-category">${this.getCategoryText(caseData.category)}</span>
                </div>
            `;
            
            caseCard.addEventListener('click', () => this.startGame(index));
            casesList.appendChild(caseCard);
        });
    }
    
    async startGame(caseIndex) {
        try {
            const response = await fetch(`${this.apiBase}/game/start`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ 
                    case_index: caseIndex,
                    client_id: this.clientId
                }),
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.sessionId = data.session_id;
                this.currentCase = data.case;
                this.gameState = data.game_state;
                
                // 显示案情介绍而不是直接进入游戏
                this.showCaseIntroduction();
            } else {
                this.showToast('启动游戏失败', 'error');
            }
        } catch (error) {
            console.error('启动游戏失败:', error);
            this.showToast('网络错误', 'error');
        }
    }
    
    initializeGame() {
        document.getElementById('game-case-title').textContent = this.currentCase.title;
        this.renderCharacters();
        this.updateGameStats();
        this.connectWebSocket();
        this.initializeChatPanel();
        this.evidenceList = [];
        this.updateEvidenceDisplay();
    }
    
    renderCharacters() {
        const charactersGrid = document.getElementById('characters-grid');
        charactersGrid.innerHTML = '';
        
        this.currentCase.characters.forEach(character => {
            const characterCard = document.createElement('div');
            characterCard.className = 'character-card';
            characterCard.innerHTML = `
                <div class="character-avatar">
                    <i class="fas fa-user"></i>
                </div>
                <div class="character-name">${character.name}</div>
                <div class="character-occupation">${character.occupation}</div>
                <div class="character-type ${character.character_type}">${this.getCharacterTypeText(character.character_type)}</div>
            `;
            
            characterCard.addEventListener('click', () => this.selectCharacter(character));
            charactersGrid.appendChild(characterCard);
        });
    }
    
    selectCharacter(character) {
        // 更新选中状态
        document.querySelectorAll('.character-card').forEach(card => {
            card.classList.remove('selected');
        });
        
        event.currentTarget.classList.add('selected');
        
        this.selectedCharacter = character;
        
        // 切换到对话面板
        this.switchTab('chat');
        
        // 更新对话头部
        this.updateChatHeader(character);
        
        // 加载建议问题
        this.loadSuggestedQuestions(character);
    }
    
    switchTab(tabName) {
        // 更新标签状态
        document.querySelectorAll('.tab-btn').forEach(tab => {
            tab.classList.remove('active');
        });
        document.getElementById(`${tabName}-tab`).classList.add('active');
        
        // 显示对应面板
        document.querySelectorAll('.content-panel').forEach(panel => {
            panel.classList.remove('active');
        });
        document.getElementById(`${tabName}-panel`).classList.add('active');
        
        this.activeTab = tabName;
        
        if (tabName === 'chat') {
            this.clearUnreadBadge();
        }
        
        // 如果切换到角色标签，确保角色已渲染
        if (tabName === 'characters' && this.currentCase && this.currentCase.characters) {
            this.renderCharacters();
        }
    }
    
    updateChatHeader(character) {
        document.getElementById('chat-character-name').textContent = character.name;
        document.getElementById('chat-character-role').textContent = character.occupation;
    }
    
    initializeChatPanel() {
        const conversationArea = document.getElementById('conversation-area');
        conversationArea.innerHTML = `
            <div class="welcome-message">
                <i class="fas fa-comments"></i>
                <p>选择一个角色开始询问</p>
            </div>
        `;
    }
    
    async loadSuggestedQuestions(character) {
        try {
            const response = await fetch(`${this.apiBase}/game/suggested-questions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    session_id: this.sessionId,
                    character_name: character.name
                }),
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.renderSuggestedQuestions(data.questions);
            }
        } catch (error) {
            console.error('加载建议问题失败:', error);
        }
    }
    
    renderSuggestedQuestions(questions) {
        const suggestionsList = document.getElementById('suggested-list');
        suggestionsList.innerHTML = '';
        
        questions.forEach(question => {
            const suggestionBtn = document.createElement('button');
            suggestionBtn.className = 'suggested-question';
            suggestionBtn.textContent = question;
            suggestionBtn.addEventListener('click', () => {
                document.getElementById('question-input').value = question;
                this.handleQuestionInput({ target: { value: question } });
            });
            
            suggestionsList.appendChild(suggestionBtn);
        });
    }
    
    handleQuestionInput(e) {
        const input = e.target;
        const sendBtn = document.getElementById('send-question-btn');
        
        sendBtn.disabled = input.value.trim().length === 0;
        
        // 自动调整高度
        input.style.height = 'auto';
        input.style.height = Math.min(input.scrollHeight, 100) + 'px';
    }
    
    async askQuestion() {
        const questionInput = document.getElementById('question-input');
        const question = questionInput.value.trim();
        
        if (!question || !this.selectedCharacter) {
            this.showToast('请选择角色并输入问题', 'warning');
            return;
        }
        
        questionInput.value = '';
        this.handleQuestionInput({ target: { value: '' } });
        
        this.addQuestionToConversation(question);
        
        try {
            const response = await fetch(`${this.apiBase}/game/ask-question-stream`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    session_id: this.sessionId,
                    character_name: this.selectedCharacter.name,
                    question: question
                }),
            });
            
            if (!response.ok) {
                throw new Error('网络请求失败');
            }
            
            const responseContainer = this.createResponseContainer();
            let fullResponse = '';
            
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                
                const chunk = decoder.decode(value);
                const lines = chunk.split('\n');
                
                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        try {
                            const data = JSON.parse(line.slice(6));
                            
                            if (data.type === 'response_chunk') {
                                fullResponse += data.content;
                                this.updateResponseContainer(responseContainer, fullResponse);
                            } else if (data.type === 'evidence') {
                                this.addEvidence(data.evidence);
                            } else if (data.type === 'complete') {
                                this.completeResponse(responseContainer, fullResponse);
                                this.updateGameStats();
                            }
                        } catch (e) {
                            console.error('解析数据失败:', e);
                        }
                    }
                }
            }
            
        } catch (error) {
            console.error('询问失败:', error);
            this.showToast('询问失败，请重试', 'error');
        }
    }
    
    addQuestionToConversation(question) {
        const conversationArea = document.getElementById('conversation-area');
        
        const welcomeMessage = conversationArea.querySelector('.welcome-message');
        if (welcomeMessage) {
            welcomeMessage.remove();
        }
        
        const conversationItem = document.createElement('div');
        conversationItem.className = 'conversation-item';
        conversationItem.innerHTML = `
            <div class="question">${question}</div>
        `;
        
        conversationArea.appendChild(conversationItem);
        conversationArea.scrollTop = conversationArea.scrollHeight;
    }
    
    createResponseContainer() {
        const conversationArea = document.getElementById('conversation-area');
        const responseDiv = document.createElement('div');
        responseDiv.className = 'response streaming';
        responseDiv.innerHTML = '<span class="cursor">|</span>';
        
        const lastItem = conversationArea.lastElementChild;
        if (lastItem) {
            lastItem.appendChild(responseDiv);
        }
        
        conversationArea.scrollTop = conversationArea.scrollHeight;
        return responseDiv;
    }
    
    updateResponseContainer(container, text) {
        container.innerHTML = text + '<span class="cursor">|</span>';
        const conversationArea = document.getElementById('conversation-area');
        conversationArea.scrollTop = conversationArea.scrollHeight;
    }
    
    completeResponse(container, text) {
        container.innerHTML = text;
        container.classList.remove('streaming');
        
        if (this.activeTab !== 'chat') {
            this.showUnreadBadge();
        }
    }
    
    addEvidence(evidence) {
        this.evidenceList.push(evidence);
        this.updateEvidenceDisplay();
        this.showToast(`发现新证据：${evidence.name}`, 'success');
    }
    
    updateEvidenceDisplay() {
        const evidenceList = document.getElementById('evidence-list');
        
        if (this.evidenceList.length === 0) {
            evidenceList.innerHTML = `
                <div class="no-evidence">
                    <i class="fas fa-search"></i>
                    <p>还没有收集到证据</p>
                    <small>通过询问角色来发现线索</small>
                </div>
            `;
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
    
    updateGameStats() {
        // 更新游戏统计信息（移动端暂时不显示具体统计）
        console.log(`游戏统计 - 问题: ${this.conversationHistory.length}, 证据: ${this.evidenceList.length}, 提示: ${this.hintsHistory.length}`);
    }
    
    async getHint() {
        try {
            const response = await fetch(`${this.apiBase}/game/get-hint`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    session_id: this.sessionId
                }),
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.hintsHistory.push(data.hint);
                this.updateGameStats();
                this.showModal('提示', data.hint);
            } else {
                this.showToast('获取提示失败', 'error');
            }
        } catch (error) {
            console.error('获取提示失败:', error);
            this.showToast('网络错误', 'error');
        }
    }
    
    async makeAccusation() {
        this.showToast('指控功能开发中...', 'info');
    }
    
    clearConversation() {
        const conversationArea = document.getElementById('conversation-area');
        conversationArea.innerHTML = `
            <div class="welcome-message">
                <i class="fas fa-comments"></i>
                <p>选择一个角色开始询问</p>
            </div>
        `;
        this.conversationHistory = [];
    }
    
    clearNotes() {
        document.getElementById('notes-area').value = '';
    }
    
    showUnreadBadge() {
        document.getElementById('unread-badge').style.display = 'block';
    }
    
    clearUnreadBadge() {
        document.getElementById('unread-badge').style.display = 'none';
    }
    
    connectWebSocket() {
        if (this.websocket) {
            this.websocket.close();
        }
        
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/ws/${this.sessionId}`;
        
        this.websocket = new WebSocket(wsUrl);
        
        this.websocket.onopen = () => {
            console.log('WebSocket连接已建立');
        };
        
        this.websocket.onmessage = (event) => {
            const data = JSON.parse(event.data);
            this.handleWebSocketMessage(data);
        };
        
        this.websocket.onerror = (error) => {
            console.error('WebSocket错误:', error);
        };
        
        this.websocket.onclose = () => {
            console.log('WebSocket连接已关闭');
        };
    }
    
    handleWebSocketMessage(data) {
        console.log('收到WebSocket消息:', data);
    }
    
    showModal(title, content) {
        document.getElementById('modal-title').textContent = title;
        document.getElementById('modal-body').innerHTML = content;
        document.getElementById('modal').classList.add('active');
    }
    
    hideModal() {
        document.getElementById('modal').classList.remove('active');
    }
    
    showToast(message, type = 'info') {
        const toast = document.getElementById('toast');
        const icon = document.getElementById('toast-icon');
        const messageSpan = document.getElementById('toast-message');
        
        const iconClass = {
            'success': 'fas fa-check-circle',
            'error': 'fas fa-exclamation-circle',
            'warning': 'fas fa-exclamation-triangle',
            'info': 'fas fa-info-circle'
        }[type] || 'fas fa-info-circle';
        
        icon.className = iconClass;
        messageSpan.textContent = message;
        
        toast.classList.add('show');
        
        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }
    
    showRules() {
        const rulesContent = `
            <h4>游戏规则</h4>
            <p>1. 选择案件开始调查</p>
            <p>2. 与相关人员对话收集线索</p>
            <p>3. 分析证据找出真相</p>
            <p>4. 在掌握足够证据后提出指控</p>
            <p>5. 法庭将根据你的推理进行判决</p>
        `;
        this.showModal('游戏规则', rulesContent);
    }
    
    showAbout() {
        const aboutContent = `
            <h4>关于游戏</h4>
            <p>这是一款基于AI的侦探推理游戏，考验你的逻辑推理能力。</p>
            <p>通过与角色对话，收集线索，分析证据，最终找出真正的凶手。</p>
        `;
        this.showModal('关于游戏', aboutContent);
    }
    
    showCaseInfo() {
        if (!this.currentCase) return;
        
        const caseInfo = `
            <h4>${this.currentCase.title}</h4>
            <p><strong>受害者：</strong>${this.currentCase.victim_name}</p>
            <p><strong>案发地点：</strong>${this.currentCase.crime_scene}</p>
            <p><strong>案发时间：</strong>${this.currentCase.time_of_crime}</p>
            <p><strong>案情描述：</strong></p>
            <p>${this.currentCase.description}</p>
        `;
        this.showModal('案件信息', caseInfo);
    }
    
    showGameMenu() {
        this.showToast('游戏菜单功能开发中...', 'info');
    }
    
    // 工具方法
    truncateText(text, maxLength) {
        return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
    }
    
    getDifficultyText(difficulty) {
        const difficultyMap = {
            'easy': '简单',
            'medium': '中等',
            'hard': '困难',
            'expert': '专家'
        };
        return difficultyMap[difficulty] || difficulty;
    }
    
    getCategoryText(category) {
        const categoryMap = {
            'murder': '谋杀案',
            'theft': '盗窃案',
            'fraud': '诈骗案',
            'mystery': '悬疑案'
        };
        return categoryMap[category] || category;
    }
    
    getCharacterTypeText(type) {
        const typeMap = {
            'suspect': '嫌疑人',
            'witness': '证人',
            'victim': '受害者',
            'expert': '专家'
        };
        return typeMap[type] || type;
    }
    
    _getOrCreateClientId() {
        let clientId = localStorage.getItem('detective_client_id');
        if (!clientId) {
            clientId = 'mobile_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            localStorage.setItem('detective_client_id', clientId);
        }
        return clientId;
    }
    
    // 案情介绍相关方法
    showCaseIntroduction() {
        this.showScreen('case-intro-screen');
        this.skipTypewriter = false;
        this.startTypewriterSequence();
    }
    
    async startTypewriterSequence() {
        const introContent = document.getElementById('intro-content');
        introContent.innerHTML = '';
        
        // 创建内容结构
        const content = this.generateIntroContent();
        
        // 开始打字机效果
        await this.typewriterSequence(content);
        
        // 启用开始游戏按钮
        document.getElementById('start-game-btn').disabled = false;
    }
    
    generateIntroContent() {
        const victim = this.currentCase.characters.find(char => 
            char.name === this.currentCase.victim_name && char.character_type === 'victim'
        );
        
        return [
            {
                type: 'title',
                text: this.currentCase.title,
                delay: 1000
            },
            {
                type: 'subtitle',
                text: '案件详情',
                delay: 800
            },
            {
                type: 'detail',
                label: '受害者',
                text: this.currentCase.victim_name,
                delay: 500
            },
            {
                type: 'detail',
                label: '年龄职业',
                text: victim ? `${victim.age}岁，${victim.occupation}` : '信息不详',
                delay: 500
            },
            {
                type: 'detail',
                label: '案发时间',
                text: this.currentCase.time_of_crime,
                delay: 500
            },
            {
                type: 'detail',
                label: '案发地点',
                text: this.currentCase.crime_scene,
                delay: 500
            },
            {
                type: 'subtitle',
                text: '案情概述',
                delay: 800
            },
            {
                type: 'text',
                text: this.currentCase.description,
                delay: 1000
            },
            {
                type: 'subtitle',
                text: '相关人员',
                delay: 800
            },
            ...this.currentCase.characters.map(char => ({
                type: 'character',
                character: char,
                delay: 600
            })),
            {
                type: 'subtitle',
                text: '调查目标',
                delay: 800
            },
            {
                type: 'text',
                text: '通过与相关人员对话，收集线索和证据，分析案件真相，最终找出真正的凶手。',
                delay: 800
            }
        ];
    }
    
    async typewriterSequence(content) {
        const introContent = document.getElementById('intro-content');
        
        for (const item of content) {
            if (this.skipTypewriter) break;
            
            const element = this.createElement(item);
            introContent.appendChild(element);
            
            // 滚动到当前元素
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            
            await this.typewriterEffect(element, item);
            await this.delay(item.delay);
        }
    }
    
    createElement(item) {
        const div = document.createElement('div');
        div.className = 'intro-section scroll-target';
        
        switch (item.type) {
            case 'title':
                div.innerHTML = `<h1 class="intro-title"></h1>`;
                break;
            case 'subtitle':
                div.innerHTML = `<h2 class="intro-subtitle"></h2>`;
                break;
            case 'detail':
                div.innerHTML = `<div class="intro-detail"><strong>${item.label}：</strong><span class="detail-text"></span></div>`;
                break;
            case 'text':
                div.innerHTML = `<p class="intro-text"></p>`;
                break;
            case 'character':
                const char = item.character;
                const typeText = this.getCharacterTypeText(char.character_type);
                div.innerHTML = `
                    <div class="character-intro">
                        <h4 class="char-name"></h4>
                        <p class="char-info"><strong>职业：</strong><span class="char-occupation"></span></p>
                        <p class="char-type"><strong>身份：</strong><span class="char-type-text"></span></p>
                        <p class="char-background"><strong>背景：</strong><span class="char-bg-text"></span></p>
                    </div>
                `;
                break;
        }
        
        return div;
    }
    
    async typewriterEffect(element, item) {
        if (this.skipTypewriter) return;
        
        switch (item.type) {
            case 'title':
                await this.typeText(element.querySelector('.intro-title'), item.text, 80);
                break;
            case 'subtitle':
                await this.typeText(element.querySelector('.intro-subtitle'), item.text, 60);
                break;
            case 'detail':
                await this.typeText(element.querySelector('.detail-text'), item.text, 50);
                break;
            case 'text':
                await this.typeText(element.querySelector('.intro-text'), item.text, 30);
                break;
            case 'character':
                const char = item.character;
                await this.typeText(element.querySelector('.char-name'), char.name, 60);
                await this.delay(200);
                await this.typeText(element.querySelector('.char-occupation'), char.occupation, 50);
                await this.delay(200);
                await this.typeText(element.querySelector('.char-type-text'), this.getCharacterTypeText(char.character_type), 50);
                await this.delay(200);
                await this.typeText(element.querySelector('.char-bg-text'), char.background, 40);
                break;
        }
    }
    
    async typeText(element, text, speed) {
        if (this.skipTypewriter) {
            element.textContent = text;
            return;
        }
        
        element.innerHTML = '';
        
        // 添加光标
        const cursor = document.createElement('span');
        cursor.className = 'typewriter-cursor';
        cursor.textContent = '|';
        element.appendChild(cursor);
        
        // 逐字显示
        for (let i = 0; i < text.length; i++) {
            if (this.skipTypewriter) {
                element.textContent = text;
                return;
            }
            
            await new Promise(resolve => setTimeout(resolve, speed));
            
            const textNode = document.createTextNode(text[i]);
            element.insertBefore(textNode, cursor);
        }
        
        // 移除光标
        cursor.remove();
    }
    
    async delay(ms) {
        if (this.skipTypewriter) return;
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    skipIntroduction() {
        this.skipTypewriter = true;
        
        // 立即显示所有内容
        const content = this.generateIntroContent();
        const introContent = document.getElementById('intro-content');
        introContent.innerHTML = '';
        
        content.forEach(item => {
            const element = this.createElement(item);
            introContent.appendChild(element);
            
            // 立即填充内容，不使用打字机效果
            switch (item.type) {
                case 'title':
                    element.querySelector('.intro-title').textContent = item.text;
                    break;
                case 'subtitle':
                    element.querySelector('.intro-subtitle').textContent = item.text;
                    break;
                case 'detail':
                    element.querySelector('.detail-text').textContent = item.text;
                    break;
                case 'text':
                    element.querySelector('.intro-text').textContent = item.text;
                    break;
                case 'character':
                    const char = item.character;
                    element.querySelector('.char-name').textContent = char.name;
                    element.querySelector('.char-occupation').textContent = char.occupation;
                    element.querySelector('.char-type-text').textContent = this.getCharacterTypeText(char.character_type);
                    element.querySelector('.char-bg-text').textContent = char.background;
                    break;
            }
        });
        
        // 启用开始游戏按钮
        document.getElementById('start-game-btn').disabled = false;
        
        // 滚动到底部
        setTimeout(() => {
            introContent.scrollTop = introContent.scrollHeight;
        }, 100);
    }
    
    startGameFromIntro() {
        // 初始化游戏并进入游戏界面
        this.initializeGame();
        this.showScreen('game-screen');
    }
}

// 页面加载完成后初始化应用
document.addEventListener('DOMContentLoaded', () => {
    new MobileDetectiveApp();
}); 