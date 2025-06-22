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
     * 应用主题
     * @param {string} themeName - 主题名称
     */
    applyTheme(themeName) {
        if (!this.themes[themeName]) {
            console.warn(`主题 ${themeName} 不存在，使用默认主题`);
            themeName = 'classic';
        }

        const theme = this.themes[themeName];
        const root = document.documentElement;

        // 应用CSS变量
        Object.entries(theme.colors).forEach(([key, value]) => {
            const cssVarName = this.convertToCSSVariable(key);
            root.style.setProperty(cssVarName, value);
        });

        // 更新角色类型颜色
        this.updateCharacterColors(themeName);

        // 更新当前主题
        this.currentTheme = themeName;
        
        // 保存用户偏好
        this.saveUserPreference(themeName);

        // 触发主题变更回调
        this.triggerThemeChangeCallbacks(themeName, theme);

        // 添加主题类名到body
        document.body.className = document.body.className.replace(/theme-\w+/g, '');
        document.body.classList.add(`theme-${themeName}`);

        console.log(`已应用主题: ${theme.name}`);
    }

    /**
     * 更新角色类型颜色
     * @param {string} themeName - 主题名称
     */
    updateCharacterColors(themeName) {
        const theme = this.themes[themeName];
        if (!theme || !theme.colors || !theme.colors.characters) {
            return;
        }

        const root = document.documentElement;
        const characterColors = theme.colors.characters;
        
        Object.entries(characterColors).forEach(([type, color]) => {
            root.style.setProperty(`--theme-${type}-color`, color);
        });
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
            '--theme-text-muted': 'rgba(255, 255, 255, 0.7)'
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

        // 临时应用CSS变量
        Object.entries(theme.colors).forEach(([key, value]) => {
            const cssVarName = this.convertToCSSVariable(key);
            root.style.setProperty(cssVarName, value);
        });

        // 更新角色类型颜色
        this.updateCharacterColors(themeName);

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