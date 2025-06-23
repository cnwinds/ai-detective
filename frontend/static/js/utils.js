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
     * 显示/隐藏元素
     * @param {string|Element} element - 元素ID或元素对象
     * @param {boolean} show - 是否显示
     */
    static toggle(element, show) {
        const el = typeof element === 'string' ? this.$(element) : element;
        if (el) {
            el.style.display = show ? 'block' : 'none';
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

// 导出工具类（如果使用模块系统）
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { DOMHelper, APIHelper, StorageHelper, Utils };
}

// 全局暴露（用于浏览器环境）
if (typeof window !== 'undefined') {
    window.DOMHelper = DOMHelper;
    window.APIHelper = APIHelper;
    window.StorageHelper = StorageHelper;
    window.Utils = Utils;
}