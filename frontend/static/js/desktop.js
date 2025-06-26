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
        this.selectedRating = 0; // 初始化评分变量
        this.isCharacterSpeaking = false; // 跟踪角色是否正在说话

        
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
    
    // 统一错误处理
    handleError(error, userMessage = '操作失败，请重试') {
        this.logError('Error occurred:', error);
        this.showMessage('错误', userMessage);
    }
    
    // 统一的异步操作包装
    async safeAsyncOperation(operation, errorMessage = '操作失败') {
        try {
            return await operation();
        } catch (error) {
            this.handleError(error, errorMessage);
            throw error;
        }
    }
    
    // 统一的按钮状态管理
    setButtonLoading(button, isLoading, loadingText = '处理中...', originalText = null) {
        if (isLoading) {
            button.disabled = true;
            button.dataset.originalText = originalText || button.innerHTML;
            button.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${loadingText}`;
        } else {
            button.disabled = false;
            button.innerHTML = button.dataset.originalText || originalText || button.innerHTML;
        }
    }
    
    // 模板生成器 - 减少重复的HTML字符串
    templates = {
        // 加载指示器
        loadingIndicator: (text = '加载中...') => `
            <div class="loading-indicator">
                <i class="fas fa-spinner fa-spin"></i>
                <span>${text}</span>
            </div>
        `,
        
        // 错误消息
        errorMessage: (message) => `
            <div class="error-message">
                <i class="fas fa-exclamation-triangle"></i>
                <span>${message}</span>
            </div>
        `,
        
        // 空状态
        emptyState: (message, icon = 'fas fa-inbox') => `
            <div class="empty-state">
                <i class="${icon}"></i>
                <p>${message}</p>
            </div>
        `,
        
        // 按钮
        button: (text, className = 'btn primary', icon = null, onclick = null) => `
            <button class="${className}" ${onclick ? `onclick="${onclick}"` : ''}>
                ${icon ? `<i class="${icon}"></i>` : ''}
                ${text}
            </button>
        `,
        
        // 角色卡片
        characterCard: (data, cardType = 'intro') => {
            switch (cardType) {
                case 'intro':
                    return `
                        <div class="intro-character-name">${data.name}</div>
                        <div class="intro-character-occupation">${data.occupation}</div>
                        <div class="intro-character-type ${data.typeClass}">${data.typeText}</div>
                    `;
                case 'intro-empty':
                    return `
                        <div class="intro-character-name"></div>
                        <div class="intro-character-occupation"></div>
                        <div class="intro-character-type ${data.typeClass}"></div>
                    `;
                case 'game':
                    return `
                        <div class="character-info-left">
                            <div class="character-name">${data.name}</div>
                            <div class="character-occupation">${data.occupation}</div>
                        </div>
                        <div class="character-type">${data.typeText}</div>
                    `;
                default:
                     return this.characterCard(data, 'intro');
             }
         },
         
         // 加载建议
         loadingSuggestions: () => `
             <div class="loading-suggestions">
                 <i class="fas fa-spinner fa-spin"></i>
                 <p style="font-size: 12px; color: var(--theme-text-secondary);">正在生成参考问题... (您可以直接在输入框中提问，无需等待)</p>
             </div>
         `,
         
         // 对话项目
         conversationItem: (question, response = null) => {
             if (response) {
                 return `
                     <div class="question">${question}</div>
                     <div class="response">${response}</div>
                 `;
             } else {
                 return `<div class="question">${question}</div>`;
             }
         }
     }
    
    // 加载版本信息
    async loadVersionInfo() {
        try {
            const versionInfo = await APIHelper.get(`${this.apiBase}/version`);
            // 更新主菜单中的版本显示
            const versionElement = DOMHelper.$('#app-version');
            if (versionElement) {
                DOMHelper.setText('#app-version', `v${versionInfo.version}`);
            }
            // 更新关于游戏弹窗中的版本信息
            this.updateAboutModalVersion(versionInfo);
            this.log(`版本信息加载成功: ${versionInfo.version}`);
        } catch (error) {
            this.logError('加载版本信息失败:', error);
            // 如果加载失败，保持默认版本号
        }
    }
    
    // 更新关于弹窗中的版本信息
    updateAboutModalVersion(versionInfo) {
        try {
            // 查找关于弹窗中的版本信息区域
            const aboutModal = DOMHelper.$('#about-modal');
            if (aboutModal) {
                const versionInfoDiv = aboutModal.querySelector('.version-info');
                if (versionInfoDiv) {
                    DOMHelper.setHTML(versionInfoDiv, `
                        <p><strong>版本：</strong>${versionInfo.version}</p>
                        <p><strong>构建日期：</strong>${versionInfo.build_date}</p>
                        <p><strong>构建编号：</strong>${versionInfo.build_number}</p>
                    `);
                }
            }
        } catch (error) {
            this.logError('更新关于弹窗版本信息失败:', error);
        }
    }
    
    async init() {
        try {
            this.bindEvents();
            // 加载应用配置（包括时区）
            await this.loadAppConfig();
            // 加载版本信息
            await this.loadVersionInfo();
        
            // 确保使用经典主题配色
            this.ensureClassicTheme();
            
            // 初始化按钮状态
            this.updateSendButtonState();

            this.hideLoadingScreen();
            
            // 确保案件加载屏幕被正确隐藏
            this.ensureCaseLoadingScreenHidden();
        } catch (error) {
            this.logError('初始化失败:', error);
            this.hideLoadingScreen();
            this.ensureCaseLoadingScreenHidden();
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

    // 加载应用配置
    async loadAppConfig() {
        try {
            const config = await APIHelper.get(`${this.apiBase}/config`);
            this.appTimezone = config.timezone;
            this.log(`应用配置加载成功，时区: ${this.appTimezone}`);
        } catch (error) {
            this.logWarn('加载应用配置失败，使用默认时区:', error);
        }
    }
    
    // 绑定事件监听器
    bindEvents() {
        // 批量事件绑定
        DOMHelper.bindEvents([
            // 主菜单按钮
            ['#start-game-btn', 'click', () => this.showCaseSelection()],
            ['#rules-btn', 'click', () => this.showModal('rules-modal')],
            ['#about-btn', 'click', () => this.showModal('about-modal')],

            // 案例选择
            ['#back-to-menu', 'click', () => {
                this.showScreen('main-menu');
                this.resetToDefaultTheme();
            }],

            // 案情介绍
            ['#start-investigation-btn', 'click', () => this.startInvestigation()],
            ['#skip-intro-btn', 'click', () => this.skipIntroduction()],

            // 游戏界面
            ['#get-hint-btn', 'click', () => this.getHint()],
            ['#make-accusation-btn', 'click', () => this.showAccusationScreen()],
            ['#ask-question-btn', 'click', () => this.askQuestion()],

            // 指控界面
            ['#submit-accusation-btn', 'click', () => this.submitAccusation()],
            ['#cancel-accusation-btn', 'click', () => this.showScreen('game-screen')],
        ]);

        // 模态框关闭
        DOMHelper.$$('.close-btn').forEach(btn => {
            DOMHelper.bindEvent(btn, 'click', (e) => {
                const modal = e.target.closest('.modal');
                this.hideModal(modal.id);
            });
        });

        // 点击模态框外部关闭
        DOMHelper.$$('.modal').forEach(modal => {
            DOMHelper.bindEvent(modal, 'click', (e) => {
                if (e.target === modal) {
                    this.hideModal(modal.id);
                }
            });
        });

        // 问题输入框回车提交和实时状态更新
        const questionInput = DOMHelper.$('#question-input');
        if (questionInput) {
            DOMHelper.bindEvent(questionInput, 'keydown', (e) => {
                if (e.key === 'Enter' && e.ctrlKey) {
                    this.askQuestion();
                }
            });
            
            // 监听输入变化，实时更新发送按钮状态
            DOMHelper.bindEvent(questionInput, 'input', () => {
                this.updateSendButtonState();
            });
        }
    }
    
    // 显示/隐藏加载屏幕
    // 统一的加载屏幕管理
    toggleLoadingScreen(show = true) {
        DOMHelper.toggle('#loading-screen', show);
    }
    
    showLoadingScreen() {
        this.toggleLoadingScreen(true);
    }
    
    hideLoadingScreen() {
        this.toggleLoadingScreen(false);
    }
    
    // 屏幕切换
    showScreen(screenId) {
        // 如果角色正在说话，禁用界面切换
        if (this.isCharacterSpeaking) {
            return;
        }
        
        DOMHelper.$$('.screen').forEach(screen => {
            screen.classList.remove('active');
        });
        DOMHelper.$(`#${screenId}`).classList.add('active');
    }
    
    // 模态框显示/隐藏
    // 统一的模态框管理
    toggleModal(modalId, show = true) {
        const modal = DOMHelper.$(`#${modalId}`);
        if (modal) {
            DOMHelper.toggleClass(modal, 'active', show);
        }
    }
    
    showModal(modalId) {
        this.toggleModal(modalId, true);
    }
    
    hideModal(modalId) {
        this.toggleModal(modalId, false);
    }
    
    // 显示消息模态框
    showMessage(title, content, isHtml = false, callback = null) {
        DOMHelper.setText('#message-title', title);
        if (isHtml) {
            DOMHelper.setHTML('#message-content', content);
        } else {
            DOMHelper.setText('#message-content', content);
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
        // 如果角色正在说话，禁用界面切换
        if (this.isCharacterSpeaking) {
            return;
        }
        
        this.showLoadingScreen();
        
        try {
            // 并行加载案例和分类数据
            const [cases, categories] = await Promise.all([
                APIHelper.get(`${this.apiBase}/cases`),
                APIHelper.get(`${this.apiBase}/categories`)
            ]);
            
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
        const filtersContainer = DOMHelper.$('#case-filters');
        if (!filtersContainer) return;
        
        this.selectedFilters = {
            category: '',
            difficulty: ''
        };
        
        filtersContainer.innerHTML = `
            <div class="filter-section">
                <div class="filter-label">案件分类</div>
                <div class="filter-tags" id="category-tags">
                    <div class="filter-tag active" data-value="">全部</div>
                    ${categories.categories.map(cat => 
                        `<div class="filter-tag" data-value="${cat.value}">${cat.name}</div>`
                    ).join('')}
                </div>
            </div>
            <div class="filter-section">
                <div class="filter-label">难度等级</div>
                <div class="filter-tags" id="difficulty-tags">
                    <div class="filter-tag active" data-value="">全部</div>
                    ${categories.difficulties.map(diff => 
                        `<div class="filter-tag" data-value="${diff.value}">${diff.name}</div>`
                    ).join('')}
                </div>
            </div>

        `;
        
        // 绑定过滤器事件
        this.bindFilterEvents();
    }
    
    // 绑定过滤器事件
    bindFilterEvents() {
        // 使用DOMHelper统一绑定过滤器事件
        const categoryTags = DOMHelper.$$('#category-tags .filter-tag');
        const difficultyTags = DOMHelper.$$('#difficulty-tags .filter-tag');
        
        categoryTags.forEach(tag => {
            DOMHelper.bindEvent(tag, 'click', () => {
                this.selectFilterTag('category', tag);
            });
        });
        
        difficultyTags.forEach(tag => {
            DOMHelper.bindEvent(tag, 'click', () => {
                this.selectFilterTag('difficulty', tag);
            });
        });
    }
    
    // 选择过滤标签
    selectFilterTag(type, selectedTag) {
        const container = DOMHelper.$(`#${type}-tags`);
        const allTags = container.querySelectorAll('.filter-tag');
        
        // 移除所有active状态
        allTags.forEach(tag => tag.classList.remove('active'));
        
        // 添加选中状态
        selectedTag.classList.add('active');
        
        // 更新过滤器状态
        this.selectedFilters[type] = selectedTag.dataset.value;
        
        // 立即应用过滤
        this.applyFilters();
    }
    
    // 应用过滤器
    async applyFilters() {
        const category = this.selectedFilters.category;
        const difficulty = this.selectedFilters.difficulty;
        
        this.showLoadingScreen();
        
        try {
            const params = new URLSearchParams();
            if (category) params.append('category', category);
            if (difficulty) params.append('difficulty', difficulty);
            
            const cases = await APIHelper.get(`${this.apiBase}/cases?${params}`);
            
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
        // 重置过滤器状态
        this.selectedFilters = {
            category: '',
            difficulty: ''
        };
        
        // 重置UI状态
        document.querySelectorAll('.filter-tag').forEach(tag => {
            tag.classList.remove('active');
        });
        
        // 激活"全部"选项
        document.querySelectorAll('.filter-tag[data-value=""]').forEach(tag => {
            tag.classList.add('active');
        });
        
        await this.applyFilters();
    }
    
    // 渲染案例列表
    renderCases(cases) {
        const casesList = DOMHelper.$('#cases-list');
        DOMHelper.setHTML('#cases-list', '');
        
        if (cases.length === 0) {
            DOMHelper.setHTML('#cases-list', '<div class="no-cases">没有找到符合条件的案例</div>');
            return;
        }
        
        cases.forEach((caseData) => {
            const caseCard = DOMHelper.createElement('div', { className: 'case-card' });
            // 获取分类和难度的中文名称
            const categoryName = this.getCategoryName(caseData.category);
            const difficultyName = this.getDifficultyName(caseData.difficulty);
            // 截取描述，只显示前4行左右的内容
            const shortDescription = this.truncateDescription(caseData.description, 120);
            DOMHelper.setHTML(caseCard, `
                <div class="case-badges-top">
                    <span class="badge-top badge-category">${categoryName}</span>
                    <span class="badge-top badge-difficulty badge-${caseData.difficulty}">${difficultyName}</span>
                </div>
                <div class="case-content">
                    <div class="case-title-row">
                        <h3>${caseData.title}</h3>
                    </div>
                    <div class="case-description">${shortDescription}</div>
                    <div class="case-footer">
                        <div class="case-meta-info">
                            <span class="meta-item"><i class="fas fa-user-injured"></i>${caseData.victim_name}</span>
                            <span class="meta-item"><i class="fas fa-map-marker-alt"></i>${caseData.crime_scene}</span>
                            <span class="meta-item"><i class="fas fa-clock"></i>${caseData.time_of_crime}</span>
                        </div>
                        <div class="case-stats">
                            <span class="stats-item"><i class="fas fa-users"></i>${caseData.characters.length}人</span>
                        </div>
                    </div>
                </div>
            `);
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
        // 如果角色正在说话，禁用案件选择
        if (this.isCharacterSpeaking) {
            return;
        }
        
        // 先显示神秘的案件加载界面
        this.showCaseLoadingScreen();
        
        try {
            const gameData = await APIHelper.post(`${this.apiBase}/game/start`, {
                case_index: caseIndex,
                client_id: this.clientId  // 发送客户端ID
            });
            
            this.sessionId = gameData.session_id;
            this.currentCase = gameData.case;
            this.gameState = gameData.game_state;
            
            this.log(`游戏开始 - 会话ID: ${this.sessionId}, 客户端ID: ${this.clientId}`);
            
            // 自动应用案件对应的主题
            this.applyThemeForCase();

            // 显示氛围窗口
            await this.waitForLoadingComplete();
            await this.hideCaseLoadingScreen();
            
            // 显示案件介绍
            this.showCaseIntroduction();
        } catch (error) {
            this.logError('开始游戏失败:', error);
            this.showMessage('错误', '开始游戏失败，请重试');
            // 出错时隐藏加载界面并返回案件选择界面
            await this.hideCaseLoadingScreen();
            this.showScreen('case-selection');
        }
    }

    // 显示神秘案件加载界面
    showCaseLoadingScreen() {
        const loadingScreen = DOMHelper.$('#case-loading-screen');
        if (loadingScreen) {
            // 重置所有状态
            loadingScreen.classList.remove('fade-out');
            loadingScreen.style.display = '';  // 清除内联样式
        }
        this.showScreen('case-loading-screen');
        // 开始加载步骤动画
        this.startLoadingStepsAnimation();
    }

    // 隐藏神秘案件加载界面（带淡出效果）
    async hideCaseLoadingScreen() {
        const loadingScreen = DOMHelper.$('#case-loading-screen');
        if (loadingScreen) {
            // 添加淡出类
            loadingScreen.classList.add('fade-out');
            // 等待淡出动画完成（0.8秒）
            await new Promise(resolve => setTimeout(resolve, 800));
            // 淡出完成后，移除active类并设置display:none，确保屏幕完全隐藏
            loadingScreen.classList.remove('active');
            loadingScreen.style.display = 'none';
        }
    }

    // 启动加载步骤动画
    startLoadingStepsAnimation() {
        const steps = ['1', '2', '3'];
        let currentStep = 0;

        const animateStep = () => {
            if (currentStep > 0) {
                // 标记前一步为完成
                const prevStep = DOMHelper.$(`[data-step="${currentStep}"]`);
                if (prevStep) {
                    prevStep.classList.remove('active');
                    prevStep.classList.add('completed');
                }
            }

            if (currentStep < steps.length) {
                // 激活当前步骤
                const currentStepElement = DOMHelper.$(`[data-step="${steps[currentStep]}"]`);
                if (currentStepElement) {
                    currentStepElement.classList.add('active');
                }
                currentStep++;
                
                // 每个步骤间隔600ms
                setTimeout(animateStep, 600);
            }
        };

        // 开始动画
        setTimeout(animateStep, 300);
    }

    // 等待加载完成
    async waitForLoadingComplete() {
        // 等待1.8秒（3个步骤 * 600ms + 额外等待时间）
        return new Promise(resolve => {
            setTimeout(resolve, 1800);
        });
    }
    
    // 生成案情介绍内容数组（参考 mobile 端）
    generateIntroContent() {
        const victim = this.currentCase.characters.find(char => 
            char.name === this.currentCase.victim_name && char.character_type === 'victim'
        );
        return [
            { type: 'title', text: this.currentCase.title, delay: 1000 },
            { type: 'subtitle', text: '案件详情', delay: 800 },
            { type: 'detail', label: '受害者', text: this.currentCase.victim_name, delay: 500 },
            { type: 'detail', label: '年龄职业', text: victim ? `${victim.age}岁，${victim.occupation}` : '信息不详', delay: 500 },
            { type: 'detail', label: '案发时间', text: this.currentCase.time_of_crime, delay: 500 },
            { type: 'detail', label: '案发地点', text: this.currentCase.crime_scene, delay: 500 },
            { type: 'subtitle', text: '案情概述', delay: 800 },
            { type: 'detail', text: this.currentCase.description, delay: 1000 },
            { type: 'subtitle', text: '相关人员', delay: 800 },
            ...this.currentCase.characters.map(char => ({
                type: 'character',
                character: char,
                delay: 600
            })),
            { type: 'subtitle', text: '调查目标', delay: 800 },
            { type: 'detail', text: '通过与相关人员对话，收集线索和证据，分析案件真相，最终找出真正的凶手。', delay: 800 }
        ];
    }

    // 创建案情介绍单项元素
    createIntroElement(item) {
        // 对于detail和character类型使用intro-detail类名，其他类型使用intro-section
        const className = (item.type === 'detail' || item.type === 'character') ? 'intro-detail' : 'intro-section';
        const div = DOMHelper.createElement('div', { className });
        switch (item.type) {
            case 'title':
                DOMHelper.setHTML(div, '<h1 class="intro-title"></h1>');
                break;
            case 'subtitle':
                DOMHelper.setHTML(div, '<h2 class="intro-subtitle"></h2>');
                break;
            case 'detail':
                const labelHtml = item.label ? `<strong>${item.label}：</strong>` : '';
                DOMHelper.setHTML(div, `<div class="intro-detail-content">${labelHtml}<span class="detail-text"></span></div>`);
                break;
            case 'character':
                // 以纯文本段落方式输出角色信息
                const char = item.character;
                // 角色类型中文
                const typeText = this._getCharacterTypeText(char.character_type);
                // 拼接内容：姓名，年龄，职业，类型。简介
                const info = `${char.name}，${char.age}岁，${char.occupation}，${typeText}。${char.background}`;
                item.text = info
                DOMHelper.setHTML(div, `<div class="intro-detail-content"><span class="detail-text"></span></div>`);
                break;
        }
        return div;
    }

    // 打字机动画显示内容
    async typewriterEffect(element, item) {
        if (this.skipTypewriter) return null;
        let cursor = null;
        switch (item.type) {
            case 'title':
                cursor = await this.typewriterTextForElement(element.querySelector('.intro-title'), item.text, 80, 300);
                break;
            case 'subtitle':
                cursor = await this.typewriterTextForElement(element.querySelector('.intro-subtitle'), item.text, 60, 300);
                break;
            case 'detail':
                cursor = await this.typewriterTextForElement(element.querySelector('.detail-text'), item.text, 50, 600);
                break;
            case 'character':
                cursor = await this.typewriterTextForElement(element.querySelector('.detail-text'), item.text, 50, 600);
                break;
        }
        return cursor;
    }

    // 为元素添加打字机效果（支持任意元素）
    async typewriterTextForElement(element, text, speed = 50, waitAfter = 0) {
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
        
        // 创建文本容器和光标容器
        const textContainer = DOMHelper.createElement('span');
        const cursor = DOMHelper.createElement('span', { className: 'typewriter-cursor' });
        cursor.textContent = '█'; // 使用实心方块字符
        
        element.appendChild(textContainer);
        element.appendChild(cursor);
        
        // 逐字显示文本
        for (let i = 0; i < text.length; i++) {
            await new Promise(resolve => setTimeout(resolve, speed));
            // 更新文本容器内容
            textContainer.textContent = text.substring(0, i + 1);
        }
        // 整行显示完成后等待（光标一直显示）
        if (waitAfter > 0) {
            await new Promise(resolve => setTimeout(resolve, waitAfter));
        }
        // 移除光标
        cursor.remove();
    }

    // 重写案情介绍主流程
    async showCaseIntroduction() {
        // 如果角色正在说话，禁用界面切换
        if (this.isCharacterSpeaking) {
            return;
        }
        
        this.showScreen('case-intro-screen');
        this.skipTypewriter = false;
        const introContent = DOMHelper.$('#intro-content');
        introContent.innerHTML = '';
        // 增加日志，输出角色数据
        const contentArr = this.generateIntroContent();
        for (const item of contentArr) {
            if (this.skipTypewriter) break;
            const element = this.createIntroElement(item);
            introContent.appendChild(element);
            const cursor = await this.typewriterEffect(element, item);
            if (cursor) {
                cursor.style.opacity = '1';
                await this.delay(350);
                cursor.remove();
            }
            await this.delay(item.delay || 300);
        }
        // 动画结束，启用按钮
        if (!this.skipTypewriter) {
            DOMHelper.$('#start-investigation-btn').disabled = false;
        }
    }

    // 跳过介绍动画，直接显示全部内容
    skipIntroduction() {
        this.skipTypewriter = true;
        const introContent = DOMHelper.$('#intro-content');
        introContent.innerHTML = '';
        const contentArr = this.generateIntroContent();
        for (const item of contentArr) {
            const element = this.createIntroElement(item);
            // 直接填充内容
            switch (item.type) {
                case 'title':
                    element.querySelector('.intro-title').textContent = item.text; break;
                case 'subtitle':
                    element.querySelector('.intro-subtitle').textContent = item.text; break;
                case 'detail':
                    element.querySelector('.detail-text').textContent = item.text; break;
                case 'text':
                    element.querySelector('.intro-text').textContent = item.text; break;
                case 'character':
                    element.querySelector('.detail-text').textContent = item.text; break;
            }
            introContent.appendChild(element);
        }
        DOMHelper.$('#start-investigation-btn').disabled = false;
    }
    
    // 根据案件类型自动应用主题
    applyThemeForCase() {
        if (!this.currentCase || !this.currentCase.category) {
            this.log('无法应用主题：案件数据或类型缺失');
            return;
        }

        // 检查主题管理器是否存在
        if (!window.themeManager) {
            this.log('警告：主题管理器未加载');
            return;
        }

        // 等待主题管理器加载完成
        if (window.themeManager.isReady()) {
            const recommendedTheme = window.themeManager.getRecommendedTheme(this.currentCase.category);
            if (recommendedTheme) {
                window.themeManager.applyTheme(recommendedTheme);
                this.log(`已为案件类型 ${this.currentCase.category} 自动应用主题: ${recommendedTheme}`);
            } else {
                this.log(`未找到案件类型 ${this.currentCase.category} 对应的主题`);
            }
        } else {
            // 如果主题管理器还未加载完成，等待加载
            this.log('主题管理器正在加载中，等待完成...');
            window.themeManager.waitForReady().then(() => {
                const recommendedTheme = window.themeManager.getRecommendedTheme(this.currentCase.category);
                if (recommendedTheme) {
                    window.themeManager.applyTheme(recommendedTheme);
                    this.log(`已为案件类型 ${this.currentCase.category} 自动应用主题: ${recommendedTheme}`);
                } else {
                    this.log(`未找到案件类型 ${this.currentCase.category} 对应的主题`);
                }
            }).catch(error => {
                this.log('主题管理器加载失败:', error);
            });
        }
    }
    
    
    // 根据姓名查找受害人角色信息（内部使用）
    _getVictimCharacter() {
        return this.currentCase.characters.find(character => 
            character.name === this.currentCase.victim_name && 
            character.character_type === 'victim'
        );
    }
    
    
    
    // 延迟方法
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    // 开始调查
    startInvestigation() {
        this.initializeGame();
        this.connectWebSocket();
        this.showScreen('game-screen');
    }
    
    // 立即显示所有介绍内容
    showAllIntroContent() {
        // 填充标题
        DOMHelper.setText('#intro-case-title', this.currentCase.title);
        
        // 显示所有区域
        DOMHelper.show('#case-details-section');
        DOMHelper.show('#description-section');
        DOMHelper.show('#characters-section');
        DOMHelper.show('#goals-section');
        
        // 填充所有标题
        DOMHelper.setText(DOMHelper.$('#case-details-title span'), '案件详情');
        DOMHelper.setText(DOMHelper.$('#description-title span'), '案情概述');
        DOMHelper.setText(DOMHelper.$('#characters-title span'), '相关人员');
        DOMHelper.setText(DOMHelper.$('#goals-title span'), '调查目标');
        
        // 显示案件详情
        this.showCaseDetailsInstant();
        
        // 填充案情描述
        DOMHelper.setHTML(DOMHelper.$('#intro-description'), this.currentCase.description);
        
        // 显示角色信息
        this.renderIntroCharactersInstant();
        
        // 显示调查目标
        this.showGoalsInstant();
        
        // 启用开始按钮
        DOMHelper.$('#start-investigation-btn').disabled = false;
    }
    
    // 立即显示角色信息
    renderIntroCharactersInstant() {
        const charactersGrid = DOMHelper.$('#intro-characters');
        charactersGrid.innerHTML = '';
        
        this.currentCase.characters.forEach(character => {
            const characterCard = DOMHelper.createElement('div');
            characterCard.className = 'intro-character-card show';
            characterCard.innerHTML = this._createCharacterCardHTML(character, 'intro');
            charactersGrid.appendChild(characterCard);
        });
    }
    
    // 立即显示案件详情
    showCaseDetailsInstant() {
        const victim = this._getVictimCharacter();
        
        // 填充标签文本
        DOMHelper.setText(DOMHelper.$('#victim-label'), '受害者');
        DOMHelper.setText(DOMHelper.$('#victim-age-label'), '年龄职业');
        DOMHelper.setText(DOMHelper.$('#death-time-label'), '时间');
        DOMHelper.setText(DOMHelper.$('#death-location-label'), '地点');
        
        // 填充案件详情内容
        DOMHelper.setText(DOMHelper.$('#victim-name'), this.currentCase.victim_name || '未知');
        DOMHelper.setText(DOMHelper.$('#victim-age-occupation'), victim ? `${victim.age}岁，${victim.occupation}` : '信息不详');
        DOMHelper.setText(DOMHelper.$('#death-time'), this.currentCase.time_of_crime || '时间不详');
        DOMHelper.setText(DOMHelper.$('#death-location'), this.currentCase.crime_scene || '地点不详');
        
        // 显示图标
        DOMHelper.setHTML(DOMHelper.$('#victim-icon'), '<i class="fas fa-user-injured"></i>');
        DOMHelper.setHTML(DOMHelper.$('#victim-age-icon'), '<i class="fas fa-id-card"></i>');
        DOMHelper.setHTML(DOMHelper.$('#death-time-icon'), '<i class="fas fa-clock"></i>');
        DOMHelper.setHTML(DOMHelper.$('#death-location-icon'), '<i class="fas fa-map-marker-alt"></i>');
        
        // 显示所有详情项目
        DOMHelper.$$('.detail-item').forEach(item => item.classList.add('show'));
    }
    
    // 立即显示调查目标
    showGoalsInstant() {
        const goals = [
            '通过询问相关人员收集线索',
            '分析证据，寻找矛盾之处', 
            '找出真凶并进行指控'
        ];
        
        const goalItems = DOMHelper.$$('.goal-item');
        const goalElements = DOMHelper.$$('.goal-item span');
        
        goalItems.forEach(item => item.classList.add('show'));
        
        for (let i = 0; i < goals.length && i < goalElements.length; i++) {
            DOMHelper.setText(goalElements[i], goals[i]);
        }
    }

    // 初始化游戏界面
    initializeGame() {
        // 更新案例信息
        DOMHelper.setText('#case-title', this.currentCase.title);
        DOMHelper.setHTML('#case-description', this.currentCase.description);
        
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
        
        // 更新发送按钮状态
        this.updateSendButtonState();
    }
    
    // 更新被害人信息
    updateVictimInfo() {
        if (!this.currentCase) {
            this.log('⚠️ 当前案件数据为空，无法更新被害人信息');
            return;
        }

        const victimNameEl = DOMHelper.$('#game-victim-name');     
        const crimeSceneEl = DOMHelper.$('#game-crime-scene');
        const crimeTimeEl = DOMHelper.$('#game-crime-time');
        
        this.log('🔄 正在更新被害人信息...');
        this.log('DOM元素查找结果:', {
            victimNameEl: !!victimNameEl,
            crimeSceneEl: !!crimeSceneEl,
            crimeTimeEl: !!crimeTimeEl
        });
        
        if (victimNameEl) {
            const victimName = this.currentCase.victim_name || '未知';
            victimNameEl.textContent = victimName;
            victimNameEl.style.color = 'var(--theme-text-primary)';
            victimNameEl.style.fontWeight = '600';
            this.log('✅ 设置被害人姓名:', victimName);
        } else {
            this.log('❌ 找不到 game-victim-name 元素');
        }
        
        if (crimeSceneEl) {
            const crimeScene = this.currentCase.crime_scene || '未知';
            crimeSceneEl.textContent = crimeScene;
            crimeSceneEl.style.color = 'var(--theme-text-primary)';
            crimeSceneEl.style.fontWeight = '600';
            this.log('✅ 设置案发地点:', crimeScene);
        } else {
            this.log('❌ 找不到 game-crime-scene 元素');
        }
        
        if (crimeTimeEl) {
            const crimeTime = this.currentCase.time_of_crime || '未知';
            crimeTimeEl.textContent = crimeTime;
            crimeTimeEl.style.color = 'var(--theme-text-primary)';
            crimeTimeEl.style.fontWeight = '600';
            this.log('✅ 设置案发时间:', crimeTime);
        } else {
            this.log('❌ 找不到 game-crime-time 元素');
        }
    }
    
    // 更新游戏统计信息
    updateGameStats() {
        // 更新轮次计数显示在提问按钮中
        const currentRoundEl = DOMHelper.$('#current-round');
        const maxRoundsEl = DOMHelper.$('#max-rounds');
        
        if (currentRoundEl) {
            currentRoundEl.textContent = this.gameState.current_round;
        }
        if (maxRoundsEl) {
            maxRoundsEl.textContent = this.gameState.max_rounds;
        }
        
        // 更新提示次数显示在获取提示按钮中
        const hintsUsedEl = DOMHelper.$('#hints-used');
        const maxHintsEl = DOMHelper.$('#max-hints');
        
        if (hintsUsedEl) {
            hintsUsedEl.textContent = this.gameState.hints_used;
        }
        if (maxHintsEl) {
            maxHintsEl.textContent = this.gameState.max_hints;
        }
        
        // 更新提示按钮状态
        const hintBtn = DOMHelper.$('#get-hint-btn');
        if (hintBtn) {
            hintBtn.disabled = this.gameState.hints_used >= this.gameState.max_hints;
            
            // 如果提示次数用完，更新按钮样式
            if (this.gameState.hints_used >= this.gameState.max_hints) {
                hintBtn.style.opacity = '0.6';
            } else {
                hintBtn.style.opacity = '1';
            }
        }
        
        // 更新发送按钮计数和状态
        this.updateSendButtonCounter();
    }
    
    // 更新发送按钮计数显示
    updateSendButtonCounter() {
        const askBtn = DOMHelper.$('#ask-question-btn');
        if (askBtn) {
            const currentRound = this.gameState ? this.gameState.current_round : 0;
            const maxRounds = this.gameState ? this.gameState.max_rounds : 30;
            askBtn.innerHTML = `
                <span class="button-text">
                    <i class="fas fa-paper-plane"></i>
                    提问
                </span>
                <span class="button-count">(${currentRound}/${maxRounds})</span>
            `;
        }
        this.updateSendButtonState();
    }
    
    // 更新发送按钮状态
    updateSendButtonState() {
        const askBtn = DOMHelper.$('#ask-question-btn');
        const questionInput = DOMHelper.$('#question-input');
        
        if (askBtn && questionInput) {
            const hasContent = questionInput.value.trim().length > 0;
            const canAskQuestion = this.gameState ? (this.gameState.current_round < this.gameState.max_rounds) : true;
            const isNotSpeaking = !this.isCharacterSpeaking;
            const hasSelectedCharacter = !!this.selectedCharacter;
            const hasGameState = !!this.gameState;
            
            // 只有在有内容、未达到轮次限制、角色未在说话且已选择角色时才启用按钮
            askBtn.disabled = !hasContent || !canAskQuestion || !isNotSpeaking || !hasSelectedCharacter || !hasGameState;
            
            // 根据不同状态设置提示信息
            if (this.isCharacterSpeaking) {
                DOMHelper.toggleClass(askBtn, 'disabled', true);
                askBtn.title = '角色正在回答中，请稍候...';
            } else if (!hasGameState) {
                DOMHelper.toggleClass(askBtn, 'disabled', true);
                askBtn.title = '请先开始游戏';
            } else if (!hasSelectedCharacter) {
                DOMHelper.toggleClass(askBtn, 'disabled', true);
                askBtn.title = '请先选择一个角色';
            } else if (!canAskQuestion) {
                DOMHelper.toggleClass(askBtn, 'disabled', true);
                askBtn.title = '已达到最大提问轮次';
            } else {
                DOMHelper.toggleClass(askBtn, 'disabled', false);
                askBtn.title = hasContent ? '发送问题' : '请输入问题';
            }
        }
    }
    
    // 渲染角色列表
    renderCharacters() {
        const charactersList = DOMHelper.$('#characters-list');
        charactersList.innerHTML = '';
        
        // 过滤掉受害者，因为死者无法进行对话
        const availableCharacters = this.currentCase.characters.filter(character => 
            character.character_type !== 'victim'
        );
        
        availableCharacters.forEach(character => {
            const characterCard = DOMHelper.createElement('div', { className: 'character-card' });
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
        // 如果角色正在说话，禁用角色选择
        if (this.isCharacterSpeaking) {
            return;
        }
        
        this.selectedCharacter = character;
        
        // 更新角色卡片状态
        DOMHelper.$$('.character-card').forEach(card => {
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
        DOMHelper.show('#question-input-area');
        
        // 显示参考问题区域
        const suggestedQuestions = DOMHelper.$('.suggested-questions');
        if (suggestedQuestions) {
            DOMHelper.show(suggestedQuestions);
        }
        
        // 显示参考问题加载状态
        const questionsList = DOMHelper.$('#suggested-questions-list');
        if (questionsList) {
            questionsList.innerHTML = this._createLoadingSuggestionsHTML();
        }
        
        // 获取参考问题
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
            DOMHelper.hide('#default-header');
            DOMHelper.show('#character-header');
            
            // 设置角色头像图标
            const avatarIcon = DOMHelper.$('#character-avatar-icon');
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
            const nameDisplay = DOMHelper.$('#character-name-display');
            const occupationDisplay = DOMHelper.$('#character-occupation-display');
            const typeDisplay = DOMHelper.$('#character-type-display');
            const backgroundText = DOMHelper.$('#character-background-text');
            
            if (nameDisplay) DOMHelper.setText(nameDisplay, character.name || '未知');
            if (occupationDisplay) DOMHelper.setText(occupationDisplay, character.occupation || '职业不详');
            
            // 设置角色类型标签
            if (typeDisplay) {
                DOMHelper.setText(typeDisplay, this._getCharacterTypeText(characterType));
                typeDisplay.className = `character-type-badge-small ${characterType.toLowerCase()}`;
            }
            
            // 设置背景信息
            if (backgroundText) {
                DOMHelper.setText(backgroundText, character.background || '暂无背景信息');
            }
            this.log('角色背景信息显示成功');
            
        } catch (error) {
            this.logError('显示角色背景信息时出错:', error);
        }
    }
    

    
    // 显示特定角色的对话历史
    showCharacterConversation(character) {
        const conversationArea = DOMHelper.$('#conversation-area');
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
                const conversationItem = DOMHelper.createElement('div', { className: 'conversation-item' });
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
        const questionsList = DOMHelper.$('#suggested-questions-list');
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
        const questionsList = DOMHelper.$('#suggested-questions-list');
        questionsList.innerHTML = '';
        
        questions.forEach(question => {
            const questionBtn = DOMHelper.createElement('button', { className: 'suggested-question' });
            questionBtn.textContent = question;
            questionBtn.addEventListener('click', () => {
                const questionInput = DOMHelper.$('#question-input');
                if (questionInput) {
                    questionInput.value = question;
                }
                this.updateSendButtonState();
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
        
        const questionInput = DOMHelper.$('#question-input');
        const question = questionInput.value.trim();
        
        if (!question) {
            this.showMessage('提示', '请输入问题');
            return;
        }
        
        const askBtn = DOMHelper.$('#ask-question-btn');
        askBtn.disabled = true;
        askBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 提问中...';
        
        // 设置角色正在说话状态
        this.isCharacterSpeaking = true;
        
        // 清空输入框
        questionInput.value = '';
        
        try {
            await this.askQuestionStream(question);
        } catch (error) {
            this.logError('提问失败:', error);
            this.showMessage('错误', '提问失败，请重试');
        } finally {
            // 重置角色说话状态
            this.isCharacterSpeaking = false;
            
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
        const conversationArea = DOMHelper.$('#conversation-area');
        
        // 隐藏欢迎消息
        const welcomeMessage = conversationArea.querySelector('.welcome-message');
        if (welcomeMessage) {
            DOMHelper.hide(welcomeMessage);
        }
        
        const conversationItem = DOMHelper.createElement('div', { className: 'conversation-item' });
        conversationItem.innerHTML = this._createConversationItemHTML(question);
        
        conversationArea.appendChild(conversationItem);
        conversationArea.scrollTop = conversationArea.scrollHeight;
        
        return conversationItem;
    }
    
    // 创建响应容器
    createResponseContainer() {
        const conversationArea = DOMHelper.$('#conversation-area');
        const lastItem = conversationArea.lastElementChild;
        
        const responseDiv = DOMHelper.createElement('div', { className: 'response streaming' });
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
        const conversationArea = DOMHelper.$('#conversation-area');
        conversationArea.scrollTop = conversationArea.scrollHeight;
    }
    
    // 完成对话回复（移除打字效果）
    completeResponse(container, text) {
        container.className = 'response';
        container.innerHTML = text;
        
        // 滚动到底部
        const conversationArea = DOMHelper.$('#conversation-area');
        conversationArea.scrollTop = conversationArea.scrollHeight;
    }
    
    // 显示证据发现通知
    showEvidenceNotification(evidence) {
        // 创建证据通知
        const notification = DOMHelper.createElement('div', { className: 'evidence-notification' });
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
        const questionInputDiv = DOMHelper.$('.question-input');
        const questionsList = DOMHelper.$('#suggested-questions-list');
        const questionInputArea = DOMHelper.$('#question-input-area');
        
        // 确保问题输入区域是显示的，并添加轮次结束样式
        if (questionInputArea) {
            DOMHelper.show(questionInputArea);
            questionInputArea.className = 'question-input-area rounds-ended-area';
        }
        
        // 隐藏整个问题输入框区域
        if (questionInputDiv) {
            DOMHelper.hide(questionInputDiv);
        }
        
        // 保持参考问题区域显示，但显示轮次结束提示
        const suggestedQuestions = DOMHelper.$('.suggested-questions');
        if (suggestedQuestions) {
            DOMHelper.show(suggestedQuestions);
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
        const conversationArea = DOMHelper.$('#conversation-area');
        conversationArea.innerHTML = `
            <div class="welcome-message">
                <i class="fas fa-arrow-left"></i>
                <p>点击左侧角色开始询问</p>
            </div>
        `;
        
        // 恢复默认标题，隐藏角色标题
        DOMHelper.show('#default-header');
            DOMHelper.hide('#character-header');
        
        // 收起背景信息
        const expandableArea = DOMHelper.$('#character-background-expandable');
        const toggleBtn = DOMHelper.$('#toggle-background-btn');
        if (expandableArea) DOMHelper.hide(expandableArea);
        if (toggleBtn) {
            toggleBtn.classList.remove('expanded');
            toggleBtn.title = '展开背景信息';
        }
        
        DOMHelper.hide('#question-input-area');
    }
    
    // 添加证据
    addEvidence(evidence) {
        this.evidenceList.push(evidence);
        this.updateEvidenceDisplay();
        
        // 显示证据通知
        const conversationArea = DOMHelper.$('#conversation-area');
        const notification = DOMHelper.createElement('div', { className: 'evidence-notification' });
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
        const evidenceList = DOMHelper.$('#evidence-list');
        
        if (this.evidenceList.length === 0) {
            evidenceList.innerHTML = '<p class="no-evidence">暂无发现的证据</p>';
            return;
        }
        
        evidenceList.innerHTML = '';
        this.evidenceList.forEach(evidence => {
            const evidenceItem = DOMHelper.createElement('div', { className: 'evidence-item' });
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
        const hintsList = DOMHelper.$('#hints-list');
        
        if (this.hintsHistory.length === 0) {
            hintsList.innerHTML = '<p class="no-hints">暂无获取的提示</p>';
            return;
        }
        
        hintsList.innerHTML = '';
        this.hintsHistory.forEach(hint => {
            const hintItem = DOMHelper.createElement('div', { className: 'hint-item' });
            hintItem.innerHTML = `
                <div class="hint-content">${hint.content}</div>
                <div class="hint-timestamp">${hint.timestamp}</div>
            `;
            hintsList.appendChild(hintItem);
        });
    }
    
    // 获取提示
    async getHint() {
        const hintBtn = DOMHelper.$('#get-hint-btn');
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
        const accusedSelect = DOMHelper.$('#accused-select');
        accusedSelect.innerHTML = '<option value="">请选择...</option>';
        
        this.currentCase.characters.forEach(character => {
            // 过滤掉专家和受害者，因为他们不能被指控
            if (character.character_type !== 'expert' && character.character_type !== 'victim') {
                const option = DOMHelper.createElement('option');
                option.value = character.name;
                option.textContent = `${character.name} (${character.occupation})`;
                accusedSelect.appendChild(option);
            }
        });
    }
    
    // 提交指控
    async submitAccusation() {
        const accusedName = DOMHelper.$('#accused-select').value;
        const reasoning = DOMHelper.$('#accusation-reasoning').value.trim();
        
        if (!accusedName) {
            this.showMessage('提示', '请选择被指控者');
            return;
        }
        
        if (!reasoning) {
            this.showMessage('提示', '请输入指控理由');
            return;
        }
        
        const submitBtn = DOMHelper.$('#submit-accusation-btn');
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
        
        const resultContent = DOMHelper.$('#trial-result-content');
        resultContent.innerHTML = `
            <div class="trial-result">
                <div class="trial-header">
                    <h2><i class="fas fa-balance-scale"></i> 审判进行中...</h2>
                    <p>正在对 <strong>${accusedName}</strong> 的指控进行审理</p>
                </div>
                <div id="trial-steps" class="trial-steps"></div>
            </div>
        `;
        
        const trialSteps = DOMHelper.$('#trial-steps');
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
            DOMHelper.appendHTML(trialSteps, `
                <div class="trial-error">
                    <h3><i class="fas fa-exclamation-triangle"></i> 审判过程出现错误</h3>
                    <p>请重试或联系管理员</p>
                </div>
            `);
        }
    }
    
    // 处理审判流式数据
    async handleTrialStreamData(data, trialSteps, trialData) {
        console.log('收到审判事件:', data.type, data);
        
        switch (data.type) {
            case 'start':
                trialSteps.innerHTML = ``;
                break;
                
            case 'evaluation_chunk':
                // 确保评估容器存在
                let evaluationContainer = DOMHelper.$('#content-evaluation');
                if (!evaluationContainer) {
                    const stepDiv = DOMHelper.createElement('div', { className: 'trial-step' });
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
                const challengeDiv = DOMHelper.createElement('div', { className: 'reasoning-challenge' });
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
                const stepDiv = DOMHelper.createElement('div', { className: 'trial-step' });
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
                let defenseContainer = DOMHelper.$('#content-defense');
                if (!defenseContainer) {
                    const stepDiv = DOMHelper.createElement('div', { className: 'trial-step' });
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
                let testimoniesContainer = DOMHelper.$('#content-testimonies');
                if (!testimoniesContainer) {
                    const stepDiv = DOMHelper.createElement('div', { className: 'trial-step' });
                    stepDiv.id = 'step-testimonies';
                    stepDiv.innerHTML = `
                        <div class="step-header">
                            <h3><i class="fas fa-chevron-right"></i> 证人证词</h3>
                        </div>
                        <div class="step-content" id="content-testimonies"></div>
                    `;
                    trialSteps.appendChild(stepDiv);
                    stepDiv.scrollIntoView({ behavior: 'smooth' });
                    testimoniesContainer = DOMHelper.$('#content-testimonies');
                }
                
                const witnessDiv = DOMHelper.createElement('div', { className: 'witness-testimony' });
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
                let votingContainer = DOMHelper.$('#content-voting');
                if (!votingContainer) {
                    const stepDiv = DOMHelper.createElement('div', { className: 'trial-step' });
                    stepDiv.id = 'step-voting';
                    stepDiv.innerHTML = `
                        <div class="step-header">
                            <h3><i class="fas fa-chevron-right"></i> 角色投票</h3>
                        </div>
                        <div class="step-content" id="content-voting"></div>
                    `;
                    trialSteps.appendChild(stepDiv);
                    stepDiv.scrollIntoView({ behavior: 'smooth' });
                    votingContainer = DOMHelper.$('#content-voting');
                }
                
                const voteDiv = DOMHelper.createElement('div', { className: 'vote-item' });
                voteDiv.id = `vote-${data.index}`;
                voteDiv.innerHTML = `
                    <h4><i class="fas fa-vote-yea"></i> ${data.voter_name} 投票</h4>
                    <div class="vote-content" id="vote-content-${data.index}">
                        <div class="thinking-indicator">
                            <i class="fas fa-brain fa-pulse"></i>
                            <span class="thinking-text">正在分析证据信息，思考中</span>
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
                const voteContentElement = DOMHelper.$(`#vote-content-${this._getVoterIndex(data.voter_name, trialData)}`);
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
                const voteElement = DOMHelper.$(`#vote-content-${trialData.votes.length - 1}`);
                if (voteElement) {
                    // 先移除光标
                    this._finalizeTrialStep(`vote-content-${this._getVoterIndex(data.voter_name, trialData)}`);
                    
                    // 然后更新显示内容
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
                let votingSummaryContainer = DOMHelper.$('#content-voting');
                if (!votingSummaryContainer) {
                    const stepDiv = DOMHelper.createElement('div', { className: 'trial-step' });
                    stepDiv.id = 'step-voting';
                    stepDiv.innerHTML = `
                        <div class="step-header">
                            <h3><i class="fas fa-chevron-right"></i> 角色投票</h3>
                        </div>
                        <div class="step-content" id="content-voting"></div>
                    `;
                    trialSteps.appendChild(stepDiv);
                    stepDiv.scrollIntoView({ behavior: 'smooth' });
                    votingSummaryContainer = DOMHelper.$('#content-voting');
                }
                
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
                break;
                
            case 'verdict':
                const verdictClass = data.final_verdict ? 'guilty' : 'innocent';
                const verdictText = data.final_verdict ? '指控成立' : '指控不成立';
                
                // 确保verdict容器存在
                let verdictContainer = DOMHelper.$('#content-verdict');
                if (!verdictContainer) {
                    // 创建审判结果步骤
                    const stepDiv = DOMHelper.createElement('div', { className: 'trial-step' });
                    stepDiv.id = 'step-verdict';
                    stepDiv.innerHTML = `
                        <div class="step-header">
                            <h3><i class="fas fa-chevron-right"></i> 最终判决</h3>
                        </div>
                        <div class="step-content" id="content-verdict"></div>
                    `;
                    trialSteps.appendChild(stepDiv);
                    stepDiv.scrollIntoView({ behavior: 'smooth' });
                    verdictContainer = DOMHelper.$('#content-verdict');
                }
                
                verdictContainer.innerHTML = `
                    <div class="verdict" style="color: var(--theme-text-primary); background: var(--theme-secondary-bg); border: 1px solid var(--theme-border-color);">
                        <i class="fas fa-balance-scale"></i>
                        ${verdictText}
                    </div>
                `;
                break;
                
            case 'correctness':
                const correctnessText = data.is_correct ? '🎉 恭喜！你找到了真凶！' : '😔 很遗憾，你指控了错误的人。';
                
                // 确保verdict容器存在
                let correctnessContainer = DOMHelper.$('#content-verdict');
                if (!correctnessContainer) {
                    // 创建审判结果步骤
                    const stepDiv = DOMHelper.createElement('div', { className: 'trial-step' });
                    stepDiv.id = 'step-verdict';
                    stepDiv.innerHTML = `
                        <div class="step-header">
                            <h3><i class="fas fa-chevron-right"></i> 最终判决</h3>
                        </div>
                        <div class="step-content" id="content-verdict"></div>
                    `;
                    trialSteps.appendChild(stepDiv);
                    stepDiv.scrollIntoView({ behavior: 'smooth' });
                    correctnessContainer = DOMHelper.$('#content-verdict');
                }
                
                DOMHelper.appendHTML(correctnessContainer, `
                    <div class="correctness-indicator">
                        <h3>${correctnessText}</h3>
                    </div>
                `);
                break;
                
            case 'solution_chunk':
                // 确保solution容器存在
                let solutionContainer = DOMHelper.$('#content-solution');
                if (!solutionContainer) {
                    // 创建案件真相步骤
                    const stepDiv = DOMHelper.createElement('div', { className: 'trial-step' });
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
                DOMHelper.appendHTML(trialSteps, `
                    <div class="trial-actions">
                        <button class="btn primary" onclick="app.goToEvaluation()">
                            <i class="fas fa-star"></i> 游戏评价
                        </button>
                        <button class="btn secondary" onclick="app.showScreen('main-menu')">
                            <i class="fas fa-home"></i> 返回主菜单
                        </button>
                    </div>
                `);
                console.log('评价按钮已添加');
                break;
                
            case 'error':
                DOMHelper.appendHTML(trialSteps, `
                    <div class="trial-error">
                        <h3><i class="fas fa-exclamation-triangle"></i> 错误</h3>
                        <p>${data.message}</p>
                    </div>
                `);
                break;
        }
    }
    
    // 添加内容到审判步骤（内部使用）
    _appendToTrialContent(elementId, content) {
        const element = DOMHelper.$(`#${elementId}`);
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
        const element = DOMHelper.$(`#${elementId}`);
        if (element) {
            // 移除所有光标元素
            DOMHelper.$$('.cursor').forEach(cursor => cursor.remove());
            
            // 额外保险：移除所有包含竖线的span元素
            DOMHelper.$$('span').forEach(span => {
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
    

    
    // 跳转到游戏评价页面
    goToEvaluation() {
        // 如果角色正在说话，禁用界面切换
        if (this.isCharacterSpeaking) {
            return;
        }
        
        if (this.sessionId) {
            this.showEvaluationScreen();
        } else {
            this.showMessage('错误', '无法获取游戏会话ID，无法进行评价。');
        }
    }

    // 开始新游戏
    startNewGame() {
        // 如果角色正在说话，禁用开始新游戏
        if (this.isCharacterSpeaking) {
            return;
        }
        
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
        this.isCharacterSpeaking = false;
        
        if (this.websocket) {
            this.websocket.close();
        }
        
        // 更新发送按钮状态
        this.updateSendButtonState();
        
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
        const canvas = DOMHelper.createElement('canvas');
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
        // 增加日志，输出每个角色数据
        console.log('生成角色卡片:', character);
        const typeClass = character.character_type;
        const typeText = this._getCharacterTypeText(character.character_type);
        
        const characterData = {
            name: character.name || '',
            occupation: character.occupation || '',
            typeClass,
            typeText
        };
        
        return this.templates.characterCard(characterData, cardType);
    }

    // 通用加载建议模板生成函数（内部使用）
    _createLoadingSuggestionsHTML() {
        return this.templates.loadingSuggestions();
    }

    // 通用对话项目模板生成函数（内部使用）
    _createConversationItemHTML(question, response = null) {
        return this.templates.conversationItem(question, response);
    }
    
    /**
     * 重置为默认主题
     */
    resetToDefaultTheme() {
        // 等待主题管理器加载完成后应用经典主题
        if (window.themeManager) {
            if (window.themeManager.isReady()) {
                window.themeManager.applyTheme('classic');
                console.log('已重置为默认主题配色');
            } else {
                window.themeManager.waitForReady().then(() => {
                    window.themeManager.applyTheme('classic');
                    console.log('主题管理器加载完成，已重置为默认主题配色');
                });
            }
        } else {
            // 如果主题管理器还未加载，等待一段时间后重试
            setTimeout(() => {
                this.resetToDefaultTheme();
            }, 100);
        }
    }
    
    /**
     * 显示评价界面
     */
    showEvaluationScreen() {
        this.showScreen('evaluation-screen');
        this.initializeEvaluationForm();
    }
    
    /**
     * 初始化评价表单
     */
    initializeEvaluationForm() {
        // 检查必要元素是否存在
        const form = DOMHelper.$('#desktopEvaluationForm');
        const ratingText = DOMHelper.$('#desktopRatingText');
        const successMessage = DOMHelper.$('#evaluationSuccessMessage');
        const errorMessage = DOMHelper.$('#evaluationErrorMessage');
        
        if (!form || !ratingText) {
            console.error('评价表单元素未找到');
            return;
        }
        
        // 重置表单
        form.reset();
        DOMHelper.setText(ratingText, '请选择评分');
        this.selectedRating = 0;
        
        // 隐藏消息
        if (successMessage) {
            successMessage.style.display = 'none';
        }
        if (errorMessage) {
            errorMessage.style.display = 'none';
        }
        
        // 绑定星级评分事件
        this.bindRatingEvents();
        
        // 绑定表单提交事件
        this.bindEvaluationFormEvents();
    }
    
    /**
     * 绑定星级评分事件
     */
    bindRatingEvents() {
        const stars = DOMHelper.$$('#evaluation-screen .star');
        const ratingText = DOMHelper.$('#desktopRatingText');
        const ratingContainer = DOMHelper.$('#evaluation-screen .rating-container');
        const ratingTexts = ['', '很不满意', '不满意', '一般', '满意', '非常满意'];
        
        // 检查必要元素是否存在
        console.log('检查评价页面元素:', {
            stars: stars.length,
            ratingText: !!ratingText,
            ratingContainer: !!ratingContainer
        });
        
        if (!ratingText || !ratingContainer) {
            console.error('评价页面元素未找到:', {
                ratingText: !!ratingText,
                ratingContainer: !!ratingContainer,
                evaluationScreen: !!DOMHelper.$('#evaluation-screen')
            });
            return;
        }
        
        stars.forEach(star => {
            DOMHelper.bindEvent(star, 'click', () => {
                this.selectedRating = parseInt(star.dataset.rating);
                this.updateStars();
                if (ratingText) {
                    DOMHelper.setText(ratingText, ratingTexts[this.selectedRating]);
                }
            });
            
            DOMHelper.bindEvent(star, 'mouseover', () => {
                const rating = parseInt(star.dataset.rating);
                this.highlightStars(rating);
            });
        });
        
        DOMHelper.bindEvent(ratingContainer, 'mouseleave', () => {
            this.updateStars();
        });
    }
    
    /**
     * 高亮星星
     */
    highlightStars(rating) {
        const stars = DOMHelper.$$('#evaluation-screen .star');
        stars.forEach((star, index) => {
            if (star && star.classList) {
                if (index < rating) {
                    star.classList.add('active');
                } else {
                    star.classList.remove('active');
                }
            }
        });
    }
    
    /**
     * 更新星星显示
     */
    updateStars() {
        this.highlightStars(this.selectedRating);
    }
    
    /**
     * 绑定评价表单事件
     */
    bindEvaluationFormEvents() {
        const form = DOMHelper.$('#desktopEvaluationForm');
        DOMHelper.bindEvent(form, 'submit', (e) => {
            e.preventDefault();
            this.submitEvaluation();
        });
    }
    
    /**
     * 提交评价
     */
    async submitEvaluation() {
        if (!this.sessionId) {
            this.showEvaluationError('缺少会话ID，无法提交评价');
            return;
        }
        
        if (this.selectedRating === 0) {
            this.showEvaluationError('请选择评分');
            return;
        }
        
        const reason = DOMHelper.$('#desktopReason').value.trim();
        if (!reason) {
            this.showEvaluationError('请填写评价原因');
            return;
        }
        
        const submitBtn = DOMHelper.$('#desktopSubmitBtn');
        submitBtn.disabled = true;
        submitBtn.textContent = '提交中...';
        
        try {
            const response = await fetch(`${this.apiBase}/game/evaluation`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    session_id: this.sessionId,
                    rating: this.selectedRating,
                    reason: reason,
                    difficulty_feedback: DOMHelper.$('#desktopDifficulty').value || null,
                    most_liked: DOMHelper.$('#desktopMostLiked').value.trim() || null,
                    suggestions: DOMHelper.$('#desktopSuggestions').value.trim() || null,
                    would_recommend: DOMHelper.$('#desktopRecommend').checked
                })
            });
            
            if (response.ok) {
                this.showEvaluationSuccess();
                // 3秒后跳转回主菜单
                setTimeout(() => {
                    this.showScreen('main-menu');
                    this.resetToDefaultTheme();
                }, 3000);
            } else {
                const error = await response.json();
                this.showEvaluationError(error.detail || '提交失败');
            }
        } catch (error) {
            this.logError('提交评价失败:', error);
            this.showEvaluationError('网络错误，请重试');
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = '提交评价';
        }
    }
    
    /**
     * 显示评价成功消息
     */
    showEvaluationSuccess() {
        DOMHelper.setHTML(DOMHelper.$('#evaluationSuccessMessage'), '评价成功！');
        DOMHelper.setHTML(DOMHelper.$('#evaluationErrorMessage'), '');
        DOMHelper.hide('#desktopEvaluationForm');
    }
    
    /**
     * 显示评价错误消息
     */
    showEvaluationError(message) {
        DOMHelper.setText(DOMHelper.$('#evaluationErrorMessage'), message);
        DOMHelper.setHTML(DOMHelper.$('#evaluationSuccessMessage'), '');
        DOMHelper.show('#desktopEvaluationForm');
    }

    // 确保案件加载屏幕被隐藏（用于初始化时）
    ensureCaseLoadingScreenHidden() {
        const loadingScreen = DOMHelper.$('#case-loading-screen');
        if (loadingScreen) {
            // 移除所有相关类
            loadingScreen.classList.remove('active', 'fade-out');
            // 强制隐藏
            loadingScreen.style.display = 'none';
            this.log('案件加载屏幕已强制隐藏');
        }
    }
}

// 初始化应用
let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new DetectiveGameApp();
});