FROM cnbcool/default-build-env:latest

# install vscode and extension
# 注意修改版本时，需要同步修改 languagepacks.json 文件内容(重新生成)
RUN curl -fsSL https://code-server.dev/install.sh | sh -s -- --version 4.99.2 &&\
    code-server --install-extension cnbcool.cnb-welcome &&\
    code-server --install-extension redhat.vscode-yaml &&\
    code-server --install-extension waderyan.gitblame &&\
    code-server --install-extension mhutchie.git-graph &&\
    code-server --install-extension donjayamanne.githistory &&\
    code-server --install-extension cloudstudio.live-server &&\
    code-server --install-extension cweijan.vscode-mysql-client2
    

# 安装 ssh 服务，用于支持 VSCode 客户端通过 Remote-SSH 访问开发环境
RUN apt-get update && \
    apt-get install -y wget unzip lsof nload htop net-tools dnsutils openssh-server && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# 安装Docker环境
RUN echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/debian bookworm stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
RUN sed -i 's|https://download.docker.com|http://mirrors.ustc.edu.cn/docker-ce|g' /etc/apt/sources.list.d/docker.list
RUN curl -fsSL https://download.docker.com/linux/debian/gpg -o /etc/apt/keyrings/docker.asc
RUN chmod a+r /etc/apt/keyrings/docker.asc
RUN apt-get update
RUN apt-get install -y docker-ce docker-ce-cli containerd.io

COPY settings.json /root/.vscode-server/data/Machine/settings.json
COPY settings.json /root/.local/share/code-server/Machine/settings.json
COPY cnb-init-from /bin/cnb-init-from
COPY cnb-init-from-without-lfs /bin/cnb-init-from-without-lfs
COPY gitconfig /root/.gitconfig

# 指定字符集支持命令行输入中文（根据需要选择字符集）
ENV LANG C.UTF-8
ENV LANGUAGE C.UTF-8