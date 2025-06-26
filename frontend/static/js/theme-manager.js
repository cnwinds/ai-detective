/**
 * AI侦探游戏主题管理器
 * 负责主题的加载、切换、持久化和动态应用
 */
class ThemeManager {
    constructor() {
        this.themes = {};
        this.currentTheme = 'classic';
        this.isLoaded = false;
        this.themeChangeCallbacks = [];
        
        // 初始化
        this.init();
    }

    /**
     * 初始化主题管理器
     */
    async init() {
        try {
            await this.loadThemes();
            await this.loadUserPreference();
            this.applyTheme(this.currentTheme);
            this.isLoaded = true;
            console.log('主题管理器初始化完成');
        } catch (error) {
            console.error('主题管理器初始化失败:', error);
            // 使用默认主题
            this.applyDefaultTheme();
        }
    }

    /**
     * 加载主题配置文件
     */
    async loadThemes() {
        try {
            const response = await fetch('/static/themes.json');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            this.themes = data.themes;
            this.caseThemeMapping = data.caseThemeMapping;
        } catch (error) {
            console.error('加载主题配置失败:', error);
            throw error;
        }
    }

    /**
     * 加载用户主题偏好
     */
    async loadUserPreference() {
        try {
            const savedTheme = localStorage.getItem('detective-theme');
            if (savedTheme && this.themes[savedTheme]) {
                this.currentTheme = savedTheme;
            }
        } catch (error) {
            console.warn('加载用户主题偏好失败:', error);
        }
    }

    /**
     * 应用主题（重构后的核心方法）
     * @param {string} themeName - 主题名称
     */
    applyTheme(themeName) {
        if (!this.themes[themeName]) {
            console.warn(`主题 ${themeName} 不存在，使用默认主题`);
            themeName = 'classic';
        }

        const theme = this.themes[themeName];
        const root = document.documentElement;

        // 1. 应用核心颜色
        this.applyCoreColors(theme, root);
        
        // 2. 计算并应用所有衍生颜色
        this.applyDerivedColors(theme, root);

        // 3. 更新当前主题状态
        this.currentTheme = themeName;
        this.saveUserPreference(themeName);

        // 4. 触发主题变更回调
        this.triggerThemeChangeCallbacks(themeName, theme);

        // 5. 添加主题类名到body
        document.body.className = document.body.className.replace(/theme-\w+/g, '');
        document.body.classList.add(`theme-${themeName}`);

        console.log(`已应用主题: ${theme.name}`);
    }

    /**
     * 应用核心颜色
     * @param {Object} theme - 主题对象
     * @param {Element} root - 根元素
     */
    applyCoreColors(theme, root) {
        // 直接映射主题配置到CSS变量
        Object.entries(theme.colors).forEach(([key, value]) => {
            if (key !== 'characters') {
                const cssVarName = this.convertToCSSVariable(key);
                root.style.setProperty(cssVarName, value);
            }
        });
        
        // 处理角色颜色
        if (theme.colors.characters) {
            Object.entries(theme.colors.characters).forEach(([type, color]) => {
                root.style.setProperty(`--theme-character-${type}-color`, color);
            });
        }
    }

    /**
     * 计算并应用衍生颜色
     * @param {Object} theme - 主题对象
     * @param {Element} root - 根元素
     */
    applyDerivedColors(theme, root) {
        // 基于核心颜色计算衍生颜色
        this.calculateBorderColors(theme, root);
        this.calculateInteractionColors(theme, root);
        this.calculateStateBackgrounds(theme, root);
        this.calculateCharacterVariants(theme, root);
        this.calculateSpecialSceneColors(theme, root);
        this.calculateAdditionalTextColors(theme, root);
    }

    /**
     * 计算边框和阴影颜色
     * @param {Object} theme - 主题对象
     * @param {Element} root - 根元素
     */
    calculateBorderColors(theme, root) {
        const primaryRgb = this.parseColor(theme.colors.primaryColor);
        if (primaryRgb) {
            root.style.setProperty('--theme-border-color', 
                `rgba(${primaryRgb.r}, ${primaryRgb.g}, ${primaryRgb.b}, 0.2)`);
            root.style.setProperty('--theme-border-hover', 
                `rgba(${primaryRgb.r}, ${primaryRgb.g}, ${primaryRgb.b}, 0.4)`);
        }

        // 设置阴影颜色
        root.style.setProperty('--theme-shadow-color', 'rgba(0, 0, 0, 0.1)');
        root.style.setProperty('--theme-shadow-light', 'rgba(0, 0, 0, 0.06)');
        root.style.setProperty('--theme-shadow-heavy', 'rgba(0, 0, 0, 0.2)');
    }

    /**
     * 计算交互状态颜色
     * @param {Object} theme - 主题对象
     * @param {Element} root - 根元素
     */
    calculateInteractionColors(theme, root) {
        const primaryRgb = this.parseColor(theme.colors.primaryColor);
        if (primaryRgb) {
            root.style.setProperty('--theme-hover-bg', 
                `rgba(${primaryRgb.r}, ${primaryRgb.g}, ${primaryRgb.b}, 0.1)`);
            root.style.setProperty('--theme-active-bg', 
                `rgba(${primaryRgb.r}, ${primaryRgb.g}, ${primaryRgb.b}, 0.15)`);
            root.style.setProperty('--theme-focus-ring', 
                `rgba(${primaryRgb.r}, ${primaryRgb.g}, ${primaryRgb.b}, 0.3)`);
        }
    }

    /**
     * 计算状态背景颜色
     * @param {Object} theme - 主题对象
     * @param {Element} root - 根元素
     */
    calculateStateBackgrounds(theme, root) {
        // 成功状态背景
        const successRgb = this.parseColor(theme.colors.successColor);
        if (successRgb) {
            root.style.setProperty('--theme-success-bg', 
                `rgba(${successRgb.r}, ${successRgb.g}, ${successRgb.b}, 0.1)`);
        }

        // 警告状态背景
        const warningRgb = this.parseColor(theme.colors.warningColor);
        if (warningRgb) {
            root.style.setProperty('--theme-warning-bg', 
                `rgba(${warningRgb.r}, ${warningRgb.g}, ${warningRgb.b}, 0.1)`);
        }

        // 信息状态背景（如果主题中定义了infoColor，否则使用主色调）
        if (theme.colors.infoColor) {
            const infoRgb = this.parseColor(theme.colors.infoColor);
            if (infoRgb) {
                root.style.setProperty('--theme-info-color', theme.colors.infoColor);
                root.style.setProperty('--theme-info-bg', 
                    `rgba(${infoRgb.r}, ${infoRgb.g}, ${infoRgb.b}, 0.1)`);
            }
        } else {
            // 如果没有定义信息色，使用主色调
            const primaryRgb = this.parseColor(theme.colors.primaryColor);
            if (primaryRgb) {
                root.style.setProperty('--theme-info-color', theme.colors.primaryColor);
                root.style.setProperty('--theme-info-bg', 
                    `rgba(${primaryRgb.r}, ${primaryRgb.g}, ${primaryRgb.b}, 0.1)`);
            }
        }

        // 错误状态背景（如果主题中定义了errorColor，否则使用红色）
        if (theme.colors.errorColor) {
            const errorRgb = this.parseColor(theme.colors.errorColor);
            if (errorRgb) {
                root.style.setProperty('--theme-error-color', theme.colors.errorColor);
                root.style.setProperty('--theme-error-bg', 
                    `rgba(${errorRgb.r}, ${errorRgb.g}, ${errorRgb.b}, 0.1)`);
            }
        } else {
            // 如果没有定义错误色，使用标准红色
            root.style.setProperty('--theme-error-color', '#dc3545');
            root.style.setProperty('--theme-error-bg', 'rgba(220, 53, 69, 0.1)');
        }
        
        // 活跃状态背景色 - 比hover更深一层
        const primaryRgb = this.parseColor(theme.colors.primaryColor);
        if (primaryRgb) {
            root.style.setProperty('--theme-active-bg', 
                `rgba(${primaryRgb.r}, ${primaryRgb.g}, ${primaryRgb.b}, 0.15)`);
        }
    }

    /**
     * 计算角色类型的变体颜色
     * @param {Object} theme - 主题对象
     * @param {Element} root - 根元素
     */
    calculateCharacterVariants(theme, root) {
        if (!theme.colors.characters) return;
        
        Object.entries(theme.colors.characters).forEach(([type, color]) => {
            const rgb = this.parseColor(color);
            if (rgb) {
                root.style.setProperty(`--theme-character-${type}-bg`, 
                    `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.15)`);
                root.style.setProperty(`--theme-character-${type}-border`, 
                    `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.5)`);
            }
        });
    }

    /**
     * 计算专用场景颜色（案件加载、标签、模态框等）
     * @param {Object} theme - 主题对象
     * @param {Element} root - 根元素
     */
    calculateSpecialSceneColors(theme, root) {
        // 案件加载颜色
        const accentRgb = this.parseColor(theme.colors.accentColor);
        if (accentRgb) {
            root.style.setProperty('--theme-case-loading-accent-bg', 
                `rgba(${accentRgb.r}, ${accentRgb.g}, ${accentRgb.b}, 0.1)`);
            root.style.setProperty('--theme-case-loading-accent-shadow', 
                `rgba(${accentRgb.r}, ${accentRgb.g}, ${accentRgb.b}, 0.2)`);
            root.style.setProperty('--theme-case-loading-accent-glow', 
                `rgba(${accentRgb.r}, ${accentRgb.g}, ${accentRgb.b}, 0.3)`);
        }

        // 案件加载成功状态
        const successRgb = this.parseColor(theme.colors.successColor);
        if (successRgb) {
            root.style.setProperty('--theme-case-loading-success-bg', 
                `rgba(${successRgb.r}, ${successRgb.g}, ${successRgb.b}, 0.1)`);
        }
        
        // 标签颜色
        const isDarkTheme = this.isDarkBackground(theme.colors.primaryBg);
        root.style.setProperty('--theme-badge-text-light', 
            isDarkTheme ? 'rgba(255, 255, 255, 0.9)' : 'rgba(0, 0, 0, 0.8)');
        root.style.setProperty('--theme-badge-text-dark', 
            theme.colors.textPrimary);
        
        // 标签透明度常量
        root.style.setProperty('--theme-badge-bg-alpha', '0.15');
        root.style.setProperty('--theme-badge-shadow-alpha', '0.3');

        // 标签衍生颜色
        if (accentRgb) {
            root.style.setProperty('--theme-badge-accent-bg', 
                `rgba(${accentRgb.r}, ${accentRgb.g}, ${accentRgb.b}, var(--theme-badge-bg-alpha))`);
            root.style.setProperty('--theme-badge-accent-shadow', 
                `rgba(${accentRgb.r}, ${accentRgb.g}, ${accentRgb.b}, var(--theme-badge-shadow-alpha))`);
        }

        if (successRgb) {
            root.style.setProperty('--theme-badge-success-bg', 
                `rgba(${successRgb.r}, ${successRgb.g}, ${successRgb.b}, var(--theme-badge-bg-alpha))`);
        }

        const warningRgb = this.parseColor(theme.colors.warningColor);
        if (warningRgb) {
            root.style.setProperty('--theme-badge-warning-bg', 
                `rgba(${warningRgb.r}, ${warningRgb.g}, ${warningRgb.b}, var(--theme-badge-bg-alpha))`);
        }
        
        // 模态框专用颜色 - 增强对比度和可见性
        this.calculateModalColors(theme, root);
    }

    /**
     * 计算模态框专用颜色
     * @param {Object} theme - 主题对象
     * @param {Element} root - 根元素
     */
    calculateModalColors(theme, root) {
        const isDark = this.isDarkBackground(theme.colors.primaryBg);
        
        // 模态框背景 - 使用高对比度的纯色背景
        if (isDark) {
            // 深色主题：使用明显更亮的背景，确保与主体背景有强烈对比
            root.style.setProperty('--theme-modal-bg', '#1a1d29');
            root.style.setProperty('--theme-modal-border', 'rgba(100, 181, 246, 0.6)');
            root.style.setProperty('--theme-modal-border-inner', 'rgba(255, 255, 255, 0.25)');
        } else {
            // 浅色主题：使用纯白背景
            root.style.setProperty('--theme-modal-bg', '#ffffff');
            root.style.setProperty('--theme-modal-border', 'rgba(59, 130, 246, 0.6)');
            root.style.setProperty('--theme-modal-border-inner', 'rgba(0, 0, 0, 0.25)');
        }
        
        // 模态框阴影 - 更强的阴影效果，增加层次感
        root.style.setProperty('--theme-modal-shadow', 
            isDark ? 'rgba(0, 0, 0, 0.9)' : 'rgba(0, 0, 0, 0.4)');
        
        // 模态框遮罩层 - 更强的背景遮罩，确保内容突出
        root.style.setProperty('--theme-modal-overlay', 
            isDark ? 'rgba(0, 0, 0, 0.9)' : 'rgba(0, 0, 0, 0.8)');
        
        // 模态框专用文本颜色 - 确保在modal背景下有足够对比度
        if (isDark) {
            root.style.setProperty('--theme-modal-text-primary', '#ffffff');
            root.style.setProperty('--theme-modal-text-secondary', 'rgba(255, 255, 255, 0.85)');
        } else {
            root.style.setProperty('--theme-modal-text-primary', '#1a202c');
            root.style.setProperty('--theme-modal-text-secondary', 'rgba(26, 32, 44, 0.8)');
        }
    }

    /**
     * 计算额外的文本颜色
     * @param {Object} theme - 主题对象
     * @param {Element} root - 根元素
     */
    calculateAdditionalTextColors(theme, root) {
        // 计算静音文本颜色（比secondary更淡）
        const textSecondaryRgb = this.parseColor(theme.colors.textSecondary);
        if (textSecondaryRgb) {
            root.style.setProperty('--theme-text-muted', 
                `rgba(${textSecondaryRgb.r}, ${textSecondaryRgb.g}, ${textSecondaryRgb.b}, 0.6)`);
        } else {
            // 如果没有textSecondary，基于textPrimary计算
            const textPrimaryRgb = this.parseColor(theme.colors.textPrimary);
            if (textPrimaryRgb) {
                root.style.setProperty('--theme-text-muted', 
                    `rgba(${textPrimaryRgb.r}, ${textPrimaryRgb.g}, ${textPrimaryRgb.b}, 0.4)`);
            }
        }
    }

    /**
     * 解析颜色字符串为RGB对象
     * @param {string} color - 颜色字符串
     * @returns {Object|null} RGB对象 {r, g, b}
     */
    parseColor(color) {
        if (!color) return null;

        // 处理十六进制颜色
        if (color.startsWith('#')) {
            const hex = color.slice(1);
            if (hex.length === 3) {
                // 短格式 #RGB -> #RRGGBB
                const r = parseInt(hex.charAt(0) + hex.charAt(0), 16);
                const g = parseInt(hex.charAt(1) + hex.charAt(1), 16);
                const b = parseInt(hex.charAt(2) + hex.charAt(2), 16);
                return { r, g, b };
            } else if (hex.length === 6) {
                const r = parseInt(hex.substr(0, 2), 16);
                const g = parseInt(hex.substr(2, 2), 16);
                const b = parseInt(hex.substr(4, 2), 16);
                return { r, g, b };
            }
        }

        // 处理RGB/RGBA格式
        if (color.startsWith('rgb')) {
            const matches = color.match(/\d+/g);
            if (matches && matches.length >= 3) {
                return {
                    r: parseInt(matches[0]),
                    g: parseInt(matches[1]),
                    b: parseInt(matches[2])
                };
            }
        }

        return null;
    }

    /**
     * 判断背景是否为深色
     * @param {string} background - 背景色
     * @returns {boolean} 是否为深色
     */
    isDarkBackground(background) {
        // 简单判断：如果包含渐变或者是深色系，认为是深色背景
        if (background.includes('gradient')) {
            // 对于渐变，检查主要颜色的亮度
            return true; // 当前所有主题都是深色背景
        }

        const rgb = this.parseColor(background);
        if (rgb) {
            // 计算亮度 (0.299*R + 0.587*G + 0.114*B)
            const brightness = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b);
            return brightness < 128;
        }

        return true; // 默认认为是深色
    }

    /**
     * 将驼峰命名转换为CSS变量名
     * @param {string} key - 驼峰命名的键
     * @returns {string} CSS变量名
     */
    convertToCSSVariable(key) {
        // 将驼峰命名转换为短横线命名，并添加--theme-前缀
        return `--theme-${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`;
    }

    /**
     * 保存用户主题偏好
     * @param {string} themeName - 主题名称
     */
    saveUserPreference(themeName) {
        try {
            localStorage.setItem('detective-theme', themeName);
        } catch (error) {
            console.warn('保存主题偏好失败:', error);
        }
    }

    /**
     * 根据案件类型获取推荐主题
     * @param {string} caseCategory - 案件类型
     * @returns {string} 推荐的主题名称
     */
    getRecommendedTheme(caseCategory) {
        if (this.caseThemeMapping && this.caseThemeMapping[caseCategory]) {
            return this.caseThemeMapping[caseCategory];
        }
        return 'classic';
    }

    /**
     * 获取所有可用主题
     * @returns {Object} 主题对象
     */
    getAvailableThemes() {
        return this.themes;
    }

    /**
     * 获取当前主题
     * @returns {string} 当前主题名称
     */
    getCurrentTheme() {
        return this.currentTheme;
    }

    /**
     * 获取当前主题信息
     * @returns {Object} 当前主题对象
     */
    getCurrentThemeInfo() {
        return this.themes[this.currentTheme];
    }

    /**
     * 应用默认主题（当加载失败时使用）
     */
    applyDefaultTheme() {
        const root = document.documentElement;
        
        // 设置默认颜色
        const defaultColors = {
            '--theme-primary-bg': 'linear-gradient(135deg, #2d3748 0%, #1a202c 50%, #0f0f1a 100%)',
            '--theme-secondary-bg': 'rgba(255, 255, 255, 0.1)',
            '--theme-primary-color': '#64b5f6',
            '--theme-accent-color': '#FFD700',
            '--theme-success-color': '#4CAF50',
            '--theme-warning-color': '#f44336',
            '--theme-text-primary': '#ffffff',
            '--theme-text-secondary': 'rgba(255, 255, 255, 0.9)',
            '--theme-text-muted': 'rgba(255, 255, 255, 0.7)',
            '--theme-border-color': 'rgba(100, 181, 246, 0.2)',
            '--theme-shadow-color': 'rgba(0, 0, 0, 0.1)',
            '--theme-shadow-light': 'rgba(0, 0, 0, 0.06)',
            '--theme-hover-bg': 'rgba(100, 181, 246, 0.1)',
            '--theme-case-loading-accent-bg': 'rgba(255, 215, 0, 0.1)',
            '--theme-case-loading-accent-shadow': 'rgba(255, 215, 0, 0.2)',
            '--theme-case-loading-accent-glow': 'rgba(255, 215, 0, 0.3)',
            '--theme-case-loading-success-bg': 'rgba(76, 175, 80, 0.1)',
            '--theme-badge-text-light': 'rgba(255, 255, 255, 0.9)',
            '--theme-badge-text-dark': '#ffffff'
        };

        Object.entries(defaultColors).forEach(([key, value]) => {
            root.style.setProperty(key, value);
        });

        console.log('已应用默认主题');
    }

    /**
     * 添加主题变更回调
     * @param {Function} callback - 回调函数
     */
    onThemeChange(callback) {
        if (typeof callback === 'function') {
            this.themeChangeCallbacks.push(callback);
        }
    }

    /**
     * 触发主题变更回调
     * @param {string} themeName - 主题名称
     * @param {Object} themeData - 主题数据
     */
    triggerThemeChangeCallbacks(themeName, themeData) {
        this.themeChangeCallbacks.forEach(callback => {
            try {
                callback(themeName, themeData);
            } catch (error) {
                console.error('主题变更回调执行失败:', error);
            }
        });
    }

    /**
     * 预览主题（临时应用，不保存偏好）
     * @param {string} themeName - 主题名称
     */
    previewTheme(themeName) {
        if (!this.themes[themeName]) {
            console.warn(`主题 ${themeName} 不存在`);
            return;
        }

        const theme = this.themes[themeName];
        const root = document.documentElement;

        // 临时应用颜色
        this.applyCoreColors(theme, root);
        this.applyDerivedColors(theme, root);

        // 添加预览类名
        document.body.classList.add('theme-preview');
    }

    /**
     * 结束主题预览，恢复当前主题
     */
    endPreview() {
        document.body.classList.remove('theme-preview');
        this.applyTheme(this.currentTheme);
    }

    /**
     * 切换到下一个主题（用于快速切换）
     */
    switchToNextTheme() {
        const themeNames = Object.keys(this.themes);
        const currentIndex = themeNames.indexOf(this.currentTheme);
        const nextIndex = (currentIndex + 1) % themeNames.length;
        const nextTheme = themeNames[nextIndex];
        
        this.applyTheme(nextTheme);
        return nextTheme;
    }

    /**
     * 检查主题管理器是否已加载完成
     * @returns {boolean} 是否已加载
     */
    isReady() {
        return this.isLoaded;
    }

    /**
     * 等待主题管理器加载完成
     * @returns {Promise} Promise对象
     */
    waitForReady() {
        return new Promise((resolve) => {
            if (this.isLoaded) {
                resolve();
                return;
            }

            const checkReady = () => {
                if (this.isLoaded) {
                    resolve();
                } else {
                    setTimeout(checkReady, 100);
                }
            };
            checkReady();
        });
    }
}

// 创建全局主题管理器实例
window.themeManager = new ThemeManager();

// 导出供其他模块使用
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ThemeManager;
}