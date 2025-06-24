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
        this.hintsUsed = 0;
        this.maxHints = 3;
        this.activeTab = 'characters';
        this.websocket = null;
        this.clientId = this._getOrCreateClientId();
        this.skipTypewriter = false;
        this.isCharacterSpeaking = false; // 角色是否正在说话
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
            
            // 确保使用经典主题配色
            this.ensureClassicTheme();
            
            // 初始化完成后立即隐藏加载屏幕
            const loadingScreen = DOMHelper.$('#loading-screen');
            if (loadingScreen && DOMHelper.hasClass(loadingScreen, 'active')) {
                this.hideLoadingScreen();
            }
            
        } catch (error) {
            console.error('初始化失败:', error);
            // 错误情况下也要检查是否还在加载屏幕
            const loadingScreen = DOMHelper.$('#loading-screen');
            if (loadingScreen && DOMHelper.hasClass(loadingScreen, 'active')) {
                this.hideLoadingScreen();
            }
        }
    }
    
    /**
     * 确保使用经典主题配色
     */
    ensureClassicTheme() {
        // 等待主题管理器加载完成后应用经典主题
        if (window.themeManager) {
            if (window.themeManager.isReady()) {
                window.themeManager.applyTheme('classic');
                console.log('已强制应用经典主题配色');
            } else {
                window.themeManager.waitForReady().then(() => {
                    window.themeManager.applyTheme('classic');
                    console.log('主题管理器加载完成，已应用经典主题配色');
                });
            }
        } else {
            // 如果主题管理器还未加载，等待一段时间后重试
            setTimeout(() => {
                this.ensureClassicTheme();
            }, 100);
        }
    }
    
    async loadVersionInfo() {
        try {
            const versionInfo = await APIHelper.get(`${this.apiBase}/version`);
            
            // 更新移动端页面底部的版本显示
            DOMHelper.setText('#mobile-version-info', `AI Detective Game v${versionInfo.version}`);
            
            // 兼容原有的app-version元素（如果存在）
            const versionElement = DOMHelper.$('#app-version');
            if (versionElement) {
                DOMHelper.setText('#app-version', `v${versionInfo.version}`);
            }
            
            console.log(`移动端版本信息加载成功: ${versionInfo.version}`);
        } catch (error) {
            console.error('加载版本信息失败:', error);
        }
    }
    
    bindEvents() {
        // 使用DOMHelper工具类进行事件绑定
        const eventBindings = [
            // 主菜单
            ['#start-game-main-btn', 'click', () => this.showCaseSelection()],
            ['#rules-btn', 'click', () => this.showRules()],
            ['#about-btn', 'click', () => this.showAbout()],
            
            // 案件选择
            ['#back-to-menu', 'click', () => {
                this.showScreen('main-menu');
                this.ensureClassicTheme();
            }],
            
            // 游戏界面 - 侧边栏菜单系统
            ['#sidebar-menu-btn', 'click', () => this.toggleSidebarMenu()],
            ['#close-menu-btn', 'click', () => this.closeSidebarMenu()],
            ['#menu-overlay', 'click', () => this.closeSidebarMenu()],
            
            // 菜单项
            ['#case-details-btn', 'click', () => this.showCaseDetails()],
            ['#evidence-menu-btn', 'click', () => this.showEvidence()],
            ['#notes-menu-btn', 'click', () => this.showNotes()],
            
            // 模态内容
            ['#close-modal-content', 'click', () => this.closeModalContent()],
            ['#close-modal', 'click', () => this.hideModal()],
            
            // 操作按钮
            ['#get-hint-btn', 'click', () => this.showHints()],
            ['#make-accusation-btn', 'click', () => this.makeAccusation()],
            
            // 指控界面
            ['#back-from-accusation', 'click', () => this.showScreen('game-screen')],
            ['#mobile-submit-accusation-btn', 'click', () => this.submitAccusation()],
            ['#mobile-cancel-accusation-btn', 'click', () => this.showScreen('game-screen')],
            
            // 对话
            ['#send-question-btn', 'click', () => this.askQuestion()],
            ['#question-input', 'input', (e) => this.handleQuestionInput(e)],
            ['#question-input', 'keydown', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    this.askQuestion();
                }
            }],
            
            // 案情介绍页面
            ['#skip-intro-btn', 'click', () => {
                console.log('跳过介绍按钮被点击');
                this.skipIntroduction();
            }],
            ['#start-game-btn', 'click', () => {
                console.log('开始游戏按钮被点击');
                this.startGameFromIntro();
            }]
        ];
        
        // 使用DOMHelper批量绑定事件
        DOMHelper.bindEvents(eventBindings);
        
        document.addEventListener('gesturestart', (e) => {
            e.preventDefault();
        });
    }
    
    // DOM元素获取辅助方法 - 使用DOMHelper工具类
    $(selector) {
        return DOMHelper.$(selector);
    }
    
    $$(selector) {
        return DOMHelper.$$(selector);
    }
    
    showScreen(screenId) {
        // 如果角色正在说话，禁用界面切换
        if (this.isCharacterSpeaking) {
            return;
        }
        
        // 使用DOMHelper隐藏所有屏幕
        DOMHelper.$$('.mobile-screen').forEach(screen => {
            screen.classList.remove('active');
        });
        // 显示指定屏幕
        const targetScreen = DOMHelper.$(`#${screenId}`);
        if (targetScreen) {
            targetScreen.classList.add('active');
        }
    }
    
    hideLoadingScreen() {
        this.showScreen('main-menu');
        // 重新设置为默认主题
        this.ensureClassicTheme();
    }
    
    async showCaseSelection() {
        this.showScreen('case-selection');
        await this.loadCases();
    }
    
    async loadCases() {
        try {
            const cases = await APIHelper.get(`${this.apiBase}/cases`);
            
            if (Array.isArray(cases)) {
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
        const casesList = DOMHelper.$('#cases-list');
        DOMHelper.setHTML('#cases-list', '');
        
        cases.forEach((caseData) => {
            const caseCard = DOMHelper.createElement('div', {
                className: 'case-card'
            }, `
                <h3>${caseData.title}</h3>
                <p>${Utils.truncateText(caseData.description, 100)}</p>
                <div class="case-meta">
                    <span class="badge badge-difficulty">${this.getDifficultyText(caseData.difficulty)}</span>
                    <span class="badge badge-category">${this.getCategoryText(caseData.category)}</span>
                </div>
            `);
            
            caseCard.addEventListener('click', () => this.startGame(caseData.index));
            casesList.appendChild(caseCard);
        });
    }
    
    async startGame(caseIndex) {
        // 如果角色正在说话，禁用案件选择
        if (this.isCharacterSpeaking) {
            return;
        }
        
        try {
            const data = await APIHelper.post(`${this.apiBase}/game/start`, {
                    case_index: caseIndex,
                    client_id: this.clientId
            });
            
            if (data.session_id) {
                this.sessionId = data.session_id;
                this.currentCase = data.case;
                this.gameState = data.game_state;
                
                // 自动应用案件对应的主题
                this.applyThemeForCase();
                
                // 显示案件介绍
                this.showCaseIntroduction();
            } else {
                this.showToast('启动游戏失败', 'error');
            }
   } catch (error) {
            this.handleNetworkError(error, '启动游戏失败');
        }
    }
    
    async initializeGame() {
        this.$('#game-case-title').textContent = this.currentCase.title;
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
            const gameState = await APIHelper.get(`${this.apiBase}/game/${this.sessionId}/state`);
                this.questionCount = gameState.current_round || 0;
                this.maxQuestions = gameState.max_rounds || 30;
                this.hintsUsed = gameState.hints_used || 0;
                this.maxHints = gameState.max_hints || 3;
                this.updateHintDisplay();
                this.updateSendButtonState(); // 更新发送按钮状态
                console.log(`游戏状态加载成功 - 当前轮次: ${this.questionCount}/${this.maxQuestions}, 提示: ${this.hintsUsed}/${this.maxHints}`);
        } catch (error) {
            console.error('加载游戏状态失败:', error);
            console.warn('获取游戏状态失败，使用默认值');
        }
    }
    
    updateHintDisplay() {
        const hintCountEl = this.$('#hint-count');
        if (hintCountEl) {
            hintCountEl.textContent = `(${this.hintsUsed || 0}/${this.maxHints || 3})`;
        }
        
        // 更新按钮状态 - 始终保持可点击以查看提示历史
        const hintBtn = this.$('#get-hint-btn');
        if (hintBtn) {
            hintBtn.disabled = false;
            hintBtn.style.opacity = '1';
        }
    }
    
    selectCharacter(character) {
        // 更新选中状态
        DOMHelper.$$('.character-card').forEach(card => {
            DOMHelper.toggleClass(card, 'selected', false);
        });
        
        DOMHelper.toggleClass(event.currentTarget, 'selected', true);
        
        // 使用新的选择角色方法
        this.selectCharacterForChat(character);
    }
    
    // 新的菜单系统方法
    toggleSidebarMenu() {
        // 如果角色正在说话，禁用菜单切换
        if (this.isCharacterSpeaking) {
            return;
        }
        
        const menu = DOMHelper.$('#sidebar-menu');
        const overlay = DOMHelper.$('#menu-overlay');
        
        menu.classList.toggle('show');
        overlay.classList.toggle('show');
    }
    
    closeSidebarMenu() {
        const menu = DOMHelper.$('#sidebar-menu');
        const overlay = DOMHelper.$('#menu-overlay');
        
        menu.classList.remove('show');
        overlay.classList.remove('show');
    }
    
    generateCharacterMenu() {
        const characterMenuList = DOMHelper.$('#character-menu-list');
        DOMHelper.setHTML('#character-menu-list', '');
        
        if (this.currentCase && this.currentCase.characters) {
            // 过滤掉被害人，只显示可以对话的角色
            const availableCharacters = this.currentCase.characters.filter(character => 
                character.character_type !== 'victim'
            );
            
            availableCharacters.forEach(character => {
                // 计算与该角色的聊天次数
                const chatCount = this.chatHistory[character.name] ? 
                    this.chatHistory[character.name].filter(item => item.type === 'question').length : 0;
                
                const characterBtn = DOMHelper.createElement('button', {
                    className: 'character-menu-item'
                }, `
                    <div class="character-avatar">
                        ${character.name.charAt(0)}
                    </div>
                    <div class="character-info">
                        <div class="character-name">${character.name}</div>
                        <div class="character-role">${character.occupation}</div>
                    </div>
                    <div class="chat-count">(${chatCount})</div>
                `);
                
                characterBtn.addEventListener('click', () => {
                    this.selectCharacterForChat(character);
                    this.closeSidebarMenu();
                });
                
                characterMenuList.appendChild(characterBtn);
            });
        }
    }
    
    selectCharacterForChat(character) {
        // 如果角色正在说话，禁用角色选择
        if (this.isCharacterSpeaking) {
            return;
        }
        
        this.selectedCharacter = character;
        
        // 关闭模态内容，显示聊天界面
        this.closeModalContent();
        
        // 更新对话头部
        this.updateChatHeader(character);
        
        // 显示该角色的历史聊天记录
        this.loadCharacterChatHistory(character);
        
        // 显示底部输入区域
        DOMHelper.toggle('#bottom-input', true);
        
        // 显示建议问题加载状态
        this.showSuggestedQuestionsLoading();
        
        // 延迟加载建议问题，确保界面已经显示
        setTimeout(() => {
            this.loadSuggestedQuestions(character);
        }, 100);
    }
    
    showCaseDetails() {
        const modalArea = DOMHelper.$('#modal-content-area');
        const modalTitle = DOMHelper.$('#modal-content-title');
        const modalBody = DOMHelper.$('#modal-content-body');
        const modalHeader = modalArea.querySelector('.modal-header');
        
        DOMHelper.setText('#modal-content-title', '案件详情');
        // 隐藏整个标题行
        if (modalHeader) {
            modalHeader.style.display = 'none';
        }
        
        // 分离受害者和其他角色
        const victimCharacter = this.currentCase.characters.find(char => 
            char.character_type === 'victim' || char.name === this.currentCase.victim_name
        );
        const otherCharacters = this.currentCase.characters.filter(char => 
            char.character_type !== 'victim' && char.name !== this.currentCase.victim_name
        );
        
        DOMHelper.setHTML('#modal-content-body', `
            <div class="case-details-content" style="background: transparent;">
                
                <div class="case-description">
                    <p>${this.currentCase.description}</p>
                </div>
                
                <div class="characters-section">
                    <div class="characters-list">
                        ${victimCharacter ? `
                            <div class="character-item victim-item">
                                <div class="victim-first-row">
                                    <div class="character-main-info">
                                        <strong>${victimCharacter.name}</strong>
                                        <span class="character-occupation">${victimCharacter.occupation}</span>
                                    </div>
                                    <span class="character-type-badge victim">
                                        ${this.getCharacterTypeText('victim')}
                                    </span>
                                </div>
                                <div class="victim-case-info">
                                    <div class="case-info-item">
                                        <div class="info-label">案发时间：</div>
                                        <div class="info-value">${this.currentCase.time_of_crime}</div>
                                    </div>
                                    <div class="case-info-item">
                                        <div class="info-label">案发地点：</div>
                                        <div class="info-value">${this.currentCase.crime_scene}</div>
                                    </div>
                                </div>
                            </div>
                        ` : ''}
                        ${otherCharacters.map(char => {
                            // 计算与该角色的聊天次数
                            const chatCount = this.chatHistory[char.name] ?
                                this.chatHistory[char.name].filter(item => item.type === 'question').length : 0;
                            
                            return `
                            <div class="character-item interactive-item" 
                                 onclick="mobileApp.selectCharacterFromDetails('${char.name}')">
                                <div class="character-main-info">
                                    <strong>${char.name}</strong>
                                    <span class="character-occupation">${char.occupation}</span>
                                </div>
                                <div class="character-center-info">
                                    <div class="chat-count">(${chatCount})</div>
                                </div>
                                <div class="character-right-section">
                                    <span class="character-type-badge ${char.character_type}">
                                        ${this.getCharacterTypeText(char.character_type)}
                                    </span>
                                    <i class="fas fa-chevron-right"></i>
                                </div>
                            </div>
                            `;
                        }).join('')}
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
                
                <div class="case-action-section">
                    <button class="case-accusation-btn" onclick="mobileApp.showAccusationDirectly()">
                        <i class="fas fa-gavel"></i>
                        <span>进行指控</span>
                    </button>
                </div>
            </div>
        `);
        
        // 隐藏底部输入区域
        DOMHelper.toggle('#bottom-input', false);
        
        DOMHelper.toggle('#modal-content-area', true, 'flex');
        this.closeSidebarMenu();
    }
    
    showEvidence() {
        // 如果角色正在说话，禁用证据查看
        if (this.isCharacterSpeaking) {
            return;
        }
        
        const modalArea = DOMHelper.$('#modal-content-area');
        const modalTitle = DOMHelper.$('#modal-content-title');
        const modalBody = DOMHelper.$('#modal-content-body');
        
        DOMHelper.setText('#modal-content-title', '发现的证据');
        
        if (this.evidenceList.length === 0) {
            DOMHelper.setHTML('#modal-content-body', `
                <div class="no-evidence">
                    <i class="fas fa-search"></i>
                    <p>暂无发现的证据</p>
                    <small>通过询问角色来发现线索和证据</small>
                </div>
            `);
        } else {
            const evidenceHTML = this.evidenceList.map(evidence => `
                        <div class="evidence-item">
                    <div class="evidence-header">
                        <h4>${evidence.name}</h4>
                        <span class="evidence-type ${evidence.evidence_type}">${this.getEvidenceTypeText(evidence.evidence_type)}</span>
                        </div>
                    <div class="evidence-description">
                        ${evidence.description}
                </div>
                    ${evidence.significance ? `
                        <div class="evidence-relevance">
                            <strong>意义：</strong>${evidence.significance}
                        </div>
                    ` : ''}
                </div>
            `).join('');
            
            DOMHelper.setHTML('#modal-content-body', `
                <div class="evidence-list">
                    ${evidenceHTML}
                </div>
            `);
        }
        
        // 隐藏底部输入区域
        DOMHelper.toggle('#bottom-input', false);
        
        DOMHelper.toggle('#modal-content-area', true, 'flex');
        this.closeSidebarMenu();
    }
    
    showHints() {
        const modalArea = DOMHelper.$('#modal-content-area');
        const modalTitle = DOMHelper.$('#modal-content-title');
        const modalBody = DOMHelper.$('#modal-content-body');
        
        DOMHelper.setText('#modal-content-title', '获得的提示');
        
        const canGetMoreHints = (this.hintsUsed || 0) < (this.maxHints || 3);
        
        if (this.hintsHistory.length === 0) {
            DOMHelper.setHTML('#modal-content-body', `
                <div class="no-hints">
                    <i class="fas fa-lightbulb"></i>
                    <p>暂无获得的提示</p>
                    <small>点击下方按钮来获得智能提示</small>
                </div>
                <div class="hints-actions">
                    <button id="get-new-hint-btn" class="btn-mobile btn-primary" ${!canGetMoreHints ? 'disabled' : ''}>
                        <i class="fas fa-lightbulb"></i>
                        <span>获取新提示 (${this.hintsUsed || 0}/${this.maxHints || 3})</span>
                    </button>
                </div>
            `);
        } else {
            DOMHelper.setHTML('#modal-content-body', `
                <div class="hints-list">
                    ${this.hintsHistory.map((hint, index) => `
                        <div class="hint-item">
                            <div class="hint-header">
                                <div class="hint-number">提示 ${index + 1}</div>
                                <div class="hint-time">${new Date().toLocaleString()}</div>
                            </div>
                            <div class="hint-content">${hint}</div>
                        </div>
                    `).join('')}
                </div>
                <div class="hints-actions">
                    <button id="get-new-hint-btn" class="btn-mobile btn-primary" ${!canGetMoreHints ? 'disabled' : ''}>
                        <i class="fas fa-lightbulb"></i>
                        <span>获取新提示 (${this.hintsUsed || 0}/${this.maxHints || 3})</span>
                    </button>
                </div>
            `);
        }
        
        // 绑定获取新提示按钮的点击事件
        setTimeout(() => {
            const getNewHintBtn = DOMHelper.$('#get-new-hint-btn');
            if (getNewHintBtn && !getNewHintBtn.disabled) {
                getNewHintBtn.addEventListener('click', async () => {
                    await this.getHint();
                    // 获取提示后刷新页面显示
                    this.showHints();
                });
            }
        }, 100);
        
        // 隐藏底部输入区域
        DOMHelper.toggle('#bottom-input', false);
        
        DOMHelper.toggle('#modal-content-area', true, 'flex');
        this.closeSidebarMenu();
    }
    
    showNotes() {
        // 如果角色正在说话，禁用笔记查看
        if (this.isCharacterSpeaking) {
            return;
        }
        
        const modalArea = DOMHelper.$('#modal-content-area');
        const modalTitle = DOMHelper.$('#modal-content-title');
        const modalBody = DOMHelper.$('#modal-content-body');
        
        const savedNotes = StorageHelper.get(`detective-notes-${this.sessionId}`) || '';
        
        DOMHelper.setHTML('#modal-content-body', `
            <div class="notes-content">
                <div class="notes-header">
                    <p>记录你的推理和发现</p>
                    <button id="clear-modal-notes-btn" class="clear-btn">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
                <textarea id="modal-notes-area" placeholder="记录你的推理和发现...">${savedNotes}</textarea>
            </div>
        `);
        
        // 绑定笔记保存和清空功能
        const notesArea = DOMHelper.$('#modal-notes-area');
        const clearBtn = DOMHelper.$('#clear-modal-notes-btn');
        
        notesArea.addEventListener('input', (e) => {
            StorageHelper.set(`detective-notes-${this.sessionId}`, e.target.value);
        });
        
        clearBtn.addEventListener('click', () => {
            notesArea.value = '';
            StorageHelper.remove(`detective-notes-${this.sessionId}`);
        });
        
        // 隐藏底部输入区域
        DOMHelper.toggle('#bottom-input', false);
        
        DOMHelper.toggle('#modal-content-area', true, 'flex');
        this.closeSidebarMenu();
    }
    
    closeModalContent() {
        const modalArea = DOMHelper.$('#modal-content-area');
        const modalTitle = DOMHelper.$('#modal-content-title');
        const modalHeader = modalArea.querySelector('.modal-header');
        
        // 恢复标题行显示
        if (modalHeader) {
            modalHeader.style.display = 'flex';
        }
        
        // 重置标题
        DOMHelper.setText('#modal-content-title', '内容标题');
        
        // 隐藏模态内容区域
        DOMHelper.toggle('#modal-content-area', false);
        
        // 显示底部输入区域（如果当前有选中的角色）
        if (this.selectedCharacter) {
            DOMHelper.toggle('#bottom-input', true);
        }
    }
    
    loadCharacterChatHistory(character) {
        const conversationArea = this.$('#conversation-area');
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
        const chatCharacterName = DOMHelper.$('#chat-character-name');
        if (chatCharacterName) {
            DOMHelper.setText('#chat-character-name', `${character.name} - ${character.occupation}`);
        }
    }
    
    initializeChatPanel() {
        const conversationArea = this.$('#conversation-area');
        conversationArea.innerHTML = `
            <div class="welcome-message">
                <i class="fas fa-comments"></i>
                <p>从左侧菜单选择角色开始询问</p>
            </div>
        `;
        
        // 隐藏底部输入区域
        const bottomInput = DOMHelper.$('#bottom-input');
        if (bottomInput) {
            bottomInput.style.display = 'none';
        }
    }
    
    showSuggestedQuestionsLoading() {
        const suggestedQuestionsArea = this.$('#suggested-questions');
        const suggestionsList = this.$('#suggested-list');
        
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
                const suggestedQuestionsArea = DOMHelper.$('#suggested-questions');
                if (suggestedQuestionsArea) {
                    suggestedQuestionsArea.style.display = 'none';
                }
            }
        } catch (error) {
            this.handleNetworkError(error, '加载建议问题失败');
            // 加载失败时隐藏建议问题区域
            const suggestedQuestionsArea = DOMHelper.$('#suggested-questions');
            if (suggestedQuestionsArea) {
                suggestedQuestionsArea.style.display = 'none';
            }
        }
    }
    
    renderSuggestedQuestions(questions) {
        console.log('开始渲染建议问题:', questions);
        
        const suggestionsList = DOMHelper.$('#suggested-list');
        const suggestedQuestionsArea = DOMHelper.$('#suggested-questions');
        
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
                const suggestionBtn = DOMHelper.createElement('button', {
                    className: 'suggestion-btn'
                }, question);
                suggestionBtn.addEventListener('click', () => {
                    const questionInput = DOMHelper.$('#question-input');
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
        const sendBtn = this.$('#send-question-btn');
        
        if (sendBtn) {
            // 检查输入内容是否为空以及是否达到轮次限制
            const hasContent = input.value.trim().length > 0;
            const canAskQuestion = this.questionCount < this.maxQuestions;
            sendBtn.disabled = !hasContent || !canAskQuestion || this.isCharacterSpeaking;
        }
        
        // 自动调整高度
        if (input && input.style) {
            input.style.height = 'auto';
            input.style.height = Math.min(input.scrollHeight, 100) + 'px';
        }
    }
    
    async askQuestion() {
        const questionInput = DOMHelper.$('#question-input');
        const question = questionInput.value.trim();
        
        if (!question) {
            this.showToast('请输入问题', 'error');
            return;
        }
        
        if (!this.selectedCharacter) {
            this.showToast('请先选择角色', 'error');
            return;
        }
        
        // 清空输入框
        questionInput.value = '';
        
        // 添加问题到对话
        this.addQuestionToConversation(question);
        
        // 更新问题计数
        this.questionCount++;
        this.updateSendButtonCounter();
        
        // 保存到聊天历史
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
            
            // 设置角色正在说话状态
            this.isCharacterSpeaking = true;
            this.updateSendButtonState();
            
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
                                
                                // 角色说话完成
                                this.isCharacterSpeaking = false;
                                
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
                                
                                // 更新角色菜单中的聊天次数
                                this.generateCharacterMenu();
                                
                                // 如果当前显示的是案件详情页面，也要刷新以更新聊天次数
                                const modalArea = DOMHelper.$('#modal-content-area');
                                const modalTitle = DOMHelper.$('#modal-content-title');
                                if (modalArea && DOMHelper.hasClass(modalArea, 'active') && 
                                    modalTitle && modalTitle.textContent === '案件详情') {
                                    // 延迟刷新案件详情页面，确保聊天历史已更新
                                    setTimeout(() => {
                                        this.showCaseDetails();
                                    }, 100);
                                }
                                
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
            // 重置角色说话状态
            this.isCharacterSpeaking = false;
            this.updateSendButtonState();
            
            this.handleNetworkError(error, '询问失败');
            this.showToast('询问失败，请重试', 'error');
        }
    }
    
    addQuestionToConversation(question, updateStats = true) {
        const conversationArea = DOMHelper.$('#conversation-area');
        
        if (!conversationArea) {
            console.log('conversation-area element not found');
            return;
        }
        
        const welcomeMessage = conversationArea.querySelector('.welcome-message');
        if (welcomeMessage) {
            welcomeMessage.remove();
        }
        
        const conversationItem = DOMHelper.createElement('div', {
            className: 'conversation-item'
        }, `<div class="question">${question}</div>`);
        
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
        const conversationArea = DOMHelper.$('#conversation-area');
        
        if (!conversationArea) {
            console.log('conversation-area element not found');
            return null;
        }
        
        const responseDiv = DOMHelper.createElement('div', {
            className: 'response streaming'
        }, '<span class="cursor">|</span>');
        
        const lastItem = conversationArea.lastElementChild;
        if (lastItem) {
            lastItem.appendChild(responseDiv);
        }
        
        conversationArea.scrollTop = conversationArea.scrollHeight;
        return responseDiv;
    }
    
    updateResponseContainer(container, text) {
        if (container) {
            DOMHelper.setHTML(container, text + '<span class="cursor">|</span>');
        }
        
        const conversationArea = DOMHelper.$('#conversation-area');
        if (conversationArea) {
            conversationArea.scrollTop = conversationArea.scrollHeight;
        }
    }
    
    completeResponse(container, text) {
        if (container) {
            DOMHelper.setHTML(container, text);
            container.classList.remove('streaming');
        }
        
        // 在新的菜单系统中，我们不再使用activeTab概念
        // 可以考虑其他方式来显示未读消息提示
    }
    
    updateSendButtonCounter() {
        DOMHelper.setHTML('#send-question-btn', `
                <i class="fas fa-paper-plane"></i>
                <span class="question-counter">${this.questionCount}/${this.maxQuestions}</span>
        `);
        this.updateSendButtonState();
    }
    
    updateSendButtonState() {
        const sendBtn = this.$('#send-question-btn');
        const questionInput = this.$('#question-input');
        
        if (sendBtn && questionInput) {
            const hasContent = questionInput.value.trim().length > 0;
            const canAskQuestion = this.questionCount < this.maxQuestions;
            const isNotSpeaking = !this.isCharacterSpeaking;
            
            // 只有在有内容、未达到轮次限制且角色未在说话时才启用按钮
            sendBtn.disabled = !hasContent || !canAskQuestion || !isNotSpeaking;
            
            // 根据不同状态设置提示信息
            if (this.isCharacterSpeaking) {
                DOMHelper.toggleClass(sendBtn, 'disabled', true);
                sendBtn.title = '角色正在回答中，请稍候...';
            } else if (!canAskQuestion) {
                DOMHelper.toggleClass(sendBtn, 'disabled', true);
                sendBtn.title = '已达到最大提问轮次';
            } else {
                DOMHelper.toggleClass(sendBtn, 'disabled', false);
                sendBtn.title = hasContent ? '发送问题' : '请输入问题';
            }
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
        // 更新菜单中的证据数量显示
        const evidenceCountElement = DOMHelper.$('#evidence-count');
        if (evidenceCountElement) {
            evidenceCountElement.textContent = `(${this.evidenceList.length})`;
        }
        
        const evidenceList = DOMHelper.$('#evidence-list');
        if (!evidenceList) return;
        
        if (this.evidenceList.length === 0) {
            DOMHelper.setHTML('#evidence-list', `
                <div class="no-evidence">
                    <i class="fas fa-search"></i>
                    <p>还没有收集到证据</p>
                    <small>通过询问角色来发现线索</small>
                </div>
            `);
            return;
        }
        
        DOMHelper.setHTML('#evidence-list', '');
        this.evidenceList.forEach(evidence => {
            const evidenceItem = DOMHelper.createElement('div', {
                className: 'evidence-item'
            }, `
                <div class="evidence-name">${evidence.name}</div>
                <div class="evidence-description">${evidence.description}</div>
                <div class="evidence-significance">${evidence.significance}</div>
            `);
            evidenceList.appendChild(evidenceItem);
        });
    }
    
    updateGameStats() {
        const stats = this.getGameStatistics();
        // 更新游戏统计信息（移动端暂时不显示具体统计）
        console.log(`游戏统计 - 问题: ${stats.questionCount}, 证据: ${stats.evidenceCount}, 提示: ${stats.hintCount}`);
    }
    
    updateOverviewPanel() {
        if (!this.currentCase) return;
        
        this.updateCaseDetailsPanel();
        this.updateProgressStatsPanel();
    }
    
    getGameStatistics() {
        return {
            evidenceCount: this.evidenceList ? this.evidenceList.length : 0,
            characterCount: this.currentCase?.characters ? this.currentCase.characters.length : 0,
            questionCount: this.conversationHistory ? this.conversationHistory.length : 0,
            hintCount: this.hintsHistory ? this.hintsHistory.length : 0
        };
    }
    
    updateCaseDetailsPanel() {
        const caseDetails = DOMHelper.$('#case-details');
        if (caseDetails && this.currentCase) {
            DOMHelper.setHTML('#case-details', `
                <p><strong>案件类型：</strong>${this.getCategoryText(this.currentCase.category)}</p>
                <p><strong>难度等级：</strong>${this.getDifficultyText(this.currentCase.difficulty)}</p>
                <p><strong>案件描述：</strong>${this.currentCase.description}</p>
                <p><strong>调查目标：</strong>通过与相关人员对话，收集线索和证据，分析案件真相，最终找出真正的凶手。</p>
            `);
        }
    }
    
    updateProgressStatsPanel() {
        const progressStats = DOMHelper.$('#progress-stats');
        if (progressStats) {
            const stats = this.getGameStatistics();
            
            DOMHelper.setHTML('#progress-stats', `
                <div class="progress-item">
                    <span class="progress-label">相关人员</span>
                    <span class="progress-value">${stats.characterCount} 人</span>
                </div>
                <div class="progress-item">
                    <span class="progress-label">已询问次数</span>
                    <span class="progress-value">${stats.questionCount} 次</span>
                </div>
                <div class="progress-item">
                    <span class="progress-label">发现证据</span>
                    <span class="progress-value">${stats.evidenceCount} 个</span>
                </div>
                <div class="progress-item">
                    <span class="progress-label">调查状态</span>
                    <span class="progress-value">进行中</span>
                </div>
            `);
        }
    }
    
    async getHint() {
        // 关闭侧边栏菜单
        this.closeSidebarMenu();
        
        // 获取提示按钮
        const hintBtn = DOMHelper.$('#get-new-hint-btn');
        if (!hintBtn) return;
        
        // 设置按钮为加载状态
        this.setButtonLoading(hintBtn, '生成中...', 'fas fa-spinner fa-spin');
        
        try {
            const data = await APIHelper.post(`${this.apiBase}/game/hint`, {
                    session_id: this.sessionId
            });
            
            if (data.hint) {
                this.hintsHistory.push(data.hint);
                this.hintsUsed = data.hints_used || (this.hintsUsed + 1);
                this.updateHintDisplay();
                this.updateGameStats();
                this.showModal('提示', data.hint);
            } else {
                this.handleApiError(data, '获取提示失败');
            }
        } catch (error) {
            this.handleNetworkError(error, '获取提示失败');
        } finally {
            // 恢复按钮正常状态
            this.setButtonNormal(hintBtn, '获取提示', 'fas fa-lightbulb');
        }
    }
    
    handleApiError(data, defaultMessage) {
        const message = data.detail || defaultMessage;
        this.showToast(message, 'error');
    }
    
    handleNetworkError(error, operation) {
        console.error(`${operation}:`, error);
        this.showToast('网络错误', 'error');
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
    
    showAccusationDirectly() {
        this.showAccusationScreen();
    }
    
    populateAccusationSelect() {
        const accusedSelect = DOMHelper.$('#mobile-accused-select');
        if (!accusedSelect) return;
        
        DOMHelper.setHTML('#mobile-accused-select', '<option value="">请选择...</option>');
        
        if (this.currentCase && this.currentCase.characters) {
            this.currentCase.characters.forEach(character => {
                // 过滤掉专家和受害者，因为他们不能被指控
                if (character.character_type !== 'expert' && character.character_type !== 'victim') {
                    const option = DOMHelper.createElement('option', {
                        value: character.name
                    }, `${character.name} (${character.occupation})`);
                    accusedSelect.appendChild(option);
                }
            });
        }
    }
    
    async submitAccusation() {
        const formData = this.validateAccusationForm();
        if (!formData) return;
        
        const submitBtn = DOMHelper.$('#mobile-submit-accusation-btn');
        if (!submitBtn) return;
        
        this.setButtonLoading(submitBtn, '审判中...', 'fas fa-spinner fa-spin');
        
        try {
            await this.submitAccusationStream(formData.accusedName, formData.reasoning);
        } catch (error) {
            this.handleNetworkError(error, '指控失败');
            this.showToast('指控失败，请重试', 'error');
        } finally {
            this.setButtonNormal(submitBtn, '提交指控', 'fas fa-gavel');
        }
    }
    
    validateAccusationForm() {
        const accusedName = DOMHelper.$('#mobile-accused-select').value;
        const reasoning = DOMHelper.$('#mobile-accusation-reasoning').value.trim();
        
        if (!accusedName) {
            this.showToast('请选择被指控者', 'error');
            return null;
        }
        
        if (!reasoning) {
            this.showToast('请输入指控理由', 'error');
            return null;
        }
        
        return { accusedName, reasoning };
    }
    
    setButtonLoading(button, text, iconClass) {
        button.disabled = true;
        DOMHelper.setHTML(button, `<i class="${iconClass}"></i><span>${text}</span>`);
    }
    
    setButtonNormal(button, text, iconClass) {
        button.disabled = false;
        DOMHelper.setHTML(button, `<i class="${iconClass}"></i><span>${text}</span>`);
    }
    
    async submitAccusationStream(accusedName, reasoning) {
        // 切换到审判结果界面
        this.showScreen('trial-result-screen');
        
        const resultContent = DOMHelper.$('#mobile-trial-result-content');
        if (!resultContent) return;
        
        DOMHelper.setHTML('#mobile-trial-result-content', `
            <div class="trial-result">
                <div class="trial-header">
                    <h2><i class="fas fa-balance-scale"></i> 审判进行中...</h2>
                    <p>正在对 <strong>${accusedName}</strong> 的指控进行审理</p>
                </div>
                <div id="mobile-trial-steps" class="trial-steps"></div>
            </div>
        `);
        
        // 初始化内容观察器
        this._initContentObserver();
        
        const trialSteps = DOMHelper.$('#mobile-trial-steps');
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
            DOMHelper.appendHTML(trialSteps, `
                <div class="trial-error">
                    <h3><i class="fas fa-exclamation-triangle"></i> 审判过程出现错误</h3>
                    <p>请重试或联系管理员</p>
                </div>
            `);
        }
    }
    
    async handleTrialStreamData(data, trialSteps, trialData) {
        console.log('收到审判事件:', data.type, data);
        
        // 初始化计数器
        if (!trialData.witnessCount) trialData.witnessCount = 0;
        if (!trialData.voterCount) trialData.voterCount = 0;
        
        switch (data.type) {
            case 'start':
                DOMHelper.setHTML(trialSteps, '');
                // 审判开始，内容变化会自动触发滚动
                break;
                
            case 'step':
                const stepDiv = DOMHelper.createElement('div', {
                    className: 'trial-step',
                    id: `mobile-step-${data.step}`
                });
                DOMHelper.setHTML(stepDiv, `
                    <div class="step-header">
                        <h3><i class="fas fa-chevron-right"></i> ${data.title}</h3>
                    </div>
                    <div class="step-content" id="mobile-content-${data.step}"></div>
                `);
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
                let testimoniesContainer = DOMHelper.$('#mobile-content-testimonies');
                if (!testimoniesContainer) {
                    const stepDiv = DOMHelper.createElement('div', {
                        className: 'trial-step',
                        id: 'mobile-step-testimonies'
                    });
                    DOMHelper.setHTML(stepDiv, `
                        <div class="step-header">
                            <h3><i class="fas fa-chevron-right"></i> 证人证词</h3>
                        </div>
                        <div class="step-content" id="mobile-content-testimonies"></div>
                    `);
                    trialSteps.appendChild(stepDiv);
                    stepDiv.scrollIntoView({ behavior: 'smooth' });
                    testimoniesContainer = DOMHelper.$('#mobile-content-testimonies');
                }
                
                const currentWitnessIndex = trialData.witnessCount;
                const witnessDiv = DOMHelper.createElement('div', {
                    className: 'witness-testimony',
                    id: `mobile-witness-${currentWitnessIndex}`
                });
                DOMHelper.setHTML(witnessDiv, `
                    <h4><i class="fas fa-user"></i> ${data.witness_name} 作证</h4>
                    <div class="testimony-content" id="mobile-testimony-${currentWitnessIndex}"></div>
                `);
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
                let votingContainer = DOMHelper.$('#mobile-content-voting');
                if (!votingContainer) {
                    const stepDiv = DOMHelper.createElement('div', {
                        className: 'trial-step',
                        id: 'mobile-step-voting'
                    });
                    DOMHelper.setHTML(stepDiv, `
                        <div class="step-header">
                            <h3><i class="fas fa-chevron-right"></i> 角色投票</h3>
                        </div>
                        <div class="step-content" id="mobile-content-voting"></div>
                    `);
                    trialSteps.appendChild(stepDiv);
                    stepDiv.scrollIntoView({ behavior: 'smooth' });
                    votingContainer = DOMHelper.$('#mobile-content-voting');
                }
                
                const currentVoterIndex = trialData.voterCount;
                const voteDiv = DOMHelper.createElement('div', {
                    className: 'vote-item',
                    id: `mobile-vote-${currentVoterIndex}`
                });
                DOMHelper.setHTML(voteDiv, `
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
                `);
                votingContainer.appendChild(voteDiv);
                trialData.voterCount++;
                // 新投票添加，会自动触发滚动
                break;
                
            case 'vote_chunk':
                const currentVoteIndex = trialData.voterCount - 1;
                const voteContentElement = DOMHelper.$(`#mobile-vote-content-${currentVoteIndex}`);
                if (voteContentElement && voteContentElement.querySelector('.thinking-indicator')) {
                    DOMHelper.setHTML(`#mobile-vote-content-${currentVoteIndex}`, '');
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
                const voteElement = DOMHelper.$(`#mobile-vote-content-${finalVoteIndex}`);
                if (voteElement) {
                    this._finalizeTrialStep(`mobile-vote-content-${finalVoteIndex}`);
                    
                    DOMHelper.setHTML(`#mobile-vote-content-${finalVoteIndex}`, `
                        <div class="vote-result">
                            <span class="vote-decision ${data.vote === '支持' ? 'support' : 'oppose'}">
                                ${data.vote === '支持' ? '✅ 支持指控' : '❌ 反对指控'}
                            </span>
                        </div>
                        <div class="vote-reason">${data.reason.replace(/\\n/g, '<br/>').replace(/\n/g, '<br/>')}</div>
                    `);
                }
                break;
                
            case 'vote_summary':
                let votingSummaryContainer = DOMHelper.$('#mobile-content-voting');
                if (votingSummaryContainer) {
                    DOMHelper.appendHTML(votingSummaryContainer, `
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
                    `);
                    // 投票统计会自动触发滚动
                }
                break;
                
            case 'verdict':
                const verdictText = data.final_verdict ? '指控成立' : '指控不成立';
                
                let verdictContainer = DOMHelper.$('#mobile-content-verdict');
                if (!verdictContainer) {
                    const stepDiv = DOMHelper.createElement('div', {
                        className: 'trial-step',
                        id: 'mobile-step-verdict'
                    });
                    DOMHelper.setHTML(stepDiv, `
                        <div class="step-header">
                            <h3><i class="fas fa-chevron-right"></i> 最终判决</h3>
                        </div>
                        <div class="step-content" id="mobile-content-verdict"></div>
                    `);
                    trialSteps.appendChild(stepDiv);
                    stepDiv.scrollIntoView({ behavior: 'smooth' });
                    verdictContainer = DOMHelper.$('#mobile-content-verdict');
                }
                
                verdictContainer.innerHTML = `
                    <div class="verdict" style="color: var(--theme-text-primary); background: var(--theme-secondary-bg); border: 1px solid var(--theme-border-color);">
                        <i class="fas fa-balance-scale"></i>
                        ${verdictText}
                    </div>
                `;
                // 判决结果会自动触发滚动
                break;
                
            case 'correctness':
                const correctnessText = data.is_correct ? '🎉 恭喜！你找到了真凶！' : '😔 很遗憾，你指控了错误的人。';
                
                let correctnessContainer = DOMHelper.$('#mobile-content-verdict');
                if (correctnessContainer) {
                    DOMHelper.appendHTML(correctnessContainer, `
                        <div class="correctness-indicator">
                            <h3>${correctnessText}</h3>
                        </div>
                    `);
                    // 正确性指示器会自动触发滚动
                }
                break;
                
            case 'solution_chunk':
                let solutionContainer = DOMHelper.$('#mobile-content-solution');
                if (!solutionContainer) {
                    const stepDiv = DOMHelper.createElement('div', {
                        className: 'trial-step',
                        id: 'mobile-step-solution'
                    });
                    DOMHelper.setHTML(stepDiv, `
                        <div class="step-header">
                            <h3><i class="fas fa-chevron-right"></i> 案件真相</h3>
                        </div>
                        <div class="step-content" id="mobile-content-solution"></div>
                    `);
                    trialSteps.appendChild(stepDiv);
                    stepDiv.scrollIntoView({ behavior: 'smooth' });
                }
                
                this._appendToTrialContent('mobile-content-solution', data.content);
                break;
                
            case 'complete':
                console.log('收到complete事件:', data);
                this._finalizeTrialStep('mobile-content-solution');
                
                DOMHelper.appendHTML(trialSteps, `
                    <div class="trial-actions">
                        <button class="btn-mobile evaluation-btn" onclick="mobileApp.goToEvaluation()">
                            <i class="fas fa-star"></i>
                            <span>游戏评价</span>
                        </button>
                        <button class="btn-mobile menu-btn-mobile" onclick="mobileApp.showScreen('main-menu')">
                            <i class="fas fa-home"></i>
                            <span>返回主菜单</span>
                        </button>
                    </div>
                `);
                // 审判完成，强制滚动到操作按钮
                const actionsElement = trialSteps.lastElementChild;
                if (actionsElement) {
                    this._scrollToLatestContent(actionsElement, true);
                }
                break;
                
            case 'error':
                DOMHelper.appendHTML(trialSteps, `
                    <div class="trial-error">
                        <h3><i class="fas fa-exclamation-triangle"></i> 错误</h3>
                        <p>${data.message}</p>
                    </div>
                `);
                // 错误时强制滚动到错误信息
                const errorElement = trialSteps.lastElementChild;
                if (errorElement) {
                    this._scrollToLatestContent(errorElement, true);
                }
                break;
        }
    }
    
    _appendToTrialContent(elementId, content) {
        const element = DOMHelper.$(`#${elementId}`);
        if (element) {
            if (!element.querySelector('.streaming-text')) {
                DOMHelper.setHTML(`#${elementId}`, '<div class="streaming-text"></div>');
            }
            const streamingText = element.querySelector('.streaming-text');
            if (streamingText) {
                streamingText.textContent += content;
                // 内容变化会被MutationObserver自动监听，无需手动滚动
            }
        }
    }
    
    _finalizeTrialStep(elementId) {
        const element = DOMHelper.$(`#${elementId}`);
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
        const trialContainer = DOMHelper.$('#mobile-trial-result-content');
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
                    const trialContainer = DOMHelper.$('.trial-container');
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
                    const trialContainer = DOMHelper.$('.trial-container');
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
            this.showScreen('evaluation-screen');
            this.initializeEvaluationForm();
        } else {
            this.showToast('无法获取游戏会话ID，无法进行评价', 'error');
        }
    }
    
    startNewGame() {
        // 重置游戏状态
        this.resetGameState();
        // 返回主菜单
        this.showScreen('main-menu');
        // 重新设置为默认主题
        this.ensureClassicTheme();
    }

    initializeEvaluationForm() {
        // 重置表单状态
        this.selectedRating = 0;
        this.$('#mobileEvaluationForm').reset();
        this.$('#mobileRatingText').textContent = '请选择评分';
        this.$('#evaluationSuccessMessage').style.display = 'none';
        this.$('#evaluationErrorMessage').style.display = 'none';
        
        // 清除所有星级选择
        const stars = DOMHelper.$$('#evaluation-screen .star');
        stars.forEach(star => star.classList.remove('active'));
        
        // 绑定评分交互事件
        this.bindEvaluationEvents();
    }

    bindEvaluationEvents() {
        const stars = DOMHelper.$$('#evaluation-screen .star');
        const ratingText = DOMHelper.$('#mobileRatingText');
        const ratingTexts = ['', '很不满意', '不满意', '一般', '满意', '非常满意'];
        
        // 移除之前的事件监听器
        stars.forEach(star => {
            star.replaceWith(star.cloneNode(true));
        });
        
        // 重新获取星级元素并绑定事件
        const newStars = DOMHelper.$$('#evaluation-screen .star');
        newStars.forEach(star => {
            star.addEventListener('click', () => {
                this.selectedRating = parseInt(star.dataset.rating);
                this.updateStars();
                ratingText.textContent = ratingTexts[this.selectedRating];
                
                // 添加触觉反馈（如果支持）
                if (navigator.vibrate) {
                    navigator.vibrate(50);
                }
            });
            
            // 触摸开始时高亮显示
            star.addEventListener('touchstart', (e) => {
                e.preventDefault();
                const rating = parseInt(star.dataset.rating);
                this.highlightStars(rating);
            });
            
            // 触摸结束时确认选择
            star.addEventListener('touchend', (e) => {
                e.preventDefault();
                this.selectedRating = parseInt(star.dataset.rating);
                this.updateStars();
                ratingText.textContent = ratingTexts[this.selectedRating];
                
                // 添加触觉反馈（如果支持）
                if (navigator.vibrate) {
                    navigator.vibrate(50);
                }
            });
            
            // 鼠标悬停效果（适用于支持鼠标的设备）
            star.addEventListener('mouseover', () => {
                const rating = parseInt(star.dataset.rating);
                this.highlightStars(rating);
            });
        });
        
        // 鼠标离开评分区域时恢复到已选择的评分
        const ratingContainer = DOMHelper.$('#evaluation-screen .rating-container');
        if (ratingContainer) {
            ratingContainer.addEventListener('mouseleave', () => {
                this.updateStars();
            });
            
            // 触摸取消时恢复到已选择的评分
            ratingContainer.addEventListener('touchcancel', () => {
                this.updateStars();
            });
        }
        
        // 绑定表单提交事件
        const form = DOMHelper.$('#mobileEvaluationForm');
        if (form) {
            form.removeEventListener('submit', this.handleEvaluationSubmit);
            form.addEventListener('submit', (e) => this.handleEvaluationSubmit(e));
        }
    }

    highlightStars(rating) {
        const stars = DOMHelper.$$('#evaluation-screen .star');
        stars.forEach((star, index) => {
            if (index < rating) {
                star.classList.add('active');
            } else {
                star.classList.remove('active');
            }
        });
    }

    updateStars() {
        this.highlightStars(this.selectedRating);
    }

    async handleEvaluationSubmit(e) {
        e.preventDefault();
        
        const formData = this.validateEvaluationForm();
        if (!formData) return;
        
        const submitBtn = DOMHelper.$('#mobileSubmitBtn');
        this.setButtonLoading(submitBtn, '提交中...', 'fas fa-spinner fa-spin');
        
        try {
            const data = await APIHelper.post(`${this.apiBase}/game/evaluation`, {
                    session_id: formData.sessionId,
                    rating: formData.rating,
                    reason: formData.reason,
                difficulty_feedback: formData.difficultyFeedback,
                most_liked: formData.mostLiked,
                suggestions: formData.suggestions,
                would_recommend: formData.wouldRecommend
            });
            
                this.showEvaluationSuccess();
                // 添加触觉反馈
                if (navigator.vibrate) {
                    navigator.vibrate([100, 50, 100]);
                }
                // 3秒后返回主界面
                setTimeout(() => {
                    this.showScreen('main-menu');
                    // 重新设置为默认主题
                    this.ensureClassicTheme();
                }, 3000);
        } catch (error) {
            this.handleNetworkError(error, '提交评价失败');
            this.showEvaluationError('网络错误，请重试');
        } finally {
            this.setButtonNormal(submitBtn, '提交评价', 'fas fa-paper-plane');
        }
    }
    
    validateEvaluationForm() {
        if (!this.sessionId) {
            this.showEvaluationError('缺少会话ID，无法提交评价');
            return null;
        }
        
        if (this.selectedRating === 0) {
            this.showEvaluationError('请选择评分');
            return null;
        }
        
        const reason = DOMHelper.$('#mobileReason').value.trim();
        if (!reason) {
            this.showEvaluationError('请填写评价原因');
            return null;
        }
        
        return {
            sessionId: this.sessionId,
            rating: this.selectedRating,
            reason: reason,
            difficultyFeedback: DOMHelper.$('#mobileDifficulty').value || null,
            mostLiked: DOMHelper.$('#mobileMostLiked').value.trim() || null,
            suggestions: DOMHelper.$('#mobileSuggestions').value.trim() || null,
            wouldRecommend: DOMHelper.$('#mobileRecommend').checked
        };
    }

    showEvaluationSuccess() {
        DOMHelper.toggle('#evaluationSuccessMessage', true);
        DOMHelper.toggle('#evaluationErrorMessage', false);
        DOMHelper.toggle('#mobileEvaluationForm', false);
    }

    showEvaluationError(message) {
        DOMHelper.setText('#evaluationErrorText', message);
        DOMHelper.toggle('#evaluationErrorMessage', true);
        DOMHelper.toggle('#evaluationSuccessMessage', false);
    }
    
    resetGameState() {
        this.currentCase = null;
        this.selectedCharacter = null;
        this.evidenceList = [];
        this.hintsHistory = [];
        this.hintsUsed = 0;
        this.maxHints = 3;
        this.sessionId = null;
        this.chatHistory = {};
        this.questionCount = 0;
        this.maxQuestions = 30;
        this.isCharacterSpeaking = false;
        
        // 更新按钮状态
        this.updateSendButtonState();
        
        // 重置打字机效果状态
        this.skipTypewriter = false;
        
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
        DOMHelper.toggle('#bottom-input', false);
        
        // 重置案情介绍页面状态
        const startGameBtn = DOMHelper.$('#start-game-btn');
        if (startGameBtn) {
            startGameBtn.disabled = true;
        }
        
        DOMHelper.setHTML('#intro-content', '');
        
        // 重置WebSocket连接
        if (this.websocket) {
            this.websocket.close();
            this.websocket = null;
        }
        
        // 重置游戏状态
        this.gameState = null;
        this.activeTab = 'characters';
        
        // 重置对话历史
        this.conversationHistory = [];
        
        // 重置UI显示元素
        this.resetUIElements();
    }
    
    resetUIElements() {
        // 重置证据显示
        DOMHelper.setText('#evidence-count', '(0)');
        
        DOMHelper.setHTML('#evidence-list', `
                <div class="no-evidence">
                    <i class="fas fa-search"></i>
                    <p>还没有收集到证据</p>
                    <small>通过询问角色来发现线索</small>
                </div>
        `);
        
        // 重置角色菜单
        DOMHelper.setHTML('#character-menu-list', '');
        
        // 重置发送按钮计数器
        DOMHelper.setHTML('#send-question-btn', `
                <i class="fas fa-paper-plane"></i>
                <span class="question-counter">0/30</span>
        `);
        
        // 重置提示显示
        DOMHelper.setText('#hint-count', '0/3');
        
        // 重置聊天头部
        DOMHelper.setText('#chat-character-name', '');
        DOMHelper.setText('#chat-character-role', '');
        
        // 重置问题输入框
        const questionInput = DOMHelper.$('#question-input');
        if (questionInput) {
            questionInput.value = '';
            questionInput.placeholder = '选择角色后开始询问...';
        }
        
        // 重置建议问题区域
        DOMHelper.toggle('#suggested-questions', false);
        DOMHelper.setHTML('#suggested-list', '');
        
        // 重置模态框
        DOMHelper.toggle('#modal', false);
        
        // 重置侧边栏菜单
        DOMHelper.toggleClass('#sidebar-menu', 'show', false);
        DOMHelper.toggleClass('#menu-overlay', 'show', false);
        
        // 重置未读消息徽章
        DOMHelper.toggle('#unread-badge', false);
        
        // 重置指控相关元素
        const mobileAccusedSelect = DOMHelper.$('#mobile-accused-select');
        if (mobileAccusedSelect) {
            mobileAccusedSelect.selectedIndex = 0;
        }
        
        const mobileAccusationReasoning = DOMHelper.$('#mobile-accusation-reasoning');
        if (mobileAccusationReasoning) {
            mobileAccusationReasoning.value = '';
        }
        
        const mobileSubmitAccusationBtn = DOMHelper.$('#mobile-submit-accusation-btn');
        if (mobileSubmitAccusationBtn) {
            mobileSubmitAccusationBtn.disabled = false;
            DOMHelper.setText('#mobile-submit-accusation-btn', '提交指控');
        }
        
        // 重置审判结果相关元素
        DOMHelper.setHTML('#mobile-trial-result-content', '');
        DOMHelper.setHTML('#mobile-trial-steps', '');
        
        // 重置评价表单
        DOMHelper.toggle('#evaluationSuccessMessage', false);
        DOMHelper.toggle('#evaluationErrorMessage', false);
        DOMHelper.toggle('#mobileEvaluationForm', true);
        
        // 重置评分
        this.selectedRating = 0;
        DOMHelper.setText('#mobileRatingText', '请选择评分');
        
        // 重置评价表单字段
        DOMHelper.$('#mobileReason').value = '';
        DOMHelper.$('#mobileDifficulty').selectedIndex = 0;
        DOMHelper.$('#mobileMostLiked').value = '';
        DOMHelper.$('#mobileSuggestions').value = '';
        DOMHelper.$('#mobileRecommend').checked = false;
        
        // 重置星星评分
        DOMHelper.$$('#evaluation-screen .star').forEach(star => {
            star.classList.remove('active');
        });
    }
    
    clearConversation() {
        DOMHelper.setHTML('#conversation-area', `
                <div class="welcome-message">
                    <i class="fas fa-comments"></i>
                    <p>从左侧菜单选择角色开始询问</p>
                </div>
        `);
        
        this.conversationHistory = [];
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
        DOMHelper.setText('#modal-title', title);
        DOMHelper.setHTML('#modal-body', content);
        DOMHelper.toggleClass('#modal', 'active', true);
    }
    
    hideModal() {
        DOMHelper.toggleClass('#modal', 'active', false);
    }
    
    showToast(message, type = 'info') {
        const toast = DOMHelper.$('#toast');
        const icon = DOMHelper.$('#toast-icon');
        
        const iconClass = this.getToastIconClass(type);
        
        icon.className = iconClass;
        DOMHelper.setText('#toast-message', message);
        
        toast.classList.add('show');
        
        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }
    
    getToastIconClass(type) {
        const iconMap = {
            'success': 'fas fa-check-circle',
            'error': 'fas fa-exclamation-circle',
            'warning': 'fas fa-exclamation-triangle',
            'info': 'fas fa-info-circle'
        };
        return iconMap[type] || iconMap.info;
    }
    
    showRules() {
        const rulesContent = this.generateRulesContent();
        this.showModal('游戏规则', rulesContent);
    }
    
    showAbout() {
        const aboutContent = this.generateAboutContent();
        this.showModal('关于游戏', aboutContent);
    }
    
    showCaseInfo() {
        if (!this.currentCase) return;
        
        const caseInfo = this.generateCaseInfoContent(this.currentCase);
        this.showModal('案件信息', caseInfo);
    }
    
    generateRulesContent() {
        return `
            <h4>游戏规则</h4>
            <p>1. 选择案件开始调查</p>
            <p>2. 与相关人员对话收集线索</p>
            <p>3. 分析证据找出真相</p>
            <p>4. 在掌握足够证据后提出指控</p>
            <p>5. 法庭将根据你的推理进行判决</p>
        `;
    }
    
    generateAboutContent() {
        return `
            <h4>关于游戏</h4>
            <p>这是一款基于AI的侦探推理游戏，考验你的逻辑推理能力。</p>
            <p>通过与角色对话，收集线索，分析证据，最终找出真正的凶手。</p>
        `;
    }
    
    generateCaseInfoContent(caseData) {
        return `
            <h4>${caseData.title}</h4>
            <p><strong>受害者：</strong>${caseData.victim_name}</p>
            <p><strong>案发地点：</strong>${caseData.crime_scene}</p>
            <p><strong>案发时间：</strong>${caseData.time_of_crime}</p>
            <p><strong>案情描述：</strong></p>
            <p>${caseData.description}</p>
        `;
    }
    
    // 工具方法 - 使用Utils工具类
    truncateText(text, maxLength) {
        return Utils.truncateText(text, maxLength);
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

    getEvidenceTypeText(type) {
        const typeMap = {
            'physical': '物理证据',
            'testimony': '证词证据',
            'document': '文件证据',
            'behavioral': '行为证据'
        };
        return typeMap[type] || '未知类型';
    }
    
    // 从案件详情中选择角色进行对话
    selectCharacterFromDetails(characterName) {
        // 如果角色正在说话，禁用角色选择
        if (this.isCharacterSpeaking) {
            return;
        }
        
        const character = this.currentCase.characters.find(char => char.name === characterName);
        if (character && character.character_type !== 'victim') {
            this.selectCharacterForChat(character);
            this.hideModal();
        }
    }
    
    _getOrCreateClientId() {
        let clientId = StorageHelper.get('detective_client_id');
        if (!clientId) {
            clientId = 'mobile_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            StorageHelper.set('detective_client_id', clientId);
        }
        return clientId;
    }
    
    // 案情介绍相关方法
    showCaseIntroduction() {
        this.showScreen('case-intro-screen');
        this.skipTypewriter = false;
        this.startTypewriterSequence();
    }
    
    // 根据案件类型自动应用主题
    applyThemeForCase() {
        if (!this.currentCase || !this.currentCase.category) {
            console.log('无法应用主题：案件数据或类型缺失');
            return;
        }
        
        // 检查主题管理器是否存在
        if (!window.themeManager) {
            console.log('警告：主题管理器未加载');
            return;
        }
        
        // 等待主题管理器加载完成
        if (window.themeManager.isReady()) {
            const recommendedTheme = window.themeManager.getRecommendedTheme(this.currentCase.category);
            if (recommendedTheme) {
                window.themeManager.applyTheme(recommendedTheme);
                console.log(`已为案件类型 ${this.currentCase.category} 自动应用主题: ${recommendedTheme}`);
            } else {
                console.log(`未找到案件类型 ${this.currentCase.category} 对应的主题`);
            }
        } else {
            // 如果主题管理器还未加载完成，等待加载
            console.log('主题管理器正在加载中，等待完成...');
            window.themeManager.waitForReady().then(() => {
                const recommendedTheme = window.themeManager.getRecommendedTheme(this.currentCase.category);
                if (recommendedTheme) {
                    window.themeManager.applyTheme(recommendedTheme);
                    console.log(`已为案件类型 ${this.currentCase.category} 自动应用主题: ${recommendedTheme}`);
                } else {
                    console.log(`未找到案件类型 ${this.currentCase.category} 对应的主题`);
                }
            }).catch(error => {
                console.log('主题管理器加载失败:', error);
            });
        }
    }
    
    async startTypewriterSequence() {
        DOMHelper.setHTML('#intro-content', '');
        
        // 创建内容结构
        const content = this.generateIntroContent();
        
        // 开始打字机效果
        await this.typewriterSequence(content);
        
        // 启用开始游戏按钮
        const startGameBtn = DOMHelper.$('#start-game-btn');
        if (startGameBtn) {
            startGameBtn.disabled = false;
        }
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
        const introContent = DOMHelper.$('#intro-content');
        
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
        const div = DOMHelper.createElement('div', {
            className: 'intro-section scroll-target'
        });
        
        switch (item.type) {
            case 'title':
                DOMHelper.setHTML(div, `<h1 class="intro-title"></h1>`);
                break;
            case 'subtitle':
                DOMHelper.setHTML(div, `<h2 class="intro-subtitle"></h2>`);
                break;
            case 'detail':
                DOMHelper.setHTML(div, `<div class="intro-detail"><strong>${item.label}：</strong><span class="detail-text"></span></div>`);
                break;
            case 'text':
                DOMHelper.setHTML(div, `<p class="intro-text"></p>`);
                break;
            case 'character':
                DOMHelper.setHTML(div, `<p class="intro-text"></p>`);
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
        
        DOMHelper.setHTML(element, '');
        
        // 添加光标
        const cursor = DOMHelper.createElement('span', {
            className: 'typewriter-cursor'
        }, '█'); // 使用实心方块字符
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
        const introContent = DOMHelper.$('#intro-content');
        console.log('intro-content 元素:', introContent);
        
        if (!introContent) {
            console.error('找不到 intro-content 元素');
            return;
        }
        
        DOMHelper.setHTML('#intro-content', '');
        
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
        const startBtn = DOMHelper.$('#start-game-btn');
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