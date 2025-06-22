# 项目代码开发指南

## 概述

本文档记录了AI侦探游戏项目的代码开发过程和最佳实践，旨在提高代码的可维护性、减少重复代码，并遵循DRY（Don't Repeat Yourself）原则。

## 开发规范

### 1. SASS规范

#### 1.1 创建通用变量文件
- **文件**: `frontend/static/sass/common.sass`
- **目的**: 集中管理技术性共用变量和基础样式
- **包含内容**:
  - 基础颜色变量（非主题相关）
  - 技术性间距、圆角、过渡动画变量
  - 通用混入（mixins）
  - 基础工具函数
  - 跨平台通用的技术性样式

#### 1.2 重构现有CSS文件为SASS
- **desktop.sass**: 引用`common.sass`，专注桌面端特有的UI设计
- **mobile.sass**: 引用`common.sass`，专注移动端特有的UI设计
- **平台差异考虑**:
  - Mobile和Desktop显示效果差异较大
  - 仅提取技术性共用部分（变量、混入、工具函数）
  - 各平台保持独立的UI样式设计
- **优势**:
  - 减少技术性代码重复
  - 保持平台UI独立性
  - 便于SASS功能使用和维护

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
<!-- SASS编译后的CSS文件引用顺序 -->
<link rel="stylesheet" href="static/css/desktop.css">

<!-- JavaScript文件引用顺序 -->
<script src="static/js/utils.js"></script>
<script src="static/js/theme-manager.js"></script>
<script src="static/js/desktop.js"></script>
```

## 最佳实践

### 1. SASS编写规范

#### 1.1 使用SASS变量和混入
```sass
// 好的做法 - 使用SASS变量
.button
  background-color: $primary-color
  padding: $spacing-md
  border-radius: $radius-md
  @include transition-base

// 避免的做法 - 硬编码值
.button
  background-color: #64b5f6
  padding: 1rem
  border-radius: 0.5rem
  transition: all 0.3s ease
```

#### 1.2 使用混入和继承
```sass
// 好的做法 - 使用混入和继承
.custom-button
  @extend %btn-base
  @include gradient-background(45deg, red, blue)
  // 只添加特有样式

// 避免的做法 - 重复定义基础样式
.custom-button
  display: inline-flex
  align-items: center
  padding: $spacing-sm $spacing-lg
  // ... 重复的基础样式
  background-image: linear-gradient(45deg, red, blue)
```

#### 1.3 平台差异化处理
```sass
// common.sass - 仅技术性共用部分
$base-font-size: 16px
$transition-duration: 0.3s

@mixin transition-base
  transition: all $transition-duration ease

// desktop.sass - 桌面端特有设计
@import 'common'

$desktop-sidebar-width: 300px
$desktop-content-max-width: 1200px

// mobile.sass - 移动端特有设计
@import 'common'

$mobile-header-height: 60px
$mobile-bottom-nav-height: 80px
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
│   ├── sass/
│   │   ├── common.sass        # 技术性共用变量和混入
│   │   ├── desktop.sass       # 桌面端特有样式
│   │   └── mobile.sass        # 移动端特有样式
│   ├── css/
│   │   ├── desktop.css        # 编译后的桌面端样式
│   │   └── mobile.css         # 编译后的移动端样式
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

### 2. SASS样式组件化
- 创建更多可复用的SASS混入和占位符选择器
- 利用SASS的嵌套、变量、函数等特性提高开发效率
- 考虑使用SASS模块系统进行更好的代码组织

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
- **减少技术性代码重复**: 通过SASS共享变量、混入和工具函数
- **提高可维护性**: 集中管理技术性样式，保持平台UI独立性
- **改善开发体验**: 利用SASS特性提供便捷的开发工具
- **增强一致性**: 统一的技术架构，差异化的UI设计
- **平台适配性**: 充分考虑Mobile和Desktop的显示差异
- **主题管理系统**: 实现了完整的主题管理架构，支持动态切换、预览、持久化和事件回调
- **用户体验提升**: 通过主题选择器提供直观的主题切换界面，支持案件类型自动匹配

这些改进为项目的长期维护和扩展奠定了良好的基础。