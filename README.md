# AI侦探推理游戏

一个基于AI的侦探推理游戏，支持Web版本和命令行版本。玩家扮演侦探，通过与AI驱动的角色对话来收集线索，分析证据，最终找出真凶。

## 🎮 游戏特色

- **AI驱动对话**：每个角色都由AI控制，提供真实的对话体验
- **智能证据系统**：根据对话智能揭露证据线索
- **复杂推理机制**：多层次的案例设计，需要深度推理
- **流式对话体验**：实时显示AI回答，增强沉浸感
- **前后端分离**：现代化Web架构，支持多平台访问

## 📁 项目结构

本项目采用清晰的模块化结构，便于维护和扩展：

```
ai-detective/
├── 📁 backend/                 # 后端代码
│   ├── 📄 app.py              # FastAPI主应用
│   ├── 📄 version.py          # 版本管理
│   ├── 📄 models.py           # 数据模型
│   ├── 📄 game_engine.py      # 游戏引擎
│   ├── 📄 ai_service.py       # AI服务
│   ├── 📄 case_data.py        # 案例数据
│   ├── 📄 accusation_system.py # 指控系统
│   ├── 📄 evidence_system.py  # 证据系统
│   └── 📄 config.py           # 配置文件
│
├── 📁 frontend/               # 前端代码
│   ├── 📄 index.html          # 主页面
│   └── 📁 static/             # 静态资源
│       ├── 📁 css/            # 样式文件
│       │   └── 📄 style.css   # 主样式
│       ├── 📁 js/             # JavaScript文件
│       │   └── 📄 app.js      # 主应用逻辑
│       └── 📁 images/         # 图片资源
│
├── 📁 docker/                 # Docker部署文件
│   ├── 📄 Dockerfile          # Docker镜像构建
│   ├── 📄 docker-compose.yml  # Docker Compose配置
│   ├── 📄 .dockerignore       # Docker忽略文件
│   ├── 📄 deploy.sh           # Linux/macOS部署脚本
│   ├── 📄 deploy.bat          # Windows部署脚本
│   ├── 📄 README.md           # Docker使用说明
│   └── 📄 DOCKER_DEPLOYMENT.md # 详细部署文档
│
├── 📄 start_game.py           # Web服务器启动脚本
├── 📄 update_version.py       # 版本更新工具
├── 📄 requirements.txt        # Python依赖
├── 📄 env.template            # 环境变量模板
├── 📄 README.md               # 项目说明
├── 📄 LICENSE                 # 许可证
└── 📄 .gitignore              # Git忽略文件
```

### 📋 核心文件说明

#### 🔧 核心文件

| 文件 | 描述 | 用途 |
|------|------|------|
| `start_game.py` | 服务器启动脚本 | 启动Web应用 |
| `requirements.txt` | Python依赖列表 | 安装项目依赖 |
| `env.example` | 环境变量示例 | 配置API密钥等 |

#### 🎮 后端模块

| 文件 | 描述 | 功能 |
|------|------|------|
| `backend/app.py` | FastAPI主应用 | API路由和WebSocket |
| `backend/version.py` | 版本管理 | 版本号配置和缓存控制 |
| `backend/game_engine.py` | 游戏引擎 | 游戏逻辑和状态管理 |
| `backend/ai_service.py` | AI服务 | OpenAI API集成 |
| `backend/case_data.py` | 案例数据 | 案例、角色、证据定义 |
| `backend/models.py` | 数据模型 | Pydantic数据模型 |

#### 🎨 前端资源

| 文件 | 描述 | 功能 |
|------|------|------|
| `frontend/index.html` | 主页面 | 游戏界面结构 |
| `frontend/static/css/style.css` | 主样式 | 界面样式和动画 |
| `frontend/static/js/app.js` | 主应用 | 游戏逻辑和交互 |

#### 🐳 Docker部署

| 文件 | 描述 | 用途 |
|------|------|------|
| `docker/Dockerfile` | 镜像构建文件 | 定义容器环境 |
| `docker/docker-compose.yml` | 编排配置 | 服务配置和网络 |
| `docker/deploy.sh` | 部署脚本(Unix) | 自动化部署 |
| `docker/deploy.bat` | 部署脚本(Windows) | 自动化部署 |

## 🔢 版本管理

本项目使用统一的版本管理系统，版本号会自动应用到：
- 浏览器标题栏
- 主菜单界面显示
- JavaScript文件缓存控制
- API接口返回信息

### 版本号规则

- 格式：`主版本.次版本.修订版本` (例如: 1.6.0)
- 主版本：重大功能更新或架构变更
- 次版本：新功能添加
- 修订版本：Bug修复或小改进

### 版本管理操作

#### 查看当前版本
```bash
python update_version.py
```

#### 更新版本号
```bash
python update_version.py 1.7.0
```

### 版本号的作用

1. **浏览器标题**: 显示为 "侦探推理游戏 v1.6.0"
2. **主菜单显示**: 右下角显示版本号
3. **缓存控制**: JavaScript文件使用版本号参数 `app.js?v=160`
4. **API接口**: `/api/version` 和 `/api/health` 返回版本信息

### 版本更新流程

1. 使用脚本更新版本号
2. 重启服务器
3. 刷新浏览器页面
4. 验证版本号显示正确

## 🚀 快速部署

### 环境要求

- Python 3.7+ 或 Docker
- OpenAI 兼容API密钥（必需）

### 方式一：直接运行（推荐）

```bash
# 1. 下载项目
git clone <repository-url>
cd ai-detective

# 2. 启动MySQL数据库容器
docker run --name mysql-container -d -p 3306:3306 -e MYSQL_ROOT_PASSWORD=123456 mysql:5.7

# 3. 安装依赖
pip install -r requirements.txt

# 4. 设置API密钥
cp env.template .env
# 编辑 .env 文件，填入你的 OpenAI API 密钥和数据库配置

# 5. 初始化数据库表结构
python tools/setup_database.py

# 6. 启动游戏
python start_game.py

# 7. 打开浏览器访问 http://localhost:8000
```

### 方式二：Docker运行

```bash
# 1. 下载项目
git clone <repository-url>
cd ai-detective

# 2. 设置API密钥
cp env.template .env
# 编辑 .env 文件，填入你的 OpenAI API 密钥

# 3. 启动容器
cd docker
./deploy.sh          # Linux/macOS
# 或者 Windows 用户运行：deploy.bat

# 4. 打开浏览器访问 http://localhost:8000
```

## 🎯 游戏玩法

### 核心玩法

1. **选择案例**：从可用案例中选择一个开始调查
2. **角色对话**：点击角色头像与不同角色对话
3. **收集线索**：通过提问收集证据和信息
4. **分析推理**：根据收集的信息分析案件
5. **指控真凶**：当你确信找到真凶时进行指控
6. **审判环节**：观看AI角色的辩护和投票过程

## 🎨 前端特性

- **响应式设计**：支持桌面和移动设备
- **实时通信**：WebSocket支持实时游戏状态同步
- **流式输出**：AI回答实时显示，提升用户体验
- **现代UI**：渐变背景、卡片布局、平滑动画
- **角色切换**：独立的对话历史管理

## 🧠 AI系统

### 角色AI

每个角色都有独特的：
- 性格特征和背景故事
- 知识范围和秘密信息
- 行为模式和对话风格
- 动机和不在场证明

### 证据系统

- **智能揭露**：根据对话内容智能判断是否揭露证据
- **角色知识**：不同角色知道不同的证据信息
- **推理支持**：为玩家推理提供关键线索

### 指控系统

- **多角色参与**：所有角色参与辩护和投票
- **智能分析**：AI分析证据和对话历史
- **动态结果**：根据证据强度和角色立场决定结果

## 🛠️ 开发指南

### Ubuntu环境启动游戏

```bash
python3 -m venv myenv       # 创建虚拟环境
source myenv/bin/activate  # 激活环境（Linux/macOS）
# Windows 使用 `myenv\Scripts\activate`
pip install -r requirements.txt
```

### 调试模式

启用调试模式获取详细日志：

```bash
python start_game.py --debug
```

### 添加新案例

1. 在 `backend/case_data.py` 中定义新案例
2. 包含角色、证据、时间线等完整信息
3. 测试角色对话和证据揭露逻辑

### 前端定制

- 修改 `frontend/static/css/style.css` 调整样式
- 编辑 `frontend/static/js/app.js` 添加新功能
- 更新 `frontend/index.html` 修改页面结构

### 版本发布流程

1. 使用 `update_version.py` 更新版本号
2. 更新 `README.md` 中的变更说明
3. 测试所有功能正常工作
4. 提交代码并创建发布标签

## 🗄️ 数据库配置

### 数据库表结构

本项目使用MySQL数据库存储游戏数据，包含以下核心表：

- **game_sessions**：游戏会话记录
  - `id`：会话唯一标识
  - `case_name`：案例名称
  - `start_time`：开始时间
  - `end_time`：结束时间
  - `status`：游戏状态
  - `result`：游戏结果

- **conversations**：对话记录
  - `id`：对话唯一标识
  - `session_id`：关联的游戏会话
  - `character_name`：角色名称
  - `message`：对话内容
  - `timestamp`：对话时间
  - `message_type`：消息类型

- **game_evaluations**：游戏评价
  - `id`：评价唯一标识
  - `session_id`：关联的游戏会话
  - `rating`：评分（1-5星）
  - `reason`：评价理由
  - `created_at`：创建时间

### 数据库初始化流程

#### 方法一：使用初始化脚本（推荐）
```bash
# 运行数据库初始化脚本
python tools/setup_database.py
```

#### 方法二：通过API接口
```bash
# 调用数据库初始化API
curl -X POST http://localhost:8000/api/database/init
```

#### 方法三：Docker容器自动初始化
使用Docker部署时，容器启动会自动执行数据库初始化：
```bash
# Docker容器启动时会自动运行 wait-for-db.sh 脚本
# 该脚本会等待数据库就绪后自动创建表结构
```

### 数据库管理操作

#### 检查表状态
```python
# 检查数据库表是否存在
from backend.database import engine
from sqlalchemy import inspect

inspector = inspect(engine)
tables = inspector.get_table_names()
print("现有表：", tables)
```

#### 重新创建表
```python
# 重新创建所有表（谨慎使用，会删除现有数据）
from backend.database import create_tables
create_tables()
```

#### 数据库连接测试
```bash
# 测试数据库连接
python -c "from backend.database import test_connection; test_connection()"
```

## 📝 配置说明

### 环境变量

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| `OPENAI_API_KEY` | OpenAI API密钥 | 必填 |
| `OPENAI_MODEL` | 使用的AI模型 | deepseek-v3 |
| `MAX_ROUNDS` | 最大对话轮数 | 30 |
| `MAX_HINTS` | 最大提示次数 | 3 |
| `HOST` | 服务器主机地址 | 0.0.0.0 |
| `PORT` | 服务器端口 | 8000 |

### 服务器配置

所有配置项都可以通过环境变量或 `env.template` 文件进行设置：

```bash
# 复制模板文件
cp env.template .env

# 编辑配置文件
# 必须设置 OPENAI_API_KEY
# 其他参数可根据需要调整
```

## 🐛 故障排除

### 常见问题

1. **OpenAI API错误**
   - 检查API密钥是否正确
   - 确认账户有足够余额
   - 验证网络连接

2. **服务器启动失败**
   - 检查端口是否被占用
   - 确认Python版本兼容性
   - 查看错误日志详情

3. **前端显示异常**
   - 清除浏览器缓存
   - 检查控制台错误信息
   - 确认API服务正常运行

4. **数据库相关错误**
   - **表不存在错误**：运行 `python tools/setup_database.py` 创建数据库表
   - **数据库连接失败**：检查MySQL服务是否启动，确认连接配置正确
   - **权限错误**：确认数据库用户有足够的权限创建表和操作数据
   - **重新初始化数据库**：可以调用 `POST /api/database/init` API接口重新创建表结构

## 📄 许可证

本项目采用 MIT 许可证。详见 [LICENSE](LICENSE) 文件。

## 🤝 贡献

欢迎提交Issue和Pull Request来改进这个项目！

### 贡献指南

1. Fork 项目
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

## 📞 联系方式

如有问题或建议，请通过以下方式联系：

- 提交 GitHub Issue
- 发送邮件至项目维护者

---

**享受推理的乐趣！🕵️‍♂️**