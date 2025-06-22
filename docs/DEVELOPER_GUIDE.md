# 项目代码开发指南

## 概述

本文档记录了AI侦探游戏项目的代码开发过程和最佳实践，旨在提高代码的可维护性、减少重复代码，并遵循DRY（Don't Repeat Yourself）原则。

## 开发规范

### 1. CSS规范

#### 1.1 平台独立的CSS架构
- **desktop.css**: 桌面端完整的独立样式文件
- **mobile.css**: 移动端完整的独立样式文件
- **设计原则**:
  - 每个平台使用完全独立的CSS文件
  - 不提取公共部分，避免复杂的依赖关系
  - 各平台可以自由定制样式而不影响其他平台
  - 便于维护和调试，样式问题定位更准确

#### 1.2 CSS编写规范
- **命名约定**: 使用BEM命名规范或语义化类名
- **组织结构**: 按功能模块组织CSS代码
- **注释规范**: 为复杂样式添加清晰的注释
- **优势**:
  - 简单直观，无需预处理器
  - 平台完全独立，互不影响
  - 便于新手理解和维护
  - 减少构建复杂度

### 2. JavaScript架构优化

#### 2.1 创建通用工具类
- **文件**: `frontend/static/js/utils.js`
- **包含工具类**:
  - `DOMHelper`: DOM操作工具类
  - `APIHelper`: API请求封装
  - `StorageHelper`: 本地存储工具
  - `Utils`: 通用工具函数

#### 2.2 主题管理系统
- **核心文件**:
  - `frontend/static/js/theme-manager.js`: 主题管理核心类
  - `frontend/static/js/theme-selector.js`: 主题选择器UI组件
  - `frontend/static/themes.json`: 主题配置文件
- **功能特性**:
  - 动态主题切换和预览
  - 用户偏好持久化存储
  - 案件类型主题自动匹配
  - 角色类型颜色动态配置
  - CSS变量动态注入
  - 主题变更事件回调机制

##### ThemeManager类
```javascript
// 获取主题管理器实例
const themeManager = window.themeManager;

// 切换主题
themeManager.applyTheme('midnight');

// 根据案件类型获取推荐主题
const recommendedTheme = themeManager.getRecommendedTheme('locked_room');

// 预览主题（不保存偏好）
themeManager.previewTheme('crime');
themeManager.endPreview(); // 恢复当前主题

// 监听主题变更事件
themeManager.onThemeChange((themeName, themeData) => {
    console.log(`主题已切换到: ${themeName}`);
    // 执行主题相关的UI更新
});
```

##### ThemeSelector类
```javascript
// 主题选择器会自动初始化
// 提供用户友好的主题切换界面
// 支持主题预览和实时应用
```

#### 2.3 工具类功能

##### DOMHelper类
```javascript
// 简化的DOM选择器
DOMHelper.$('#element-id')
DOMHelper.$('.class-name')

// 批量事件绑定
DOMHelper.bindEvents([
    ['#button1', 'click', handler1],
    ['#button2', 'click', handler2]
]);

// 元素操作
DOMHelper.toggle('#modal', true);
DOMHelper.setText('#title', '新标题');
```

##### APIHelper类
```javascript
// 统一的API请求
const data = await APIHelper.get('/api/cases');
const result = await APIHelper.post('/api/game/start', gameData);
```

##### StorageHelper类
```javascript
// 本地存储操作
StorageHelper.set('gameState', gameData);
const gameState = StorageHelper.get('gameState', defaultState);
```

##### Utils类
```javascript
// 防抖和节流
const debouncedSearch = Utils.debounce(searchFunction, 300);
const throttledScroll = Utils.throttle(scrollHandler, 100);

// 其他工具函数
const id = Utils.generateId('game');
const formattedDate = Utils.formatDate(new Date());
```

### 3. HTML文件

#### 3.1 引用顺序规范
```html
<!-- CSS文件引用顺序 -->
<link rel="stylesheet" href="static/css/desktop.css">

<!-- JavaScript文件引用顺序 -->
<script src="static/js/utils.js"></script>
<script src="static/js/theme-manager.js"></script>
<script src="static/js/desktop.js"></script>
```

## 最佳实践

### 1. CSS编写规范

#### 1.1 使用CSS自定义属性（CSS变量）
```css
/* 好的做法 - 使用CSS变量 */
:root {
  --primary-color: #64b5f6;
  --spacing-md: 1rem;
  --radius-md: 0.5rem;
  --transition-duration: 0.3s;
}

.button {
  background-color: var(--primary-color);
  padding: var(--spacing-md);
  border-radius: var(--radius-md);
  transition: all var(--transition-duration) ease;
}

/* 避免的做法 - 硬编码值 */
.button {
  background-color: #64b5f6;
  padding: 1rem;
  border-radius: 0.5rem;
  transition: all 0.3s ease;
}
```

#### 1.2 使用模块化CSS类
```css
/* 好的做法 - 基础类和组合类 */
.btn-base {
  display: inline-flex;
  align-items: center;
  padding: var(--spacing-sm) var(--spacing-lg);
  border: none;
  cursor: pointer;
  transition: all var(--transition-duration) ease;
}

.btn-gradient {
  background-image: linear-gradient(45deg, red, blue);
}

.custom-button {
  /* 组合使用: btn-base btn-gradient custom-button */
  /* 只添加特有样式 */
  font-weight: bold;
}

/* 避免的做法 - 重复定义基础样式 */
.custom-button {
  display: inline-flex;
  align-items: center;
  padding: var(--spacing-sm) var(--spacing-lg);
  border: none;
  cursor: pointer;
  transition: all var(--transition-duration) ease;
  background-image: linear-gradient(45deg, red, blue);
  font-weight: bold;
}
```

#### 1.3 平台独立的CSS架构
```css
/* desktop.css - 桌面端完整样式 */
:root {
  --base-font-size: 16px;
  --transition-duration: 0.3s;
  --desktop-sidebar-width: 300px;
  --desktop-content-max-width: 1200px;
}

.container {
  max-width: var(--desktop-content-max-width);
  margin: 0 auto;
}

/* mobile.css - 移动端完整样式 */
:root {
  --base-font-size: 14px;
  --transition-duration: 0.3s;
  --mobile-header-height: 60px;
  --mobile-bottom-nav-height: 80px;
}

.container {
  width: 100%;
  padding: 0 1rem;
}
```

### 2. JavaScript编写规范

#### 2.1 主题管理最佳实践

##### 2.1.1 主题配置规范
```javascript
// 好的做法 - 使用语义化的主题名称和描述
{
  "classic": {
    "name": "经典侦探",
    "description": "经典的侦探小说风格，深邃神秘",
    "colors": {
      "primaryBg": "linear-gradient(135deg, #2d3748 0%, #1a202c 50%, #0f0f1a 100%)",
      "primaryColor": "#64b5f6",
      "accentColor": "#FFD700"
    }
  }
}

// 避免的做法 - 使用技术性名称或缺少描述
{
  "theme1": {
    "colors": {
      "color1": "#64b5f6",
      "color2": "#FFD700"
    }
  }
}
```

##### 2.1.2 主题切换规范
```javascript
// 好的做法 - 等待主题管理器就绪后操作
themeManager.waitForReady().then(() => {
    const recommendedTheme = themeManager.getRecommendedTheme(caseCategory);
    themeManager.applyTheme(recommendedTheme);
});

// 避免的做法 - 直接操作CSS变量
document.documentElement.style.setProperty('--theme-primary-color', '#64b5f6');
```

##### 2.1.3 主题事件处理
```javascript
// 好的做法 - 使用主题变更回调
themeManager.onThemeChange((themeName, themeData) => {
    // 更新依赖主题的UI组件
    updateCharacterAvatars(themeName);
    refreshChartColors(themeData.colors);
});

// 避免的做法 - 手动监听CSS变量变化
// CSS变量变化无法直接监听，容易导致UI不同步
```

#### 2.2 使用工具类简化DOM操作
```javascript
// 好的做法
DOMHelper.bindEvent('#submit-btn', 'click', handleSubmit);
DOMHelper.setText('#status', '加载中...');

// 避免的做法
document.getElementById('submit-btn').addEventListener('click', handleSubmit);
document.getElementById('status').textContent = '加载中...';
```

#### 2.3 使用API工具类
```javascript
// 好的做法
try {
    const data = await APIHelper.get('/api/data');
    // 处理数据
} catch (error) {
    // 错误已被APIHelper处理和记录
}

// 避免的做法
try {
    const response = await fetch('/api/data');
    if (!response.ok) {
        throw new Error(`HTTP错误: ${response.status}`);
    }
    const data = await response.json();
    // 处理数据
} catch (error) {
    console.error('请求失败:', error);
    // 重复的错误处理逻辑
}
```

### 3. 代码组织原则

#### 3.1 单一职责原则
- 每个工具类专注于特定功能领域
- 避免在一个类中混合不相关的功能

#### 3.2 DRY原则
- 将重复的代码提取到通用函数或类中
- 使用CSS变量避免硬编码值
- 创建可复用的组件和样式

#### 3.3 可维护性
- 使用清晰的命名约定
- 添加适当的注释
- 保持代码结构的一致性

## 文件结构

```
frontend/
├── static/
│   ├── css/
│   │   ├── desktop.css        # 桌面端完整独立样式
│   │   └── mobile.css         # 移动端完整独立样式
│   ├── js/
│   │   ├── utils.js           # 通用工具类
│   │   ├── theme-manager.js   # 主题管理核心类
│   │   ├── theme-selector.js  # 主题选择器UI组件
│   │   ├── desktop.js         # 桌面端主逻辑
│   │   └── mobile.js          # 移动端主逻辑
│   └── themes.json            # 主题配置文件
├── desktop.html               # 桌面端页面
└── mobile.html                # 移动端页面
```

## 未来改进建议

### 1. 进一步模块化
- 考虑将大型JavaScript文件拆分为更小的模块
- 使用ES6模块系统或构建工具

### 2. CSS样式组件化
- 创建更多可复用的CSS类和组件
- 利用CSS自定义属性和现代CSS特性提高开发效率
- 考虑使用CSS模块或组件化方案进行更好的代码组织

### 3. 类型安全
- 考虑引入TypeScript提高代码质量
- 添加JSDoc注释提供类型信息

### 4. 测试覆盖
- 为工具类添加单元测试
- 确保重构后功能的正确性

### 5. 主题系统增强
- 支持用户自定义主题创建和导入
- 添加主题动画过渡效果
- 实现主题的热重载功能
- 支持基于时间的自动主题切换
- 添加主题兼容性检查机制

## 总结

通过本次重构，我们实现了：
- **平台独立性**: 每个平台使用完全独立的CSS文件，避免复杂依赖
- **提高可维护性**: 样式问题定位更准确，调试更简单
- **改善开发体验**: 使用现代CSS特性如自定义属性提供便捷的开发工具
- **增强一致性**: 统一的开发规范，差异化的平台设计
- **平台适配性**: 充分考虑Mobile和Desktop的显示差异，各自独立优化
- **主题管理系统**: 实现了完整的主题管理架构，支持动态切换、预览、持久化和事件回调
- **用户体验提升**: 通过主题选择器提供直观的主题切换界面，支持案件类型自动匹配

这些改进为项目的长期维护和扩展奠定了良好的基础。