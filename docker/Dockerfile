# 使用Python 3.11官方镜像作为基础镜像
FROM python:3.11-slim

# 定义构建参数
ARG PORT=8000

# 设置工作目录
WORKDIR /app

# 设置环境变量
ENV PYTHONPATH=/app
ENV PYTHONUNBUFFERED=1
ENV PORT=${PORT}

# 修改所有可能的源文件，使用中科大镜像源加速
RUN sed -i 's|http://.*debian.org|http://mirrors.ustc.edu.cn|g' /etc/apt/sources.list /etc/apt/sources.list.d/* || true

# 安装系统依赖
RUN apt-get update && apt-get install -y \
    curl \
    default-mysql-client \
    netcat-traditional \
    && rm -rf /var/lib/apt/lists/*

# 复制requirements文件
COPY requirements.txt .

# 配置pip使用中科大镜像源并安装Python依赖
RUN pip config set global.index-url https://mirrors.ustc.edu.cn/pypi/web/simple && \
    pip config set global.trusted-host mirrors.ustc.edu.cn && \
    pip install --no-cache-dir -r requirements.txt

# 复制应用代码
COPY . .

# 复制数据库等待脚本
COPY docker/wait-for-db.sh /wait-for-db.sh
RUN chmod +x /wait-for-db.sh

# 创建非root用户
RUN useradd -m -u 1000 appuser && chown -R appuser:appuser /app
USER appuser

# 动态暴露端口
EXPOSE ${PORT}

# 健康检查（使用动态端口）
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:${PORT}/api/health || exit 1

# 启动命令 - 先等待数据库就绪，然后启动应用
CMD ["/wait-for-db.sh", "mysql", "3306", "--", "python", "start_game.py"] 