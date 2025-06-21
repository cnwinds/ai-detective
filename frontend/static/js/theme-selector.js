/**
 * 主题选择器组件
 * 提供用户友好的主题切换界面
 */
class ThemeSelector {
    constructor() {
        this.isVisible = false;
        this.currentPreview = null;
        this.init();
    }

    /**
     * 初始化主题选择器
     */
    init() {
        this.createThemeSelector();
        this.bindEvents();
        
        // 等待主题管理器加载完成
        if (window.themeManager) {
            window.themeManager.waitForReady().then(() => {
                this.updateThemeList();
                this.updateCurrentTheme();
            });
        }
    }

    /**
     * 创建主题选择器DOM结构
     */
    createThemeSelector() {
        const selectorHTML = `
            <div id="theme-selector-overlay" class="theme-selector-overlay">
                <div class="theme-selector-panel">
                    <div class="theme-selector-header">
                        <h3>选择主题</h3>
                        <button class="close-theme-selector" aria-label="关闭主题选择器">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="theme-selector-content">
                        <div class="theme-grid" id="theme-grid">
                            <!-- 主题选项将在这里动态生成 -->
                        </div>
                        <div class="theme-preview-actions">
                            <button class="btn-theme-action btn-preview-cancel">取消</button>
                            <button class="btn-theme-action btn-preview-apply">应用主题</button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // 添加到页面
        document.body.insertAdjacentHTML('beforeend', selectorHTML);
        
        // 添加样式
        this.addThemeSelectorStyles();
    }

    /**
     * 添加主题选择器样式
     */
    addThemeSelectorStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .theme-selector-overlay {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.8);
                backdrop-filter: blur(10px);
                z-index: 10000;
                display: none;
                align-items: center;
                justify-content: center;
                opacity: 0;
                transition: opacity 0.3s ease;
            }

            .theme-selector-overlay.show {
                display: flex;
                opacity: 1;
            }

            .theme-selector-panel {
                background: var(--theme-primary-bg);
                border-radius: 20px;
                width: 90%;
                max-width: 400px;
                max-height: 80vh;
                overflow: hidden;
                box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
                transform: translateY(20px);
                transition: transform 0.3s ease;
            }

            .theme-selector-overlay.show .theme-selector-panel {
                transform: translateY(0);
            }

            .theme-selector-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 20px;
                border-bottom: 1px solid rgba(255, 255, 255, 0.1);
            }

            .theme-selector-header h3 {
                margin: 0;
                color: var(--theme-text-primary);
                font-size: 1.2rem;
                font-weight: 600;
            }

            .close-theme-selector {
                width: 32px;
                height: 32px;
                border: none;
                border-radius: 8px;
                background: var(--theme-secondary-bg);
                color: var(--theme-text-primary);
                cursor: pointer;
                transition: all 0.3s ease;
                display: flex;
                align-items: center;
                justify-content: center;
            }

            .close-theme-selector:active {
                background: rgba(255, 255, 255, 0.2);
                transform: scale(0.95);
            }

            .theme-selector-content {
                padding: 20px;
                max-height: 60vh;
                overflow-y: auto;
            }

            .theme-grid {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 15px;
                margin-bottom: 20px;
            }

            .theme-option {
                background: var(--theme-secondary-bg);
                border: 2px solid transparent;
                border-radius: 12px;
                padding: 15px;
                cursor: pointer;
                transition: all 0.3s ease;
                text-align: center;
                position: relative;
                overflow: hidden;
            }

            .theme-option:active {
                transform: scale(0.98);
            }

            .theme-option.selected {
                border-color: var(--theme-accent-color);
                box-shadow: 0 0 20px rgba(255, 215, 0, 0.3);
            }

            .theme-option.current {
                border-color: var(--theme-primary-color);
            }

            .theme-preview {
                width: 100%;
                height: 60px;
                border-radius: 8px;
                margin-bottom: 10px;
                position: relative;
                overflow: hidden;
            }

            .theme-colors {
                display: flex;
                height: 100%;
            }

            .theme-color {
                flex: 1;
                height: 100%;
            }

            .theme-name {
                color: var(--theme-text-primary);
                font-size: 0.9rem;
                font-weight: 600;
                margin-bottom: 5px;
            }

            .theme-description {
                color: var(--theme-text-muted);
                font-size: 0.75rem;
                line-height: 1.3;
            }

            .theme-preview-actions {
                display: flex;
                gap: 10px;
                margin-top: 20px;
            }

            .btn-theme-action {
                flex: 1;
                padding: 12px;
                border: none;
                border-radius: 8px;
                font-size: 1rem;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.3s ease;
            }

            .btn-preview-cancel {
                background: var(--theme-secondary-bg);
                color: var(--theme-text-primary);
            }

            .btn-preview-apply {
                background: var(--theme-accent-color);
                color: #000;
            }

            .btn-theme-action:active {
                transform: scale(0.98);
            }

            .theme-selector-trigger {
                position: fixed;
                top: 20px;
                right: 20px;
                width: 48px;
                height: 48px;
                border: none;
                border-radius: 50%;
                background: var(--theme-secondary-bg);
                color: var(--theme-text-primary);
                cursor: pointer;
                transition: all 0.3s ease;
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 1000;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
                backdrop-filter: blur(10px);
            }

            .theme-selector-trigger:active {
                transform: scale(0.95);
            }

            .theme-selector-trigger i {
                font-size: 1.2rem;
            }
        `;
        document.head.appendChild(style);
    }

    /**
     * 绑定事件
     */
    bindEvents() {
        // 关闭按钮
        document.addEventListener('click', (e) => {
            if (e.target.closest('.close-theme-selector')) {
                this.hide();
            }
        });

        // 点击遮罩关闭
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('theme-selector-overlay')) {
                this.hide();
            }
        });

        // 主题选项点击
        document.addEventListener('click', (e) => {
            const themeOption = e.target.closest('.theme-option');
            if (themeOption) {
                this.selectTheme(themeOption.dataset.theme);
            }
        });

        // 预览动作按钮
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('btn-preview-cancel')) {
                this.cancelPreview();
            } else if (e.target.classList.contains('btn-preview-apply')) {
                this.applyPreview();
            }
        });

        // ESC键关闭
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isVisible) {
                this.hide();
            }
        });
    }

    /**
     * 更新主题列表
     */
    updateThemeList() {
        if (!window.themeManager || !window.themeManager.isReady()) {
            return;
        }

        const themes = window.themeManager.getAvailableThemes();
        const themeGrid = document.getElementById('theme-grid');
        
        if (!themeGrid) return;

        themeGrid.innerHTML = '';

        Object.entries(themes).forEach(([themeKey, theme]) => {
            const themeOption = this.createThemeOption(themeKey, theme);
            themeGrid.appendChild(themeOption);
        });
    }

    /**
     * 创建主题选项元素
     * @param {string} themeKey - 主题键
     * @param {Object} theme - 主题数据
     * @returns {HTMLElement} 主题选项元素
     */
    createThemeOption(themeKey, theme) {
        const option = document.createElement('div');
        option.className = 'theme-option';
        option.dataset.theme = themeKey;

        // 创建颜色预览
        const colors = theme.colors;
        const colorPreview = `
            <div class="theme-preview">
                <div class="theme-colors">
                    <div class="theme-color" style="background: ${colors.primaryColor}"></div>
                    <div class="theme-color" style="background: ${colors.accentColor}"></div>
                    <div class="theme-color" style="background: ${colors.successColor}"></div>
                    <div class="theme-color" style="background: ${colors.warningColor}"></div>
                </div>
            </div>
        `;

        option.innerHTML = `
            ${colorPreview}
            <div class="theme-name">${theme.name}</div>
            <div class="theme-description">${theme.description}</div>
        `;

        return option;
    }

    /**
     * 更新当前主题标识
     */
    updateCurrentTheme() {
        if (!window.themeManager) return;

        const currentTheme = window.themeManager.getCurrentTheme();
        const themeOptions = document.querySelectorAll('.theme-option');
        
        themeOptions.forEach(option => {
            option.classList.remove('current');
            if (option.dataset.theme === currentTheme) {
                option.classList.add('current');
            }
        });
    }

    /**
     * 选择主题（预览）
     * @param {string} themeKey - 主题键
     */
    selectTheme(themeKey) {
        // 更新选中状态
        const themeOptions = document.querySelectorAll('.theme-option');
        themeOptions.forEach(option => {
            option.classList.remove('selected');
            if (option.dataset.theme === themeKey) {
                option.classList.add('selected');
            }
        });

        // 预览主题
        if (window.themeManager) {
            window.themeManager.previewTheme(themeKey);
            this.currentPreview = themeKey;
        }
    }

    /**
     * 取消预览
     */
    cancelPreview() {
        if (window.themeManager && this.currentPreview) {
            window.themeManager.endPreview();
            this.currentPreview = null;
        }
        this.hide();
    }

    /**
     * 应用预览的主题
     */
    applyPreview() {
        if (window.themeManager && this.currentPreview) {
            window.themeManager.applyTheme(this.currentPreview);
            this.currentPreview = null;
            this.updateCurrentTheme();
        }
        this.hide();
    }

    /**
     * 显示主题选择器
     */
    show() {
        const overlay = document.getElementById('theme-selector-overlay');
        if (overlay) {
            this.updateThemeList();
            this.updateCurrentTheme();
            overlay.classList.add('show');
            this.isVisible = true;
            
            // 防止背景滚动
            document.body.style.overflow = 'hidden';
        }
    }

    /**
     * 隐藏主题选择器
     */
    hide() {
        const overlay = document.getElementById('theme-selector-overlay');
        if (overlay) {
            overlay.classList.remove('show');
            this.isVisible = false;
            
            // 恢复背景滚动
            document.body.style.overflow = '';
            
            // 如果有预览，取消预览
            if (this.currentPreview) {
                this.cancelPreview();
            }
        }
    }

    /**
     * 切换显示/隐藏
     */
    toggle() {
        if (this.isVisible) {
            this.hide();
        } else {
            this.show();
        }
    }

    /**
     * 创建主题选择器触发按钮（已废弃，现在使用菜单按钮）
     */
    createTriggerButton() {
        // 不再创建浮动按钮，主题选择功能已移至侧边菜单
        console.log('主题选择器已集成到侧边菜单中');
        return null;
    }

    /**
     * 根据案件推荐主题
     * @param {string} caseCategory - 案件类型
     */
    recommendThemeForCase(caseCategory) {
        if (!window.themeManager) return;
        
        const recommendedTheme = window.themeManager.getRecommendedTheme(caseCategory);
        if (recommendedTheme && recommendedTheme !== window.themeManager.getCurrentTheme()) {
            this.showThemeRecommendation(recommendedTheme, caseCategory);
        }
    }

    /**
     * 显示主题推荐提示
     * @param {string} themeKey - 推荐的主题
     * @param {string} caseCategory - 案件类型
     */
    showThemeRecommendation(themeKey, caseCategory) {
        const themes = window.themeManager.getAvailableThemes();
        const theme = themes[themeKey];
        
        if (!theme) return;

        const notification = document.createElement('div');
        notification.className = 'theme-recommendation';
        notification.innerHTML = `
            <div class="theme-recommendation-content">
                <i class="fas fa-lightbulb"></i>
                <div class="theme-recommendation-text">
                    <strong>主题推荐</strong>
                    <p>为${caseCategory}案件推荐使用「${theme.name}」主题</p>
                </div>
                <div class="theme-recommendation-actions">
                    <button class="btn-recommendation-apply" data-theme="${themeKey}">应用</button>
                    <button class="btn-recommendation-dismiss">忽略</button>
                </div>
            </div>
        `;

        // 添加样式
        const style = document.createElement('style');
        style.textContent = `
            .theme-recommendation {
                position: fixed;
                top: 80px;
                left: 20px;
                right: 20px;
                background: var(--theme-secondary-bg);
                border-radius: 12px;
                padding: 15px;
                z-index: 9999;
                backdrop-filter: blur(10px);
                border: 1px solid rgba(255, 255, 255, 0.2);
                animation: slideInDown 0.3s ease;
            }

            .theme-recommendation-content {
                display: flex;
                align-items: center;
                gap: 12px;
            }

            .theme-recommendation i {
                color: var(--theme-accent-color);
                font-size: 1.5rem;
            }

            .theme-recommendation-text {
                flex: 1;
            }

            .theme-recommendation-text strong {
                color: var(--theme-text-primary);
                font-size: 0.9rem;
            }

            .theme-recommendation-text p {
                color: var(--theme-text-muted);
                font-size: 0.8rem;
                margin: 2px 0 0 0;
            }

            .theme-recommendation-actions {
                display: flex;
                gap: 8px;
            }

            .theme-recommendation-actions button {
                padding: 6px 12px;
                border: none;
                border-radius: 6px;
                font-size: 0.8rem;
                cursor: pointer;
                transition: all 0.3s ease;
            }

            .btn-recommendation-apply {
                background: var(--theme-accent-color);
                color: #000;
            }

            .btn-recommendation-dismiss {
                background: transparent;
                color: var(--theme-text-muted);
                border: 1px solid rgba(255, 255, 255, 0.3);
            }

            @keyframes slideInDown {
                from {
                    opacity: 0;
                    transform: translateY(-20px);
                }
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }
        `;
        document.head.appendChild(style);

        // 绑定事件
        notification.addEventListener('click', (e) => {
            if (e.target.classList.contains('btn-recommendation-apply')) {
                window.themeManager.applyTheme(e.target.dataset.theme);
                notification.remove();
            } else if (e.target.classList.contains('btn-recommendation-dismiss')) {
                notification.remove();
            }
        });

        document.body.appendChild(notification);

        // 5秒后自动消失
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 5000);
    }
}

// 创建全局主题选择器实例
window.themeSelector = new ThemeSelector();

// 导出供其他模块使用
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ThemeSelector;
}