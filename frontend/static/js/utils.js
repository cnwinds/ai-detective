/**
 * 通用工具类 - 减少重复代码，遵循DRY原则
 */

// DOM操作工具类
class DOMHelper {
    /**
     * 简化的DOM选择器
     * @param {string} selector - CSS选择器或ID
     * @returns {Element|null}
     */
    static $(selector) {
        if (typeof selector !== 'string') return null;
        
        // 如果是简单的ID选择器（只有#和ID名），使用getElementById
        // 否则使用querySelector处理复杂选择器
        if (selector.startsWith('#') && !selector.includes(' ') && !selector.includes('.', 1) && !selector.includes('[') && !selector.includes(':')) {
            return document.getElementById(selector.slice(1));
        }
        
        return document.querySelector(selector);
    }
    
    /**
     * 选择多个元素
     * @param {string} selector - CSS选择器
     * @returns {NodeList}
     */
    static $$(selector) {
        return document.querySelectorAll(selector);
    }
    
    /**
     * 安全的事件绑定
     * @param {string|Element} element - 元素ID或元素对象
     * @param {string} event - 事件类型
     * @param {Function} handler - 事件处理函数
     * @param {Object} options - 事件选项
     */
    static bindEvent(element, event, handler, options = {}) {
        const el = typeof element === 'string' ? this.$(element) : element;
        if (el && typeof handler === 'function') {
            el.addEventListener(event, handler, options);
        } else {
            console.warn(`无法绑定事件: 元素 ${element} 不存在或处理函数无效`);
        }
    }
    
    /**
     * 批量绑定事件
     * @param {Array} bindings - 事件绑定配置数组 [[element, event, handler], ...]
     */
    static bindEvents(bindings) {
        bindings.forEach(([element, event, handler, options]) => {
            this.bindEvent(element, event, handler, options);
        });
    }
    
    /**
     * 显示元素
     * @param {string|Element} element - 元素ID或元素对象
     * @param {string} displayType - 显示类型，默认为'block'
     */
    static show(element, displayType = 'block') {
        const el = typeof element === 'string' ? this.$(element) : element;
        if (el) {
            el.style.display = displayType;
        }
    }
    
    /**
     * 隐藏元素
     * @param {string|Element} element - 元素ID或元素对象
     */
    static hide(element) {
        const el = typeof element === 'string' ? this.$(element) : element;
        if (el) {
            el.style.display = 'none';
        }
    }
    
    /**
     * 切换元素显示/隐藏
     * @param {string|Element} element - 元素ID或元素对象
     * @param {boolean} show - 是否显示
     * @param {string} displayType - 显示类型，默认为'block'
     */
    static toggle(element, show, displayType = 'block') {
        const el = typeof element === 'string' ? this.$(element) : element;
        if (el) {
            el.style.display = show ? displayType : 'none';
        }
    }
    
    /**
     * 检查元素是否包含指定CSS类
     * @param {string|Element} element - 元素ID或元素对象
     * @param {string} className - CSS类名
     * @returns {boolean}
     */
    static hasClass(element, className) {
        const el = typeof element === 'string' ? this.$(element) : element;
        return el ? el.classList.contains(className) : false;
    }
    
    /**
     * 添加/移除CSS类
     * @param {string|Element} element - 元素ID或元素对象
     * @param {string} className - CSS类名
     * @param {boolean} add - 是否添加类
     */
    static toggleClass(element, className, add) {
        const el = typeof element === 'string' ? this.$(element) : element;
        if (el) {
            if (add) {
                el.classList.add(className);
            } else {
                el.classList.remove(className);
            }
        }
    }
    
    /**
     * 设置元素文本内容
     * @param {string|Element} element - 元素ID或元素对象
     * @param {string} text - 文本内容
     */
    static setText(element, text) {
        const el = typeof element === 'string' ? this.$(element) : element;
        if (el) {
            el.textContent = text;
        }
    }
    
    /**
     * 设置元素HTML内容
     * @param {string|Element} element - 元素ID或元素对象
     * @param {string} html - HTML内容
     */
    static setHTML(element, html) {
        const el = typeof element === 'string' ? this.$(element) : element;
        if (el) {
            el.innerHTML = html;
        }
    }
    
    /**
     * 追加HTML内容到元素
     * @param {string|Element} element - 元素ID或元素对象
     * @param {string} html - 要追加的HTML内容
     */
    static appendHTML(element, html) {
        const el = typeof element === 'string' ? this.$(element) : element;
        if (el) {
            el.innerHTML += html;
        }
    }
    
    /**
     * 创建元素
     * @param {string} tag - 标签名
     * @param {Object} attributes - 属性对象
     * @param {string} content - 内容
     * @returns {Element}
     */
    static createElement(tag, attributes = {}, content = '') {
        const element = document.createElement(tag);
        
        Object.entries(attributes).forEach(([key, value]) => {
            if (key === 'className') {
                element.className = value;
            } else if (key === 'dataset') {
                Object.entries(value).forEach(([dataKey, dataValue]) => {
                    element.dataset[dataKey] = dataValue;
                });
            } else {
                element.setAttribute(key, value);
            }
        });
        
        if (content) {
            element.innerHTML = content;
        }
        
        return element;
    }
}

// API请求工具类
class APIHelper {
    /**
     * 通用的fetch请求封装
     * @param {string} url - 请求URL
     * @param {Object} options - 请求选项
     * @returns {Promise}
     */
    static async request(url, options = {}) {
        const defaultOptions = {
            headers: {
                'Content-Type': 'application/json',
            },
        };
        
        const mergedOptions = {
            ...defaultOptions,
            ...options,
            headers: {
                ...defaultOptions.headers,
                ...options.headers,
            },
        };
        
        try {
            const response = await fetch(url, mergedOptions);
            
            if (!response.ok) {
                throw new Error(`HTTP错误: ${response.status} ${response.statusText}`);
            }
            
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                return await response.json();
            } else {
                return await response.text();
            }
        } catch (error) {
            console.error('API请求失败:', error);
            throw error;
        }
    }
    
    /**
     * GET请求
     * @param {string} url - 请求URL
     * @param {Object} headers - 请求头
     * @returns {Promise}
     */
    static get(url, headers = {}) {
        return this.request(url, { method: 'GET', headers });
    }
    
    /**
     * POST请求
     * @param {string} url - 请求URL
     * @param {Object} data - 请求数据
     * @param {Object} headers - 请求头
     * @returns {Promise}
     */
    static post(url, data = {}, headers = {}) {
        return this.request(url, {
            method: 'POST',
            headers,
            body: JSON.stringify(data),
        });
    }
    
    /**
     * PUT请求
     * @param {string} url - 请求URL
     * @param {Object} data - 请求数据
     * @param {Object} headers - 请求头
     * @returns {Promise}
     */
    static put(url, data = {}, headers = {}) {
        return this.request(url, {
            method: 'PUT',
            headers,
            body: JSON.stringify(data),
        });
    }
    
    /**
     * DELETE请求
     * @param {string} url - 请求URL
     * @param {Object} headers - 请求头
     * @returns {Promise}
     */
    static delete(url, headers = {}) {
        return this.request(url, { method: 'DELETE', headers });
    }
    
    /**
     * 通用错误处理方法
     * @param {Error} error - 错误对象
     * @param {string} operation - 操作描述
     * @param {Function} showMessage - 显示消息的回调函数
     * @param {string} defaultMessage - 默认错误消息
     */
    static handleError(error, operation, showMessage, defaultMessage = '操作失败，请重试') {
        console.error(`${operation}失败:`, error);
        
        let message = defaultMessage;
        if (error.response && error.response.data && error.response.data.detail) {
            message = error.response.data.detail;
        } else if (error.message) {
            message = error.message;
        }
        
        if (typeof showMessage === 'function') {
            showMessage(message, 'error');
        }
    }
}

/**
 * 加载状态管理类
 */
class LoadingManager {
    /**
     * 显示加载状态
     * @param {string|Element} element - 元素选择器或元素对象
     * @param {string} text - 加载文本
     */
    static show(element, text = '加载中...') {
        const el = typeof element === 'string' ? DOMHelper.$(element) : element;
        if (el) {
            el.disabled = true;
            const originalText = el.textContent;
            el.dataset.originalText = originalText;
            DOMHelper.setText(el, text);
        }
    }
    
    /**
     * 隐藏加载状态
     * @param {string|Element} element - 元素选择器或元素对象
     */
    static hide(element) {
        const el = typeof element === 'string' ? DOMHelper.$(element) : element;
        if (el) {
            el.disabled = false;
            const originalText = el.dataset.originalText;
            if (originalText) {
                DOMHelper.setText(el, originalText);
                delete el.dataset.originalText;
            }
        }
    }
    
    /**
     * 在异步操作期间显示加载状态
     * @param {string|Element} element - 元素选择器或元素对象
     * @param {Function} asyncOperation - 异步操作函数
     * @param {string} loadingText - 加载文本
     */
    static async withLoading(element, asyncOperation, loadingText = '加载中...') {
        this.show(element, loadingText);
        try {
            return await asyncOperation();
        } finally {
            this.hide(element);
        }
    }
}

// 本地存储工具类
class StorageHelper {
    /**
     * 设置本地存储
     * @param {string} key - 键名
     * @param {any} value - 值
     */
    static set(key, value) {
        try {
            const serializedValue = JSON.stringify(value);
            localStorage.setItem(key, serializedValue);
        } catch (error) {
            console.error('设置本地存储失败:', error);
        }
    }
    
    /**
     * 获取本地存储
     * @param {string} key - 键名
     * @param {any} defaultValue - 默认值
     * @returns {any}
     */
    static get(key, defaultValue = null) {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : defaultValue;
        } catch (error) {
            console.error('获取本地存储失败:', error);
            return defaultValue;
        }
    }
    
    /**
     * 删除本地存储
     * @param {string} key - 键名
     */
    static remove(key) {
        try {
            localStorage.removeItem(key);
        } catch (error) {
            console.error('删除本地存储失败:', error);
        }
    }
    
    /**
     * 清空本地存储
     */
    static clear() {
        try {
            localStorage.clear();
        } catch (error) {
            console.error('清空本地存储失败:', error);
        }
    }
}

// 通用工具函数
class Utils {
    /**
     * 防抖函数
     * @param {Function} func - 要防抖的函数
     * @param {number} delay - 延迟时间（毫秒）
     * @returns {Function}
     */
    static debounce(func, delay) {
        let timeoutId;
        return function (...args) {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => func.apply(this, args), delay);
        };
    }
    
    /**
     * 节流函数
     * @param {Function} func - 要节流的函数
     * @param {number} delay - 延迟时间（毫秒）
     * @returns {Function}
     */
    static throttle(func, delay) {
        let lastCall = 0;
        return function (...args) {
            const now = Date.now();
            if (now - lastCall >= delay) {
                lastCall = now;
                return func.apply(this, args);
            }
        };
    }
    
    /**
     * 生成唯一ID
     * @param {string} prefix - 前缀
     * @returns {string}
     */
    static generateId(prefix = 'id') {
        return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }
    
    /**
     * 格式化日期
     * @param {Date|string|number} date - 日期
     * @param {string} format - 格式
     * @returns {string}
     */
    static formatDate(date, format = 'YYYY-MM-DD HH:mm:ss') {
        const d = new Date(date);
        if (isNaN(d.getTime())) return '';
        
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const hours = String(d.getHours()).padStart(2, '0');
        const minutes = String(d.getMinutes()).padStart(2, '0');
        const seconds = String(d.getSeconds()).padStart(2, '0');
        
        return format
            .replace('YYYY', year)
            .replace('MM', month)
            .replace('DD', day)
            .replace('HH', hours)
            .replace('mm', minutes)
            .replace('ss', seconds);
    }
    
    /**
     * 截断文本
     * @param {string} text - 原文本
     * @param {number} maxLength - 最大长度
     * @param {string} suffix - 后缀
     * @returns {string}
     */
    static truncateText(text, maxLength, suffix = '...') {
        if (!text || text.length <= maxLength) return text;
        return text.substring(0, maxLength - suffix.length) + suffix;
    }
    
    /**
     * 深拷贝对象
     * @param {any} obj - 要拷贝的对象
     * @returns {any}
     */
    static deepClone(obj) {
        if (obj === null || typeof obj !== 'object') return obj;
        if (obj instanceof Date) return new Date(obj.getTime());
        if (obj instanceof Array) return obj.map(item => this.deepClone(item));
        if (typeof obj === 'object') {
            const clonedObj = {};
            Object.keys(obj).forEach(key => {
                clonedObj[key] = this.deepClone(obj[key]);
            });
            return clonedObj;
        }
    }
    
    /**
     * 延迟执行
     * @param {number} ms - 延迟时间（毫秒）
     * @returns {Promise}
     */
    static delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// 自定义下拉选择器类
class CustomSelect {
    constructor(container, options = {}) {
        this.container = typeof container === 'string' ? document.querySelector(container) : container;
        this.options = {
            placeholder: '请选择...',
            searchable: false,
            ...options
        };
        this.selectedValue = null;
        this.selectedText = null;
        this.isOpen = false;
        this.data = [];
        
        this.init();
    }
    
    init() {
        this.createElements();
        this.bindEvents();
    }
    
    createElements() {
        this.container.innerHTML = `
            <div class="custom-select-container">
                <button type="button" class="custom-select-button" tabindex="0">
                    <span class="custom-select-text custom-select-placeholder">${this.options.placeholder}</span>
                    <i class="fas fa-chevron-down custom-select-arrow"></i>
                </button>
                <div class="custom-select-dropdown">
                    <div class="custom-select-options"></div>
                </div>
            </div>
        `;
        
        this.button = this.container.querySelector('.custom-select-button');
        this.textSpan = this.container.querySelector('.custom-select-text');
        this.dropdown = this.container.querySelector('.custom-select-dropdown');
        this.optionsContainer = this.container.querySelector('.custom-select-options');
    }
    
    bindEvents() {
        // 点击按钮切换下拉菜单
        this.button.addEventListener('click', (e) => {
            e.preventDefault();
            this.toggle();
        });
        
        // 键盘事件
        this.button.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                this.toggle();
            } else if (e.key === 'Escape') {
                this.close();
            }
        });
        
        // 点击外部关闭下拉菜单
        document.addEventListener('click', (e) => {
            if (!this.container.contains(e.target)) {
                this.close();
            }
        });
    }
    
    setData(data) {
        this.data = data;
        this.renderOptions();
    }
    
    renderOptions() {
        this.optionsContainer.innerHTML = '';
        
        this.data.forEach((item, index) => {
            const option = document.createElement('div');
            option.className = 'custom-select-option';
            option.dataset.value = item.value;
            option.dataset.index = index;
            option.innerHTML = `<span>${item.text}</span>`;
            
            if (item.value === this.selectedValue) {
                option.classList.add('selected');
            }
            
            option.addEventListener('click', () => {
                this.selectOption(item.value, item.text);
            });
            
            this.optionsContainer.appendChild(option);
        });
    }
    
    selectOption(value, text) {
        // 更新选中状态
        this.selectedValue = value;
        this.selectedText = text;
        
        // 更新按钮文本
        this.textSpan.textContent = text;
        this.textSpan.classList.remove('custom-select-placeholder');
        
        // 更新选项的选中状态
        this.optionsContainer.querySelectorAll('.custom-select-option').forEach(option => {
            option.classList.remove('selected');
            if (option.dataset.value === value) {
                option.classList.add('selected');
            }
        });
        
        // 关闭下拉菜单
        this.close();
        
        // 触发change事件
        this.triggerChange();
    }
    
    getValue() {
        return this.selectedValue;
    }
    
    getText() {
        return this.selectedText;
    }
    
    setValue(value) {
        const item = this.data.find(item => item.value === value);
        if (item) {
            this.selectOption(item.value, item.text);
        }
    }
    
    reset() {
        this.selectedValue = null;
        this.selectedText = null;
        this.textSpan.textContent = this.options.placeholder;
        this.textSpan.classList.add('custom-select-placeholder');
        
        this.optionsContainer.querySelectorAll('.custom-select-option').forEach(option => {
            option.classList.remove('selected');
        });
        
        this.triggerChange();
    }
    
    toggle() {
        if (this.isOpen) {
            this.close();
        } else {
            this.open();
        }
    }
    
    open() {
        if (this.isOpen) return;
        
        this.isOpen = true;
        this.button.classList.add('active');
        this.dropdown.classList.add('show');
        
        // 确保下拉菜单在视口内
        this.adjustDropdownPosition();
    }
    
    close() {
        if (!this.isOpen) return;
        
        this.isOpen = false;
        this.button.classList.remove('active');
        this.dropdown.classList.remove('show');
    }
    
    adjustDropdownPosition() {
        const rect = this.dropdown.getBoundingClientRect();
        const viewportHeight = window.innerHeight;
        
        if (rect.bottom > viewportHeight) {
            this.dropdown.style.top = 'auto';
            this.dropdown.style.bottom = '100%';
            this.dropdown.style.marginTop = '0';
            this.dropdown.style.marginBottom = '4px';
        } else {
            this.dropdown.style.top = '100%';
            this.dropdown.style.bottom = 'auto';
            this.dropdown.style.marginTop = '4px';
            this.dropdown.style.marginBottom = '0';
        }
    }
    
    triggerChange() {
        const event = new CustomEvent('customSelectChange', {
            detail: {
                value: this.selectedValue,
                text: this.selectedText
            }
        });
        this.container.dispatchEvent(event);
    }
    
    on(eventName, callback) {
        if (eventName === 'change') {
            this.container.addEventListener('customSelectChange', (e) => {
                callback(e.detail.value, e.detail.text);
            });
        }
    }
    
    destroy() {
        // 清理事件监听器和DOM
        this.container.innerHTML = '';
    }
}

// 导出工具类（如果使用模块系统）
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { DOMHelper, APIHelper, StorageHelper, Utils, CustomSelect };
}

// 全局暴露（用于浏览器环境）
if (typeof window !== 'undefined') {
    window.DOMHelper = DOMHelper;
    window.APIHelper = APIHelper;
    window.StorageHelper = StorageHelper;
    window.Utils = Utils;
    window.CustomSelect = CustomSelect;
}