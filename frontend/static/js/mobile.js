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
        this.chatHistory = {}; // 存储每个角色的聊天历史
        this.questionCount = 0; // 当前使用的聊天次数
        this.maxQuestions = 30; // 总聊天次数限制，将从服务器获取
        
        // 滚动控制
        this.scrollTimer = null;
        this.lastScrollTime = 0;
        this.scrollThrottle = 200; // 减少到200ms
        this.isScrolling = false;
        
        // 内容监听器
        this.contentObserver = null;
        this.observedElements = new Set();
        
        // 初始化
        this.init();
    }
    
    async init() {
        try {
            this.bindEvents();
            await this.loadVersionInfo();
            
            // 模拟加载时间，但只在仍在加载屏幕时才跳转
            setTimeout(() => {
                // 只有当前屏幕是加载屏幕时才自动跳转到主菜单
                const loadingScreen = document.querySelector('#loading-screen');
                if (loadingScreen && loadingScreen.classList.contains('active')) {
                    this.hideLoadingScreen();
                }
            }, 2000);
            
        } catch (error) {
            console.error('初始化失败:', error);
            // 错误情况下也要检查是否还在加载屏幕
            const loadingScreen = document.querySelector('#loading-screen');
            if (loadingScreen && loadingScreen.classList.contains('active')) {
                this.hideLoadingScreen();
            }
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
        // 安全绑定事件的辅助函数
        const safeBindEvent = (id, event, handler) => {
            const element = document.getElementById(id);
            if (element) {
                element.addEventListener(event, handler);
            } else {
                console.warn(`元素 ${id} 不存在，跳过事件绑定`);
            }
        };

        // 主菜单
        safeBindEvent('start-game-main-btn', 'click', () => this.showCaseSelection());
        safeBindEvent('rules-btn', 'click', () => this.showRules());
        safeBindEvent('about-btn', 'click', () => this.showAbout());
        
        // 案件选择
        safeBindEvent('back-to-menu', 'click', () => this.showScreen('main-menu'));
        
        // 游戏界面 - 新的侧边栏菜单系统
        safeBindEvent('sidebar-menu-btn', 'click', () => this.toggleSidebarMenu());
        safeBindEvent('close-menu-btn', 'click', () => this.closeSidebarMenu());
        safeBindEvent('menu-overlay', 'click', () => this.closeSidebarMenu());
        
        // 菜单项
        safeBindEvent('case-details-btn', 'click', () => this.showCaseDetails());
        safeBindEvent('evidence-menu-btn', 'click', () => this.showEvidence());
        safeBindEvent('notes-menu-btn', 'click', () => this.showNotes());
        
        // 模态内容关闭
        safeBindEvent('close-modal-content', 'click', () => this.closeModalContent());
        
        // 操作按钮
        safeBindEvent('get-hint-btn', 'click', () => this.getHint());
        safeBindEvent('make-accusation-btn', 'click', () => this.makeAccusation());
        
        // 指控界面事件
        safeBindEvent('back-from-accusation', 'click', () => this.showScreen('game-screen'));
        safeBindEvent('mobile-submit-accusation-btn', 'click', () => this.submitAccusation());
        safeBindEvent('mobile-cancel-accusation-btn', 'click', () => this.showScreen('game-screen'));
        
        // 对话
        safeBindEvent('clear-chat-btn', 'click', () => this.clearConversation());
        safeBindEvent('send-question-btn', 'click', () => this.askQuestion());
        safeBindEvent('question-input', 'input', (e) => this.handleQuestionInput(e));
        safeBindEvent('question-input', 'keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.askQuestion();
            }
        });
        
        // 笔记
        safeBindEvent('clear-notes-btn', 'click', () => this.clearNotes());
        
        // 模态框
        safeBindEvent('close-modal', 'click', () => this.hideModal());
        
        // 案情介绍页面
        safeBindEvent('skip-intro-btn', 'click', () => {
            console.log('跳过介绍按钮被点击');
            this.skipIntroduction();
        });
        
        safeBindEvent('start-game-btn', 'click', () => {
            console.log('开始游戏按钮被点击');
            this.startGameFromIntro();
        });
        
        // 禁止页面滚动和缩放（但允许按钮点击）
        document.addEventListener('touchmove', (e) => {
            // 允许按钮和可滚动区域的触摸事件
            if (e.target.closest('button') || 
                e.target.closest('.intro-content') || 
                e.target.closest('.conversation-area') ||
                e.target.closest('textarea')) {
                return;
            }
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
            const response = await fetch(`${this.apiBase}/cases`);
            const cases = await response.json();
            
            if (response.ok && Array.isArray(cases)) {
                this.renderCases(cases);
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
        
        cases.forEach((caseData) => {
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
            
            caseCard.addEventListener('click', () => this.startGame(caseData.index));
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
            
            if (response.ok && data.session_id) {
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
    
    async initializeGame() {
        document.getElementById('game-case-title').textContent = this.currentCase.title;
        this.generateCharacterMenu();
        this.updateGameStats();
        this.connectWebSocket();
        this.evidenceList = [];
        this.updateEvidenceDisplay();
        
        // 获取游戏状态信息
        await this.loadGameState();
        
        // 初始化发送按钮计数
        this.updateSendButtonCounter();
        
        // 默认显示案件详情
        this.showCaseDetails();
    }
    
    async loadGameState() {
        try {
            const response = await fetch(`${this.apiBase}/game/${this.sessionId}/state`);
            if (response.ok) {
                const gameState = await response.json();
                this.questionCount = gameState.current_round || 0;
                this.maxQuestions = gameState.max_rounds || 30;
                console.log(`游戏状态加载成功 - 当前轮次: ${this.questionCount}/${this.maxQuestions}`);
            } else {
                console.warn('获取游戏状态失败，使用默认值');
            }
        } catch (error) {
            console.error('加载游戏状态失败:', error);
        }
    }
    
    renderCharacters() {
        const charactersGrid = document.getElementById('characters-grid');
        // 如果元素不存在，直接返回（新的菜单系统不需要这个方法）
        if (!charactersGrid) {
            console.log('characters-grid element not found, using new menu system');
            return;
        }
        
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
        
        // 使用新的选择角色方法
        this.selectCharacterForChat(character);
    }
    
    // 新的菜单系统方法
    toggleSidebarMenu() {
        const menu = document.getElementById('sidebar-menu');
        const overlay = document.getElementById('menu-overlay');
        
        menu.classList.toggle('show');
        overlay.classList.toggle('show');
    }
    
    closeSidebarMenu() {
        const menu = document.getElementById('sidebar-menu');
        const overlay = document.getElementById('menu-overlay');
        
        menu.classList.remove('show');
        overlay.classList.remove('show');
    }
    
    generateCharacterMenu() {
        const characterMenuList = document.getElementById('character-menu-list');
        characterMenuList.innerHTML = '';
        
        if (this.currentCase && this.currentCase.characters) {
            // 过滤掉被害人，只显示可以对话的角色
            const availableCharacters = this.currentCase.characters.filter(character => 
                character.character_type !== 'victim'
            );
            
            availableCharacters.forEach(character => {
                const characterBtn = document.createElement('button');
                characterBtn.className = 'character-menu-item';
                characterBtn.innerHTML = `
                    <div class="character-avatar">
                        ${character.name.charAt(0)}
                    </div>
                    <div class="character-info">
                        <div class="character-name">${character.name}</div>
                        <div class="character-role">${character.occupation}</div>
                    </div>
                `;
                
                characterBtn.addEventListener('click', () => {
                    this.selectCharacterForChat(character);
                    this.closeSidebarMenu();
                });
                
                characterMenuList.appendChild(characterBtn);
            });
        }
    }
    
    selectCharacterForChat(character) {
        this.selectedCharacter = character;
        
        // 关闭模态内容，显示聊天界面
        this.closeModalContent();
        
        // 更新对话头部
        this.updateChatHeader(character);
        
        // 显示该角色的历史聊天记录
        this.loadCharacterChatHistory(character);
        
        // 显示底部输入区域
        const bottomInput = document.getElementById('bottom-input');
        if (bottomInput) {
            bottomInput.style.display = 'block';
        }
        
        // 显示建议问题加载状态
        this.showSuggestedQuestionsLoading();
        
        // 延迟加载建议问题，确保界面已经显示
        setTimeout(() => {
            this.loadSuggestedQuestions(character);
        }, 100);
    }
    
    showCaseDetails() {
        const modalArea = document.getElementById('modal-content-area');
        const modalTitle = document.getElementById('modal-content-title');
        const modalBody = document.getElementById('modal-content-body');
        
        modalTitle.textContent = '案件详情';
        
        // 获取受害者信息
        const victim = this.currentCase.characters.find(char => 
            char.character_type === 'victim' || char.name === this.currentCase.victim_name
        );
        
        modalBody.innerHTML = `
            <div class="case-details-content">
                
                <div class="case-basic-info">
                    <p><strong>受害者：</strong>${this.currentCase.victim_name || '未知'}</p>
                    <p><strong>案发时间：</strong>${this.currentCase.time_of_crime || '时间不详'}</p>
                    <p><strong>案发地点：</strong>${this.currentCase.crime_scene || '地点不详'}</p>
                </div>
                
                <div class="case-description">
                    <h4>案件描述</h4>
                    <p>${this.currentCase.description}</p>
                </div>
                
                <div class="characters-section">
                    <h4>相关人员</h4>
                    <div class="characters-list">
                        ${this.currentCase.characters.map(char => `
                            <div class="character-item ${char.character_type === 'victim' ? 'victim-item' : 'interactive-item'}" 
                                 ${char.character_type !== 'victim' ? `onclick="mobileApp.selectCharacterFromDetails('${char.name}')"` : ''}>
                                <div class="character-main-info">
                                    <strong>${char.name}</strong>
                                    <span class="character-occupation">${char.occupation}</span>
                                </div>
                                <span class="character-type-badge ${char.character_type}">
                                    ${this.getCharacterTypeText(char.character_type)}
                                </span>
                                ${char.character_type !== 'victim' ? '<i class="fas fa-chevron-right"></i>' : ''}
                            </div>
                        `).join('')}
                    </div>
                </div>
                
                <div class="case-objectives">
                    <h4>调查目标</h4>
                    <ul>
                        <li>通过与相关人员对话收集线索</li>
                        <li>分析证据找出矛盾之处</li>
                        <li>确定真正的凶手并提出指控</li>
                    </ul>
                </div>
            </div>
        `;
        
        // 隐藏底部输入区域
        const bottomInput = document.getElementById('bottom-input');
        if (bottomInput) {
            bottomInput.style.display = 'none';
        }
        
        modalArea.style.display = 'flex';
        this.closeSidebarMenu();
    }
    
    showEvidence() {
        const modalArea = document.getElementById('modal-content-area');
        const modalTitle = document.getElementById('modal-content-title');
        const modalBody = document.getElementById('modal-content-body');
        
        modalTitle.textContent = '发现的证据';
        
        if (this.evidenceList.length === 0) {
            modalBody.innerHTML = `
                <div class="no-evidence">
                    <i class="fas fa-search"></i>
                    <p>暂无发现的证据</p>
                    <small>通过询问角色来发现线索和证据</small>
                </div>
            `;
        } else {
            modalBody.innerHTML = `
                <div class="evidence-list">
                    ${this.evidenceList.map(evidence => `
                        <div class="evidence-item">
                            <div class="evidence-name">${evidence.name}</div>
                            <div class="evidence-description">${evidence.description}</div>
                            <div class="evidence-significance">${evidence.significance}</div>
                        </div>
                    `).join('')}
                </div>
            `;
        }
        
        // 隐藏底部输入区域
        const bottomInput = document.getElementById('bottom-input');
        if (bottomInput) {
            bottomInput.style.display = 'none';
        }
        
        modalArea.style.display = 'flex';
        this.closeSidebarMenu();
    }
    
    showNotes() {
        const modalArea = document.getElementById('modal-content-area');
        const modalTitle = document.getElementById('modal-content-title');
        const modalBody = document.getElementById('modal-content-body');
        
        modalTitle.textContent = '调查笔记';
        
        const savedNotes = localStorage.getItem(`detective-notes-${this.sessionId}`) || '';
        
        modalBody.innerHTML = `
            <div class="notes-content">
                <div class="notes-header">
                    <p>记录你的推理和发现</p>
                    <button id="clear-modal-notes-btn" class="clear-btn">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
                <textarea id="modal-notes-area" placeholder="记录你的推理和发现...">${savedNotes}</textarea>
            </div>
        `;
        
        // 绑定笔记保存和清空功能
        const notesArea = document.getElementById('modal-notes-area');
        const clearBtn = document.getElementById('clear-modal-notes-btn');
        
        notesArea.addEventListener('input', (e) => {
            localStorage.setItem(`detective-notes-${this.sessionId}`, e.target.value);
        });
        
        clearBtn.addEventListener('click', () => {
            notesArea.value = '';
            localStorage.removeItem(`detective-notes-${this.sessionId}`);
        });
        
        // 隐藏底部输入区域
        const bottomInput = document.getElementById('bottom-input');
        if (bottomInput) {
            bottomInput.style.display = 'none';
        }
        
        modalArea.style.display = 'flex';
        this.closeSidebarMenu();
    }
    
    closeModalContent() {
        const modalArea = document.getElementById('modal-content-area');
        modalArea.style.display = 'none';
        
        // 如果有选中的角色，显示底部输入区域
        if (this.selectedCharacter) {
            const bottomInput = document.getElementById('bottom-input');
            if (bottomInput) {
                bottomInput.style.display = 'block';
            }
        }
    }
    
    loadCharacterChatHistory(character) {
        const conversationArea = document.getElementById('conversation-area');
        const characterKey = character.name;
        
        // 获取该角色的聊天历史
        const history = this.chatHistory[characterKey] || [];
        
        if (history.length === 0) {
            // 没有历史记录，显示欢迎信息
            conversationArea.innerHTML = `
                <div class="welcome-message">
                    <i class="fas fa-comments"></i>
                    <p>你现在可以向 ${character.name} 提问了</p>
                </div>
            `;
        } else {
            // 显示历史聊天记录
            conversationArea.innerHTML = '';
            history.forEach(item => {
                if (item.type === 'question') {
                    this.addQuestionToConversation(item.content, false);
                } else if (item.type === 'response') {
                    // 创建响应容器并直接显示完整内容
                    const responseContainer = this.createResponseContainer();
                    this.completeResponse(responseContainer, item.content);
                    
                    // 如果有证据，也要添加（不显示提示消息，因为是历史记录）
                    if (item.evidence) {
                        item.evidence.forEach(evidence => {
                            this.addEvidence(evidence, false);
                        });
                    }
                }
            });
        }
    }
    
    updateChatHeader(character) {
        const chatCharacterName = document.getElementById('chat-character-name');
        const chatCharacterRole = document.getElementById('chat-character-role');
        
        if (chatCharacterName) {
            chatCharacterName.textContent = `与 ${character.name} 对话`;
        }
        
        if (chatCharacterRole) {
            chatCharacterRole.textContent = character.occupation;
        }
    }
    
    initializeChatPanel() {
        const conversationArea = document.getElementById('conversation-area');
        conversationArea.innerHTML = `
            <div class="welcome-message">
                <i class="fas fa-comments"></i>
                <p>从左侧菜单选择角色开始询问</p>
            </div>
        `;
        
        // 隐藏底部输入区域
        const bottomInput = document.getElementById('bottom-input');
        if (bottomInput) {
            bottomInput.style.display = 'none';
        }
    }
    
    showSuggestedQuestionsLoading() {
        const suggestedQuestionsArea = document.getElementById('suggested-questions');
        const suggestionsList = document.getElementById('suggested-list');
        
        if (suggestedQuestionsArea && suggestionsList) {
            suggestionsList.innerHTML = `
                <div class="suggestions-loading">
                    <i class="fas fa-spinner fa-spin"></i>
                    <span>正在生成建议问题...</span>
                </div>
            `;
            suggestedQuestionsArea.style.display = 'block';
        }
    }

    async loadSuggestedQuestions(character) {
        try {
            // 通过WebSocket请求建议问题
            if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
                this.websocket.send(JSON.stringify({
                    type: 'get_suggested_questions',
                    character_name: character.name
                }));
            } else {
                console.log('WebSocket未连接，无法获取建议问题');
                // WebSocket未连接时隐藏建议问题区域
                const suggestedQuestionsArea = document.getElementById('suggested-questions');
                if (suggestedQuestionsArea) {
                    suggestedQuestionsArea.style.display = 'none';
                }
            }
        } catch (error) {
            console.error('加载建议问题失败:', error);
            // 加载失败时隐藏建议问题区域
            const suggestedQuestionsArea = document.getElementById('suggested-questions');
            if (suggestedQuestionsArea) {
                suggestedQuestionsArea.style.display = 'none';
            }
        }
    }
    
    renderSuggestedQuestions(questions) {
        console.log('开始渲染建议问题:', questions);
        
        const suggestionsList = document.getElementById('suggested-list');
        const suggestedQuestionsArea = document.getElementById('suggested-questions');
        
        if (!suggestionsList) {
            console.log('suggested-list element not found');
            return;
        }
        
        if (!suggestedQuestionsArea) {
            console.log('suggested-questions area not found');
            return;
        }
        
        suggestionsList.innerHTML = '';
        
        if (questions && questions.length > 0) {
            console.log(`渲染 ${questions.length} 个建议问题`);
            questions.forEach((question, index) => {
                const suggestionBtn = document.createElement('button');
                suggestionBtn.className = 'suggestion-btn';
                suggestionBtn.textContent = question;
                suggestionBtn.addEventListener('click', () => {
                    const questionInput = document.getElementById('question-input');
                    if (questionInput) {
                        questionInput.value = question;
                        this.handleQuestionInput({ target: { value: question } });
                    }
                });
                
                suggestionsList.appendChild(suggestionBtn);
                console.log(`添加建议问题 ${index + 1}: ${question}`);
            });
            
            // 显示建议问题区域
            suggestedQuestionsArea.style.display = 'block';
            console.log('显示建议问题区域');
        } else {
            // 隐藏建议问题区域
            suggestedQuestionsArea.style.display = 'none';
            console.log('隐藏建议问题区域 - 没有问题');
        }
    }
    
    handleQuestionInput(e) {
        const input = e.target;
        const sendBtn = document.getElementById('send-question-btn');
        
        if (sendBtn) {
            sendBtn.disabled = input.value.trim().length === 0;
        }
        
        // 自动调整高度
        if (input && input.style) {
            input.style.height = 'auto';
            input.style.height = Math.min(input.scrollHeight, 100) + 'px';
        }
    }
    
    async askQuestion() {
        const questionInput = document.getElementById('question-input');
        
        if (!questionInput) {
            this.showToast('输入框未找到', 'error');
            return;
        }
        
        const question = questionInput.value.trim();
        
        if (!question || !this.selectedCharacter) {
            this.showToast('请选择角色并输入问题', 'warning');
            return;
        }
        
        // 检查是否超过问题限制
        if (this.questionCount >= this.maxQuestions) {
            this.showToast('已达到最大提问次数限制', 'warning');
            return;
        }
        
        questionInput.value = '';
        this.handleQuestionInput({ target: { value: '' } });
        
        this.addQuestionToConversation(question, true);
        
        // 保存问题到聊天历史
        const characterKey = this.selectedCharacter.name;
        if (!this.chatHistory[characterKey]) {
            this.chatHistory[characterKey] = [];
        }
        this.chatHistory[characterKey].push({
            type: 'question',
            content: question
        });
        
        try {
            const response = await fetch(`${this.apiBase}/game/question/stream`, {
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
            let evidenceRevealed = [];
            
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
                            
                            if (data.type === 'chunk') {
                                fullResponse += data.content;
                                this.updateResponseContainer(responseContainer, fullResponse);
                            } else if (data.type === 'evidence_revealed') {
                                this.addEvidence(data.evidence);
                                evidenceRevealed.push(data.evidence);
                            } else if (data.type === 'complete') {
                                this.completeResponse(responseContainer, fullResponse);
                                this.updateGameStats();
                                
                                // 更新问题计数
                                if (data.round_number) {
                                    this.questionCount = data.round_number;
                                    this.updateSendButtonCounter();
                                }
                                
                                // 保存响应到聊天历史
                                this.chatHistory[characterKey].push({
                                    type: 'response',
                                    content: fullResponse,
                                    evidence: evidenceRevealed
                                });
                                
                                // 重新获取建议问题
                                this.showSuggestedQuestionsLoading();
                                setTimeout(() => {
                                    this.loadSuggestedQuestions(this.selectedCharacter);
                                }, 500); // 稍微延迟，让用户看到回答完成
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
    
    addQuestionToConversation(question, updateStats = true) {
        const conversationArea = document.getElementById('conversation-area');
        
        if (!conversationArea) {
            console.log('conversation-area element not found');
            return;
        }
        
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
        
        // 只在需要时更新统计信息
        if (updateStats) {
            if (!this.conversationHistory) {
                this.conversationHistory = [];
            }
            this.conversationHistory.push({ type: 'question', content: question });
            this.updateOverviewPanel();
        }
    }
    
    createResponseContainer() {
        const conversationArea = document.getElementById('conversation-area');
        
        if (!conversationArea) {
            console.log('conversation-area element not found');
            return null;
        }
        
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
        if (container) {
            container.innerHTML = text + '<span class="cursor">|</span>';
        }
        
        const conversationArea = document.getElementById('conversation-area');
        if (conversationArea) {
            conversationArea.scrollTop = conversationArea.scrollHeight;
        }
    }
    
    completeResponse(container, text) {
        if (container) {
            container.innerHTML = text;
            container.classList.remove('streaming');
        }
        
        // 在新的菜单系统中，我们不再使用activeTab概念
        // 可以考虑其他方式来显示未读消息提示
    }
    
    updateSendButtonCounter() {
        const sendBtn = document.getElementById('send-question-btn');
        if (sendBtn) {
            sendBtn.innerHTML = `
                <i class="fas fa-paper-plane"></i>
                <span class="question-counter">${this.questionCount}/${this.maxQuestions}</span>
            `;
        }
    }
    
    addEvidence(evidence, showToast = true) {
        // 检查证据是否已存在，避免重复添加
        const existingEvidence = this.evidenceList.find(e => e.name === evidence.name);
        if (existingEvidence) {
            console.log(`证据 "${evidence.name}" 已存在，跳过添加`);
            return;
        }
        
        this.evidenceList.push(evidence);
        this.updateEvidenceDisplay();
        this.updateOverviewPanel(); // 更新概览面板的证据计数
        
        if (showToast) {
            this.showToast(`发现新证据：${evidence.name}`, 'success');
        }
    }
    
    updateEvidenceDisplay() {
        const evidenceList = document.getElementById('evidence-list');
        
        // 如果元素不存在，直接返回（新的菜单系统通过模态框显示证据）
        if (!evidenceList) {
            console.log('evidence-list element not found, using new menu system');
            return;
        }
        
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
    
    updateOverviewPanel() {
        if (!this.currentCase) return;
        
        // 更新案件详情（新的菜单系统中这些元素不存在，添加安全检查）
        const caseDetails = document.getElementById('case-details');
        if (caseDetails) {
            caseDetails.innerHTML = `
                <p><strong>案件类型：</strong>${this.getCategoryText(this.currentCase.category)}</p>
                <p><strong>难度等级：</strong>${this.getDifficultyText(this.currentCase.difficulty)}</p>
                <p><strong>案件描述：</strong>${this.currentCase.description}</p>
                <p><strong>调查目标：</strong>通过与相关人员对话，收集线索和证据，分析案件真相，最终找出真正的凶手。</p>
            `;
        }
        
        // 更新调查进度（新的菜单系统中这些元素不存在，添加安全检查）
        const progressStats = document.getElementById('progress-stats');
        if (progressStats) {
            const evidenceCount = this.evidenceList ? this.evidenceList.length : 0;
            const characterCount = this.currentCase.characters ? this.currentCase.characters.length : 0;
            const questionCount = this.conversationHistory ? this.conversationHistory.length : 0;
            
            progressStats.innerHTML = `
                <div class="progress-item">
                    <span class="progress-label">相关人员</span>
                    <span class="progress-value">${characterCount} 人</span>
                </div>
                <div class="progress-item">
                    <span class="progress-label">已询问次数</span>
                    <span class="progress-value">${questionCount} 次</span>
                </div>
                <div class="progress-item">
                    <span class="progress-label">发现证据</span>
                    <span class="progress-value">${evidenceCount} 个</span>
                </div>
                <div class="progress-item">
                    <span class="progress-label">调查状态</span>
                    <span class="progress-value">进行中</span>
                </div>
            `;
        }
    }
    
    async getHint() {
        // 关闭侧边栏菜单
        this.closeSidebarMenu();
        
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
            
            const data = await response.json();
            
            if (response.ok && data.hint) {
                this.hintsHistory.push(data.hint);
                this.updateGameStats();
                this.showModal('提示', data.hint);
            } else {
                this.showToast(data.detail || '获取提示失败', 'error');
            }
        } catch (error) {
            console.error('获取提示失败:', error);
            this.showToast('网络错误', 'error');
        }
    }
    
    async makeAccusation() {
        // 关闭侧边栏菜单
        this.closeSidebarMenu();
        
        // 显示指控界面
        this.showAccusationScreen();
    }
    
    showAccusationScreen() {
        this.showScreen('accusation-screen');
        this.populateAccusationSelect();
    }
    
    populateAccusationSelect() {
        const accusedSelect = document.getElementById('mobile-accused-select');
        if (!accusedSelect) return;
        
        accusedSelect.innerHTML = '<option value="">请选择...</option>';
        
        if (this.currentCase && this.currentCase.characters) {
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
    }
    
    async submitAccusation() {
        const accusedName = document.getElementById('mobile-accused-select').value;
        const reasoning = document.getElementById('mobile-accusation-reasoning').value.trim();
        
        if (!accusedName) {
            this.showToast('请选择被指控者', 'error');
            return;
        }
        
        if (!reasoning) {
            this.showToast('请输入指控理由', 'error');
            return;
        }
        
        const submitBtn = document.getElementById('mobile-submit-accusation-btn');
        if (!submitBtn) return;
        
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i><span>审判中...</span>';
        
        try {
            await this.submitAccusationStream(accusedName, reasoning);
        } catch (error) {
            console.error('指控失败:', error);
            this.showToast('指控失败，请重试', 'error');
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fas fa-gavel"></i><span>提交指控</span>';
        }
    }
    
    async submitAccusationStream(accusedName, reasoning) {
        // 切换到审判结果界面
        this.showScreen('trial-result-screen');
        
        const resultContent = document.getElementById('mobile-trial-result-content');
        if (!resultContent) return;
        
        resultContent.innerHTML = `
            <div class="trial-result">
                <div class="trial-header">
                    <h2><i class="fas fa-balance-scale"></i> 审判进行中...</h2>
                    <p>正在对 <strong>${accusedName}</strong> 的指控进行审理</p>
                </div>
                <div id="mobile-trial-steps" class="trial-steps"></div>
            </div>
        `;
        
        // 初始化内容观察器
        this._initContentObserver();
        
        const trialSteps = document.getElementById('mobile-trial-steps');
        if (!trialSteps) return;
        
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
    
    async handleTrialStreamData(data, trialSteps, trialData) {
        console.log('收到审判事件:', data.type, data);
        
        // 初始化计数器
        if (!trialData.witnessCount) trialData.witnessCount = 0;
        if (!trialData.voterCount) trialData.voterCount = 0;
        
        switch (data.type) {
            case 'start':
                trialSteps.innerHTML = `
                    <div class="trial-intro">
                        <h3>🏛️ 审判开始</h3>
                        <p>现在开始审理对 <strong>${data.accused_name}</strong> 的指控</p>
                    </div>
                `;
                // 审判开始，内容变化会自动触发滚动
                break;
                
            case 'step':
                const stepDiv = document.createElement('div');
                stepDiv.className = 'trial-step';
                stepDiv.id = `mobile-step-${data.step}`;
                stepDiv.innerHTML = `
                    <div class="step-header">
                        <h3><i class="fas fa-chevron-right"></i> ${data.title}</h3>
                    </div>
                    <div class="step-content" id="mobile-content-${data.step}"></div>
                `;
                trialSteps.appendChild(stepDiv);
                stepDiv.scrollIntoView({ behavior: 'smooth' });
                break;
                
            case 'defense_chunk':
                this._appendToTrialContent(`mobile-content-defense`, data.content);
                break;
                
            case 'defense_complete':
                trialData.defense = data.defense;
                this._finalizeTrialStep(`mobile-content-defense`);
                break;
                
            case 'witness_start':
                let testimoniesContainer = document.getElementById('mobile-content-testimonies');
                if (!testimoniesContainer) {
                    const stepDiv = document.createElement('div');
                    stepDiv.className = 'trial-step';
                    stepDiv.id = 'mobile-step-testimonies';
                    stepDiv.innerHTML = `
                        <div class="step-header">
                            <h3><i class="fas fa-chevron-right"></i> 证人证词</h3>
                        </div>
                        <div class="step-content" id="mobile-content-testimonies"></div>
                    `;
                    trialSteps.appendChild(stepDiv);
                    stepDiv.scrollIntoView({ behavior: 'smooth' });
                    testimoniesContainer = document.getElementById('mobile-content-testimonies');
                }
                
                const currentWitnessIndex = trialData.witnessCount;
                const witnessDiv = document.createElement('div');
                witnessDiv.className = 'witness-testimony';
                witnessDiv.id = `mobile-witness-${currentWitnessIndex}`;
                witnessDiv.innerHTML = `
                    <h4><i class="fas fa-user"></i> ${data.witness_name} 作证</h4>
                    <div class="testimony-content" id="mobile-testimony-${currentWitnessIndex}"></div>
                `;
                testimoniesContainer.appendChild(witnessDiv);
                trialData.witnessCount++;
                // 新证人添加，会自动触发滚动
                break;
                
            case 'testimony_chunk':
                const currentTestimonyIndex = trialData.witnessCount - 1;
                this._appendToTrialContent(`mobile-testimony-${currentTestimonyIndex}`, data.content);
                break;
                
            case 'witness_complete':
                if (!trialData.testimonies) trialData.testimonies = [];
                trialData.testimonies.push({
                    witness_name: data.witness_name,
                    testimony: data.testimony
                });
                const finalTestimonyIndex = trialData.testimonies.length - 1;
                this._finalizeTrialStep(`mobile-testimony-${finalTestimonyIndex}`);
                break;
                
            case 'vote_start':
                let votingContainer = document.getElementById('mobile-content-voting');
                if (!votingContainer) {
                    const stepDiv = document.createElement('div');
                    stepDiv.className = 'trial-step';
                    stepDiv.id = 'mobile-step-voting';
                    stepDiv.innerHTML = `
                        <div class="step-header">
                            <h3><i class="fas fa-chevron-right"></i> 角色投票</h3>
                        </div>
                        <div class="step-content" id="mobile-content-voting"></div>
                    `;
                    trialSteps.appendChild(stepDiv);
                    stepDiv.scrollIntoView({ behavior: 'smooth' });
                    votingContainer = document.getElementById('mobile-content-voting');
                }
                
                const currentVoterIndex = trialData.voterCount;
                const voteDiv = document.createElement('div');
                voteDiv.className = 'vote-item';
                voteDiv.id = `mobile-vote-${currentVoterIndex}`;
                voteDiv.innerHTML = `
                    <h4><i class="fas fa-vote-yea"></i> ${data.voter_name} 投票</h4>
                    <div class="vote-content" id="mobile-vote-content-${currentVoterIndex}">
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
                trialData.voterCount++;
                // 新投票添加，会自动触发滚动
                break;
                
            case 'vote_chunk':
                const currentVoteIndex = trialData.voterCount - 1;
                const voteContentElement = document.getElementById(`mobile-vote-content-${currentVoteIndex}`);
                if (voteContentElement && voteContentElement.querySelector('.thinking-indicator')) {
                    voteContentElement.innerHTML = '';
                }
                this._appendToTrialContent(`mobile-vote-content-${currentVoteIndex}`, data.content);
                break;
                
            case 'vote_complete':
                if (!trialData.votes) trialData.votes = [];
                trialData.votes.push({
                    voter_name: data.voter_name,
                    vote: data.vote,
                    reason: data.reason
                });
                
                const finalVoteIndex = trialData.votes.length - 1;
                const voteElement = document.getElementById(`mobile-vote-content-${finalVoteIndex}`);
                if (voteElement) {
                    this._finalizeTrialStep(`mobile-vote-content-${finalVoteIndex}`);
                    
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
                let votingSummaryContainer = document.getElementById('mobile-content-voting');
                if (votingSummaryContainer) {
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
                    // 投票统计会自动触发滚动
                }
                break;
                
            case 'verdict':
                const verdictText = data.final_verdict ? '指控成立' : '指控不成立';
                
                let verdictContainer = document.getElementById('mobile-content-verdict');
                if (!verdictContainer) {
                    const stepDiv = document.createElement('div');
                    stepDiv.className = 'trial-step';
                    stepDiv.id = 'mobile-step-verdict';
                    stepDiv.innerHTML = `
                        <div class="step-header">
                            <h3><i class="fas fa-chevron-right"></i> 最终判决</h3>
                        </div>
                        <div class="step-content" id="mobile-content-verdict"></div>
                    `;
                    trialSteps.appendChild(stepDiv);
                    stepDiv.scrollIntoView({ behavior: 'smooth' });
                    verdictContainer = document.getElementById('mobile-content-verdict');
                }
                
                verdictContainer.innerHTML = `
                    <div class="verdict" style="color: #495057; background: #f8f9fa; border: 1px solid #dee2e6;">
                        <i class="fas fa-balance-scale"></i>
                        ${verdictText}
                    </div>
                `;
                // 判决结果会自动触发滚动
                break;
                
            case 'correctness':
                const correctnessText = data.is_correct ? '🎉 恭喜！你找到了真凶！' : '😔 很遗憾，你指控了错误的人。';
                
                let correctnessContainer = document.getElementById('mobile-content-verdict');
                if (correctnessContainer) {
                    correctnessContainer.innerHTML += `
                        <div class="correctness-indicator">
                            <h3>${correctnessText}</h3>
                        </div>
                    `;
                    // 正确性指示器会自动触发滚动
                }
                break;
                
            case 'solution_chunk':
                let solutionContainer = document.getElementById('mobile-content-solution');
                if (!solutionContainer) {
                    const stepDiv = document.createElement('div');
                    stepDiv.className = 'trial-step';
                    stepDiv.id = 'mobile-step-solution';
                    stepDiv.innerHTML = `
                        <div class="step-header">
                            <h3><i class="fas fa-chevron-right"></i> 案件真相</h3>
                        </div>
                        <div class="step-content" id="mobile-content-solution"></div>
                    `;
                    trialSteps.appendChild(stepDiv);
                    stepDiv.scrollIntoView({ behavior: 'smooth' });
                }
                
                this._appendToTrialContent('mobile-content-solution', data.content);
                break;
                
            case 'complete':
                console.log('收到complete事件:', data);
                this._finalizeTrialStep('mobile-content-solution');
                
                trialSteps.innerHTML += `
                    <div class="trial-actions">
                        <button class="btn-mobile evaluation-btn" onclick="mobileApp.goToEvaluation()">
                            <i class="fas fa-star"></i>
                            <span>游戏评价</span>
                        </button>
                        <button class="btn-mobile menu-btn-mobile" onclick="mobileApp.showScreen('main-menu')">
                            <i class="fas fa-home"></i>
                            <span>返回主菜单</span>
                        </button>
                        <button class="btn-mobile restart-btn" onclick="mobileApp.startNewGame()">
                            <i class="fas fa-redo"></i>
                            <span>重新开始</span>
                        </button>
                    </div>
                `;
                // 审判完成，强制滚动到操作按钮
                const actionsElement = trialSteps.lastElementChild;
                if (actionsElement) {
                    this._scrollToLatestContent(actionsElement, true);
                }
                break;
                
            case 'error':
                trialSteps.innerHTML += `
                    <div class="trial-error">
                        <h3><i class="fas fa-exclamation-triangle"></i> 错误</h3>
                        <p>${data.message}</p>
                    </div>
                `;
                // 错误时强制滚动到错误信息
                const errorElement = trialSteps.lastElementChild;
                if (errorElement) {
                    this._scrollToLatestContent(errorElement, true);
                }
                break;
        }
    }
    
    _appendToTrialContent(elementId, content) {
        const element = document.getElementById(elementId);
        if (element) {
            if (!element.querySelector('.streaming-text')) {
                element.innerHTML = '<div class="streaming-text"></div>';
            }
            const streamingText = element.querySelector('.streaming-text');
            if (streamingText) {
                streamingText.textContent += content;
                // 内容变化会被MutationObserver自动监听，无需手动滚动
            }
        }
    }
    
    _finalizeTrialStep(elementId) {
        const element = document.getElementById(elementId);
        if (element) {
            const streamingText = element.querySelector('.streaming-text');
            if (streamingText) {
                streamingText.classList.remove('streaming-text');
            }
            // 完成后强制滚动到该元素
            this._scrollToLatestContent(element, true);
        }
    }
    
    _initContentObserver() {
        // 如果已经存在观察器，先断开
        if (this.contentObserver) {
            this.contentObserver.disconnect();
        }
        
        // 创建 MutationObserver 来监听DOM变化
        this.contentObserver = new MutationObserver((mutations) => {
            let shouldScroll = false;
            
            mutations.forEach((mutation) => {
                // 检查是否有新增的节点或内容变化
                if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                    shouldScroll = true;
                } else if (mutation.type === 'characterData') {
                    shouldScroll = true;
                }
            });
            
            if (shouldScroll) {
                this._autoScrollToBottom();
            }
        });
        
        // 开始观察审判内容区域
        const trialContainer = document.querySelector('#mobile-trial-result-content');
        if (trialContainer) {
            this.contentObserver.observe(trialContainer, {
                childList: true,
                subtree: true,
                characterData: true
            });
        }
    }
    
    _autoScrollToBottom() {
        const now = Date.now();
        
        // 节流控制
        if ((now - this.lastScrollTime) < this.scrollThrottle) {
            return;
        }
        
        // 如果正在滚动，清除之前的定时器
        if (this.scrollTimer) {
            clearTimeout(this.scrollTimer);
        }
        
        // 防抖：延迟执行滚动
        this.scrollTimer = setTimeout(() => {
            if (this.isScrolling) return;
            
            this.isScrolling = true;
            this.lastScrollTime = Date.now();
            
            requestAnimationFrame(() => {
                try {
                    const trialContainer = document.querySelector('.trial-container');
                    if (trialContainer) {
                        // 计算是否需要滚动
                        const scrollTop = trialContainer.scrollTop;
                        const scrollHeight = trialContainer.scrollHeight;
                        const clientHeight = trialContainer.clientHeight;
                        
                        // 只有当不在底部附近时才滚动
                        if (scrollTop + clientHeight < scrollHeight - 50) {
                            trialContainer.scrollTo({
                                top: scrollHeight,
                                behavior: 'smooth'
                            });
                        }
                        
                        // 滚动完成后重置标志
                        setTimeout(() => {
                            this.isScrolling = false;
                        }, 300);
                    } else {
                        this.isScrolling = false;
                    }
                } catch (error) {
                    console.warn('自动滚动失败:', error);
                    this.isScrolling = false;
                }
            });
        }, 50); // 减少防抖延迟到50ms，提高响应速度
    }
    
    _scrollToLatestContent(element, forceScroll = false) {
        if (!element) return;
        
        const now = Date.now();
        
        // 如果不是强制滚动，且距离上次滚动时间过短，则跳过
        if (!forceScroll && (now - this.lastScrollTime) < this.scrollThrottle) {
            return;
        }
        
        // 如果正在滚动，清除之前的定时器
        if (this.scrollTimer) {
            clearTimeout(this.scrollTimer);
        }
        
        // 防抖：延迟执行滚动，如果短时间内有新的滚动请求，则重新计时
        this.scrollTimer = setTimeout(() => {
            if (this.isScrolling) return; // 如果正在滚动，跳过
            
            this.isScrolling = true;
            this.lastScrollTime = Date.now();
            
            requestAnimationFrame(() => {
                try {
                    const trialContainer = document.querySelector('.trial-container');
                    if (trialContainer) {
                        // 简化滚动逻辑：只滚动容器到底部
                        trialContainer.scrollTo({
                            top: trialContainer.scrollHeight,
                            behavior: 'smooth'
                        });
                        
                        // 滚动完成后重置标志
                        setTimeout(() => {
                            this.isScrolling = false;
                        }, 400); // 给滚动动画足够时间
                    } else {
                        this.isScrolling = false;
                    }
                } catch (error) {
                    console.warn('滚动失败:', error);
                    this.isScrolling = false;
                }
            });
        }, 100); // 100ms防抖延迟
    }
    
    _getWitnessIndex(witnessName, trialData) {
        if (!trialData.testimonies) return 0;
        return trialData.testimonies.findIndex(t => t.witness_name === witnessName);
    }
    
    _getVoterIndex(voterName, trialData) {
        if (!trialData.votes) return 0;
        return trialData.votes.findIndex(v => v.voter_name === voterName);
    }
    
    goToEvaluation() {
        if (this.sessionId) {
            window.location.href = `mobile_evaluation.html?session_id=${this.sessionId}`;
        } else {
            this.showToast('无法获取游戏会话ID，无法进行评价', 'error');
        }
    }
    
    startNewGame() {
        // 重置游戏状态
        this.resetGameState();
        // 返回主菜单
        this.showScreen('main-menu');
    }
    
    resetGameState() {
        this.currentCase = null;
        this.selectedCharacter = null;
        this.evidenceList = [];
        this.hintsHistory = [];
        this.sessionId = null;
        this.chatHistory = {};
        this.questionCount = 0;
        this.maxQuestions = 30;
        
        // 重置滚动状态
        if (this.scrollTimer) {
            clearTimeout(this.scrollTimer);
            this.scrollTimer = null;
        }
        this.lastScrollTime = 0;
        this.isScrolling = false;
        
        // 断开内容观察器
        if (this.contentObserver) {
            this.contentObserver.disconnect();
            this.contentObserver = null;
        }
        this.observedElements.clear();
        
        // 清空聊天记录
        this.clearConversation();
        
        // 重置界面状态
        const bottomInput = document.getElementById('bottom-input');
        if (bottomInput) {
            bottomInput.style.display = 'none';
        }
    }
    
    clearConversation() {
        const conversationArea = document.getElementById('conversation-area');
        
        if (conversationArea) {
            conversationArea.innerHTML = `
                <div class="welcome-message">
                    <i class="fas fa-comments"></i>
                    <p>从左侧菜单选择角色开始询问</p>
                </div>
            `;
        }
        
        this.conversationHistory = [];
    }
    
    clearNotes() {
        const notesArea = document.getElementById('notes-area');
        if (notesArea) {
            notesArea.value = '';
        }
    }
    
    showUnreadBadge() {
        const unreadBadge = document.getElementById('unread-badge');
        if (unreadBadge) {
            unreadBadge.style.display = 'block';
        }
    }
    
    clearUnreadBadge() {
        const unreadBadge = document.getElementById('unread-badge');
        if (unreadBadge) {
            unreadBadge.style.display = 'none';
        }
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
        console.log('消息类型:', data.type);
        console.log('消息完整内容:', JSON.stringify(data, null, 2));
        
        switch (data.type) {
            case 'suggested_questions':
                console.log('处理建议问题消息，问题数量:', data.questions ? data.questions.length : 0);
                console.log('建议问题内容:', data.questions);
                this.renderSuggestedQuestions(data.questions);
                break;
            case 'error':
                console.error('WebSocket错误:', data.message);
                this.showToast('获取建议问题失败', 'error');
                break;
            default:
                console.log('未处理的WebSocket消息类型:', data.type);
                console.log('完整数据:', data);
        }
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
            'expert': '专家级'
        };
        return difficultyMap[difficulty] || '未知难度';
    }
    
    getCategoryText(category) {
        const categoryMap = {
            'classic_murder': '经典谋杀案',
            'locked_room': '密室杀人案', 
            'revenge': '复仇案件',
            'family_drama': '家庭纠纷案',
            'kids_friendly': '儿童友好案例',
            'supernatural': '超自然元素案例',
            'financial_crime': '经济犯罪案',
            'missing_person': '失踪案件'
        };
        return categoryMap[category] || '未知类型';
    }
    
    getCharacterTypeText(type) {
        const typeMap = {
            'suspect': '嫌疑人',
            'witness': '证人',
            'victim': '受害者',
            'expert': '专家'
        };
        return typeMap[type] || '未知角色';
    }
    
    // 从案件详情中选择角色进行对话
    selectCharacterFromDetails(characterName) {
        const character = this.currentCase.characters.find(char => char.name === characterName);
        if (character && character.character_type !== 'victim') {
            this.selectCharacterForChat(character);
            this.hideModal();
        }
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
            
            const cursor = await this.typewriterEffect(element, item);
            
            // 每行结束后光标显示半次闪烁时间
            if (cursor) {
                cursor.style.opacity = '1';
                await this.delay(350);
                cursor.remove(); // 移除光标
            }
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
                div.innerHTML = `<p class="intro-text"></p>`;
                break;
        }
        
        return div;
    }
    
    async typewriterEffect(element, item) {
        if (this.skipTypewriter) return null;
        
        let cursor = null;
        
        switch (item.type) {
            case 'title':
                cursor = await this.typeText(element.querySelector('.intro-title'), item.text, 80);
                break;
            case 'subtitle':
                cursor = await this.typeText(element.querySelector('.intro-subtitle'), item.text, 60);
                break;
            case 'detail':
                cursor = await this.typeText(element.querySelector('.detail-text'), item.text, 50);
                break;
            case 'text':
                cursor = await this.typeText(element.querySelector('.intro-text'), item.text, 30);
                break;
            case 'character':
                const char = item.character;
                const characterText = `${char.name}，${char.age}岁，${char.occupation}，${this.getCharacterTypeText(char.character_type)}。${char.background}`;
                cursor = await this.typeText(element.querySelector('.intro-text'), characterText, 40);
                break;
        }
        
        return cursor;
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
        cursor.textContent = '█'; // 使用实心方块字符
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
            
            // 滚动到光标位置，确保当前输入的文字可见
            cursor.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
        }
        
        // 保留光标用于后续闪烁效果
        return cursor;
    }
    
    async delay(ms) {
        if (this.skipTypewriter) return;
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    async blinkCursor(cursor, times) {
        if (this.skipTypewriter || !cursor) return;
        
        // 确保光标初始状态可见
        cursor.style.opacity = '1';
        
        for (let i = 0; i < times; i++) {
            // 隐藏光标
            cursor.style.opacity = '0';
            await this.delay(225);
            
            // 显示光标
            cursor.style.opacity = '1';
            await this.delay(225);
        }
    }
    
    skipIntroduction() {
        console.log('skipIntroduction 方法被调用');
        this.skipTypewriter = true;
        
        // 立即显示所有内容
        const content = this.generateIntroContent();
        const introContent = document.getElementById('intro-content');
        console.log('intro-content 元素:', introContent);
        
        if (!introContent) {
            console.error('找不到 intro-content 元素');
            return;
        }
        
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
                    const characterText = `${char.name}，${char.age}岁，${char.occupation}，${this.getCharacterTypeText(char.character_type)}。${char.background}`;
                    element.querySelector('.intro-text').textContent = characterText;
                    break;
            }
        });
        
        // 启用开始游戏按钮
        const startBtn = document.getElementById('start-game-btn');
        if (startBtn) {
            startBtn.disabled = false;
            console.log('开始游戏按钮已启用');
        }
        
        // 滚动到底部
        setTimeout(() => {
            introContent.scrollTop = introContent.scrollHeight;
        }, 100);
        
        console.log('skipIntroduction 方法执行完成');
    }
    
    async startGameFromIntro() {
        // 初始化游戏并进入游戏界面
        await this.initializeGame();
        this.showScreen('game-screen');
    }
}

// 页面加载完成后初始化应用
document.addEventListener('DOMContentLoaded', () => {
    window.mobileApp = new MobileDetectiveApp();
});