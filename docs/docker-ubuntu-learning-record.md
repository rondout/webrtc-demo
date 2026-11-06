# WebRTC Demo：从零安装 Docker 到 Nginx HTTPS 部署实战记录

记录日期：2026-11-05

这份记录整理了本次实际完成的学习过程：项目先在 Ubuntu 原生运行，再安装 Docker，用 Nginx 容器托管构建后的前端，并反向代理 Ubuntu 宿主机上的 HTTPS Node 后端，最终完成登录、聊天、WebSocket 与视频通话验证。

本文命令均使用 Ubuntu 的 Bash。Windows 的 PowerShell 语法不直接混用。示例中的用户名、项目位置、IP、容器名需要按自己的环境调整。

## 1. 本次完成了什么

最终架构：

```text
Windows 浏览器                         Ubuntu 浏览器
https://192.168.8.112                   https://localhost
          │                                   │
          └──────────────┬────────────────────┘
                         │ HTTPS / WSS
                         ▼
              Ubuntu 宿主机端口 443
                         │ Docker 端口映射 443:443
                         ▼
                  Nginx 容器
                  ├─ /      → 读取挂载的前端构建产物
                  ├─ /api/  → HTTPS 后端 API
                  └─ /ws    → WSS 聊天与通话信令
                         │
                         │ https://host.docker.internal:4004
                         ▼
             Ubuntu 原生启动的 Node / Express 后端
             监听 0.0.0.0:4004，使用项目开发证书
```

当前只有 Nginx 在 Docker 中运行，Node 后端仍在 Ubuntu 上运行；本次还没有编写应用 Dockerfile，也没有把后端装进容器。

聊天消息、SDP、ICE 等通话信令通过 WebSocket 经过 Nginx 和 Node。视频、音频媒体通过 WebRTC 在浏览器之间传输，可能直连，也可能在配置 TURN 后经 TURN 中继；媒体不会因为配置了 `/ws` 反向代理而经过 Nginx。

实际验证：Windows 使用局域网 IP、Ubuntu 使用 localhost，两边以不同账号登录，WebSocket 返回 101，通话计时和视频画面均正常。这说明当前局域网场景已跑通，不代表所有跨公网 NAT 场景都已验证。

## 2. 先理解几个 Docker 名词

| 名词 | 含义 | 本次实例 |
| --- | --- | --- |
| Docker Engine | 创建、运行、管理容器的引擎 | Ubuntu 中的 docker 服务 |
| Docker CLI | 用户在终端输入的客户端命令 | `docker run`、`docker ps` |
| 镜像 Image | 创建容器的模板，包含程序和必要文件 | `nginx:stable-alpine` |
| 容器 Container | 根据镜像创建出来的一次运行实例 | `nginx-study` |
| 镜像仓库 Registry | 分发镜像的服务 | Docker Hub |
| Dockerfile | 描述如何构建自己的镜像的文本文件 | 本阶段尚未使用 |
| Docker Compose | 用 YAML 声明、管理多个容器及其配置 | 后续学习内容 |
| 宿主机 | 运行 Docker 引擎的系统 | 本次是 Ubuntu 虚拟机，不是外面的 Windows |
| 绑定挂载 Bind mount | 把宿主机指定文件或目录提供给容器访问 | 前端目录、Nginx 配置、证书目录 |

可以把镜像理解成程序模板，把容器理解成按模板启动的实例。同一个镜像可以创建多个容器，各自有名称、网络和可写文件层。

容器不是完整虚拟机。Linux 容器共享宿主机 Linux 内核，依靠命名空间等机制隔离进程、网络、文件系统视图等。本次 Windows 先通过 VirtualBox 运行 Ubuntu，再由 Ubuntu 运行 Docker。

### Docker 官网为什么有那么多产品

学习本次部署只需关注 Docker Engine、Docker Hub 和后续的 Compose。Docker Desktop 是包含图形界面和相关组件的整合产品；本次在 Ubuntu 安装 Engine 即可。Scout、Offload、Sandboxes 等暂时不影响这套流程。

## 3. 先让项目在 Ubuntu 原生运行

这样做可以先确认代码、依赖、证书和后端本身正常，避免把应用问题与 Docker 问题混在一起。

### 3.1 Windows 的 pwsh 在 Ubuntu 不一定存在

原项目根目录脚本：

```json
"dev:cert": "pwsh -NoProfile -File scripts/dev-cert.ps1"
```

这里的 `pwsh` 是 PowerShell 7 可执行程序，不是 Docker 命令，也不是 Ubuntu 默认提供的 Bash。不能仅把终端换成 Bash，就认为这个脚本会自动兼容。

为项目补充了 Linux 证书脚本：

```text
scripts/dev-cert.sh
```

对应命令：

```bash
pnpm dev:cert:linux
```

它使用 Bash 调用 OpenSSL，沿用原来的证书文件位置：

```text
.certs/dev-cert.pem
.certs/dev-key.pem
```

证书包含 localhost、本机 IPv4 和回环地址；需要时可以补充公网 IP 或域名：

```bash
CERT_IP=实际公网IP pnpm dev:cert:linux --force
CERT_DNS=实际域名 pnpm dev:cert:linux --force
```

`CERT_IP=... 命令` 是 Bash 为单次命令设置环境变量的写法。`--force` 表示即使证书已存在也重新生成。域名/IP 改变后，需要重新生成适配访问地址的证书，并重启加载证书的服务。

开发证书是自签名证书，脚本不自动写入系统信任库。证书文件存在，不等于浏览器已经信任它。

### 3.2 安装依赖与启动

准备 Node.js 22 LTS 和 pnpm，然后在项目根目录执行：

```bash
sudo apt update
sudo apt install -y openssl

pnpm install
pnpm --dir client install
pnpm --dir server install

pnpm dev:cert:linux
pnpm dev
```

根目录、client、server 是分别安装依赖的包。`--dir client` 表示在 client 目录执行 pnpm 命令。

项目启动脚本的相关补齐：根目录声明 concurrently，负责同时启动前后端；后端使用 nodemon 调用 tsx 运行 TypeScript，避免依赖机器上恰好存在的全局 TypeScript 运行器。

开发模式地址：

```text
前端：https://localhost:5173
后端：https://localhost:4004
```

Vite 开发代理会把 `/api`、`/ws` 转发到后端。构建后的静态页面没有 Vite 开发服务器，必须由 Nginx 重新配置这些代理规则。

### 3.3 构建前端

```bash
pnpm --dir client build
```

当前项目 Vite 的 `outDir` 是 `../server/public`，所以输出默认在项目的 `server/public`，不能未经检查就假定为 `client/dist`。构建包括前端类型检查。

本次实际挂载给 Nginx 的页面目录是：

```text
/home/shufei-han/PRAC/public
```

这个目录需要放真正的构建产物，包含 `index.html`、资源目录等。若项目实际输出目录与这里不同，需要把产物复制到这个目录，或将挂载 source 改为实际构建目录。后续重新构建时也要同步更新。

当前 Vite 配置在加载配置时会读取开发证书，因此在这份配置下运行 build 前也需要确保证书存在。这是项目当前配置行为，不是所有 Vite 项目构建都需要证书。

## 4. 在 Ubuntu 安装 Docker Engine

官方参考：https://docs.docker.com/engine/install/ubuntu/

以下按本次新安装路径记录。若机器原来安装过其他来源的 Docker/containerd，先按官方文档检查冲突包，不要盲目卸载已有业务依赖。

### 4.1 添加官方软件源的签名公钥

```bash
sudo apt update
sudo apt install -y ca-certificates curl

sudo install -m 0755 -d /etc/apt/keyrings

sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg \
  -o /etc/apt/keyrings/docker.asc

sudo chmod a+r /etc/apt/keyrings/docker.asc
```

命令解释：

| 写法 | 含义 |
| --- | --- |
| sudo | 以管理员权限运行当前命令 |
| apt update | 更新软件包索引，不是升级所有软件 |
| apt install -y | 安装软件包，自动确认常规安装提示 |
| ca-certificates | 系统用于验证 HTTPS 证书的受信任 CA 集合 |
| curl | 命令行 HTTP/HTTPS 请求工具 |
| install -m 0755 -d | 创建目录并设置权限；这里的 install 不是 apt 安装软件 |
| curl -f | HTTP 错误状态时让命令失败 |
| curl -sS | 安静运行但仍显示错误 |
| curl -L | 跟随重定向 |
| -o 路径 | 把下载内容写到指定文件 |
| chmod a+r | 让所有用户可读公钥文件，便于 apt 校验 |

公钥用于验证软件源发布内容的签名。它不是本机 HTTPS 私钥，可以公开读取。

### 4.2 配置 apt 仓库

```bash
sudo tee /etc/apt/sources.list.d/docker.sources > /dev/null <<EOF
Types: deb
URIs: https://download.docker.com/linux/ubuntu
Suites: $(. /etc/os-release && echo "${UBUNTU_CODENAME:-$VERSION_CODENAME}")
Components: stable
Architectures: $(dpkg --print-architecture)
Signed-By: /etc/apt/keyrings/docker.asc
EOF
```

这里 `tee` 把内容写入需要管理员权限的系统文件；`> /dev/null` 只是隐藏 tee 在终端重复输出的内容。`<<EOF ... EOF` 是 Bash 的多行输入语法。

`Suites` 使用当前 Ubuntu 的发行版代号，`Architectures` 使用本机架构，`Signed-By` 明确指定校验该源的公钥。不要为了让命令执行而随意把发行版代号改成另一个版本；需要确认 Docker 仓库支持当前系统版本。

### 4.3 安装组件

```bash
sudo apt update

sudo apt install -y \
  docker-ce \
  docker-ce-cli \
  containerd.io \
  docker-buildx-plugin \
  docker-compose-plugin
```

| 软件包 | 作用 |
| --- | --- |
| docker-ce | Docker 引擎服务 |
| docker-ce-cli | docker 命令行客户端 |
| containerd.io | 底层容器运行管理组件 |
| docker-buildx-plugin | 扩展构建功能，后续构建镜像使用 |
| docker-compose-plugin | 提供 `docker compose` 子命令 |

Bash 行末的反斜杠 `\` 表示续行：这些行仍是一条命令。反斜杠必须放在行末，后面不要再加空格或注释。

### 4.4 启动服务与检查

```bash
sudo systemctl enable --now docker
sudo systemctl status docker
sudo docker version
sudo docker compose version
```

`enable` 设置开机启动，`--now` 同时立即启动服务。`status` 如果进入翻页界面，按 `q` 退出。`docker version` 可以显示客户端和服务端版本，只有客户端存在不代表引擎已运行。

可选：避免每次输入 sudo：

```bash
sudo usermod -aG docker "$USER"
```

退出并重新登录后再验证 `docker ps`。`-aG` 是追加组成员身份，保留原有其他组。docker 组具有很高的宿主机管理权限，只给可信用户添加。本次记录继续保留 sudo 写法，保持步骤一致。

## 5. 第一个坑：apt 公钥验证失败与连接重置

实际出现过：

```text
NO_PUBKEY 7EA0A9C3F273FCD8
OpenPGP 签名校验失败
仓库没有签名
SSL connection failed / 连接被对方重置
```

这些日志中同时存在签名校验问题和网络连接问题。不能只根据“仓库没有签名”就断定官方仓库真的不签名，更不能通过关闭签名校验来解决。

本次重新下载公钥后恢复：

```bash
sudo apt install -y ca-certificates curl gnupg
sudo install -m 0755 -d /etc/apt/keyrings

sudo curl -fSL --retry 3 \
  https://download.docker.com/linux/ubuntu/gpg \
  -o /etc/apt/keyrings/docker.asc

sudo chmod a+r /etc/apt/keyrings/docker.asc
gpg --show-keys /etc/apt/keyrings/docker.asc
sudo apt update
```

`--retry 3` 表示遇到适用的临时错误时最多重试 3 次。`gpg --show-keys` 用于确认下载内容确实能被解析成公钥，而不是网络错误页面。

本次看到 `Docker Release (CE deb)`，主公钥指纹为：

```text
9DC8 5822 9FC7 DD38 854A E2D8 8D81 803C 0EBF CD88
```

报错里的签名子密钥 ID 不一定和主公钥指纹末尾相同。未来公钥可能更新，应以官方发布的信息为准。

重新 `apt update` 后正常取得 Docker 的 Packages 索引，说明本次软件源已恢复。“94 个软件包可以升级”只是系统升级提示，不是 Docker 安装失败。

## 6. 运行 hello-world：镜像从哪里来

```bash
sudo docker run hello-world
```

Docker 会：

1. 查找本机是否有 `hello-world:latest` 镜像。
2. 没有就从配置的仓库路径获取镜像。
3. 用镜像创建一个容器。
4. 启动容器内的程序，输出欢迎信息。
5. 程序结束，容器退出。

因此这条提示本身是正常的：

```text
Unable to find image 'hello-world:latest' locally
```

也可以拆开理解：

```bash
sudo docker pull hello-world
sudo docker run hello-world
```

`pull` 只下载镜像，`run` 创建并启动新容器。没有写 tag 时通常使用 `latest`；这个标签名称并不保证镜像永远是最新发布版本。

可自动删除测试容器：

```bash
sudo docker run --rm hello-world
```

`--rm` 会在退出后删除该容器，不会删除镜像。

## 7. 第二个坑：Docker Hub 镜像下载超时

Docker 服务日志已经显示成功启动，但执行 run 报错：

```text
failed to resolve reference docker.io/library/hello-world:latest
Head https://registry-1.docker.io/...
dial tcp ...:443: i/o timeout
```

这表明引擎能接收命令，但下载镜像时访问仓库超时，不需要重新安装 Docker。

### 7.1 配置本次使用的镜像加速地址

本次使用 DaoCloud 地址后成功下载：

```text
https://docker.m.daocloud.io
```

配置：

```bash
sudo mkdir -p /etc/docker
sudo nano /etc/docker/daemon.json
```

空文件写入：

```json
{
  "registry-mirrors": [
    "https://docker.m.daocloud.io"
  ]
}
```

如果原来有配置，要合并字段，不能覆盖其他有效配置。JSON 不允许注释、尾部逗号，字段名和字符串要使用双引号。

nano 保存：Ctrl+O，回车；退出：Ctrl+X。

```bash
sudo systemctl restart docker
sudo docker info
sudo docker run --rm hello-world
```

在 `docker info` 中检查 `Registry Mirrors`。该项出现只说明配置被加载，实际拉取成功才证明当前网络和镜像服务能够完成这次请求。

本次最终出现：

```text
Status: Downloaded newer image for hello-world:latest
Hello from Docker!
```

### 7.2 直接指定加速域名

也可以用显式镜像名称测试：

```bash
sudo docker run --rm docker.m.daocloud.io/library/hello-world:latest
```

这种写法与配置 registry-mirrors 不完全相同：显式地址会体现在本地镜像名称中。配置加速器后继续使用 `hello-world` 则保留原来的 Docker Hub 镜像名称。

公共加速服务的可用性、覆盖范围、限流和访问规则会变化。本文记录的是本次成功使用的地址，不保证长期可用。

### 7.3 两种“源”不是一回事

| 配置 | 负责什么 |
| --- | --- |
| `/etc/apt/sources.list.d/docker.sources` | apt 下载 Docker 软件包，安装引擎 |
| `/etc/docker/daemon.json` 的 registry-mirrors | Docker 引擎拉取 Docker Hub 容器镜像 |

apt 下载顺利不意味着 Docker Hub 就能访问；修改 Ubuntu apt 镜像源也不会自动改变 Docker 镜像下载路径。

## 8. 镜像有了，为什么 docker ps 没有容器

```bash
sudo docker images
sudo docker ps
sudo docker ps -a
```

| 命令 | 查看内容 |
| --- | --- |
| docker images | 本地镜像 |
| docker ps | 当前正在运行的容器 |
| docker ps -a | 所有保留的容器，包括已经退出的 |

hello-world 打印结束就退出，所以通常不出现在 `docker ps` 中。没有 `--rm` 时，可在 `docker ps -a` 看到 Exited；有 `--rm` 时，退出后容器已删除，也不会出现在 `-a` 列表。

关键点：容器的存活与主进程有关。Web 服务持续监听请求，主进程持续运行，容器就继续运行。`-d` 只是让客户端不占用当前终端，不会把一个已经结束的程序变成永久服务。

## 9. 用 Nginx 运行第一个持续提供服务的容器

```bash
sudo docker run -d \
  --name nginx-study \
  -p 8080:80 \
  nginx:stable-alpine
```

| 参数 | 解释 |
| --- | --- |
| run | 创建并启动一个新容器 |
| -d | 后台运行，终端返回容器 ID |
| --name nginx-study | 指定容器名称，便于后续操作 |
| -p 8080:80 | 宿主机 8080 端口映射到容器 80 端口 |
| nginx | 镜像名称 |
| stable-alpine | 镜像标签，使用基于 Alpine 的 stable 系列变体 |

在 Ubuntu 浏览器访问：

```text
http://localhost:8080
```

在 Windows 访问需要使用 Ubuntu 的可达 IP。例如桥接网络下可能是：

```text
http://192.168.8.112:8080
```

如果 VirtualBox 使用 NAT，Windows 访问虚拟机还可能需要虚拟机端口转发；桥接、NAT、宿主机防火墙会影响可达性。本次最终截图已经验证 Windows 能通过局域网 IP 访问 Ubuntu。

### 常用管理命令

```bash
sudo docker ps
sudo docker logs nginx-study
sudo docker logs -f nginx-study
sudo docker exec -it nginx-study sh
```

`logs` 读取容器标准输出和标准错误日志；`-f` 持续跟踪，Ctrl+C 结束跟踪，不会因此停止后台容器。

`exec` 在已经运行的容器内执行额外命令；`-i` 保持标准输入，`-t` 分配终端。Alpine 通常提供 sh，不应默认它一定有 bash。

进入后可以查看：

```sh
ls /usr/share/nginx/html
cat /etc/nginx/conf.d/default.conf
exit
```

这里 `exit` 退出额外启动的 shell，不会停止 Nginx 主进程。

```bash
sudo docker stop nginx-study
sudo docker start nginx-study
sudo docker restart nginx-study
```

stop 停止，start 启动原有容器，restart 重启原有容器。`docker run` 每次创建新容器，不能把它当成 start 的同义词；名称重复会报冲突。

## 10. 绑定挂载：让 Nginx 显示自己的页面

最初的练习：

```bash
mkdir -p "$HOME/docker-study"
echo '<meta charset="UTF-8"><h1>Hello Docker!</h1>' > "$HOME/docker-study/index.html"
```

`mkdir -p` 创建目录及必要的父目录，已存在时不报错。`>` 写入文件并覆盖原内容，使用前确认路径。

本次后来换成实际前端构建产物目录：

```bash
sudo docker run -d \
  --name nginx-study \
  -p 8080:80 \
  --mount "type=bind,source=/home/shufei-han/PRAC/public,target=/usr/share/nginx/html,readonly" \
  nginx:stable-alpine
```

如果同名练习容器仍存在，要先停掉并删除它，再执行上述 run。

挂载参数：

| 参数 | 含义 |
| --- | --- |
| type=bind | 绑定宿主机上指定的路径 |
| source | Ubuntu 上的源目录，必须真实存在 |
| target | 容器内让应用看到的路径 |
| readonly | 禁止容器通过此挂载写入宿主机内容 |

Nginx 默认从 `/usr/share/nginx/html` 提供网页。挂载后，容器看到的是宿主机目录内容，镜像原目录下的文件被暂时遮住，并没有因此被修改或删除。

修改宿主机页面文件后，刷新通常就能看到变化，不必重建镜像。浏览器缓存和资源文件名也可能影响观察结果，需要时强制刷新。

删除容器不会删除这个宿主机目录中的文件。相反，如果把重要数据只写进容器自己的可写层，删除容器会丢失这些内容。

## 11. 怎么修改名称、端口、挂载

### 11.1 名称可以直接改

```bash
sudo docker rename nginx-study my-nginx
```

改名不重启容器。后续 logs、stop 等命令使用新名称。

本文后面的例子统一使用 `nginx-study`。如果练习中改过名，替换为自己的实际名称，或再 rename 回来。

### 11.2 端口映射需要重新创建

```bash
sudo docker stop nginx-study
sudo docker rm nginx-study
```

```bash
sudo docker run -d \
  --name nginx-study \
  -p 9090:80 \
  --mount "type=bind,source=/home/shufei-han/PRAC/public,target=/usr/share/nginx/html,readonly" \
  nginx:stable-alpine
```

`9090:80` 左边是 Ubuntu 端口，右边是容器内服务监听端口。改左边后浏览器访问端口跟着改；不能只随意改右边而不调整 Nginx listen。

端口、绑定挂载等容器创建配置，通常通过重新创建容器更新。`docker restart` 不会读取一条新的 run 命令来改变它们。

但已挂载目录里的页面内容可直接更新；已挂载的 Nginx 配置内容更新后可通过 reload 生效。这是文件内容改变，与容器的挂载配置改变不同。

## 12. 为什么构建后还要配置反向代理

开发时 `/api` 和 `/ws` 由 Vite 转发。构建产物只有静态 HTML、JS、CSS 等，不包含一个继续运行的 Vite 代理。

前端继续使用相对 API 地址，例如：

```text
/api/login
/api/auth/check
```

浏览器因此请求当前站点的 Nginx，再由 Nginx 转发后端。前端现有 HttpService 封装不需要换成 fetch，也不需要把所有地址写死到 4004。

WebSocket 根据当前页面地址建立同源连接：

```text
HTTPS 页面 → wss://当前域名或IP/ws
HTTP 页面  → ws://当前域名或IP/ws
```

这样浏览器只接触前端站点入口，不需要单独直连后端端口。

## 13. 第三个坑：容器里的 localhost 不是 Ubuntu

在 Ubuntu 原生进程中，`https://localhost:4004` 可以访问 Ubuntu 后端。但在 Nginx 容器中，localhost 指向 Nginx 容器自身，容器里没有这个 Node 后端。

因此给容器添加一个宿主机地址别名：

```bash
--add-host host.docker.internal:host-gateway
```

Linux Docker 会将这个主机名映射到宿主机网关地址，然后 Nginx 使用：

```text
https://host.docker.internal:4004
```

这不是把 Node 放入容器，也不是浏览器要请求这个特殊域名。它只用于 Nginx 容器到宿主机这一跳。

后端需要监听可从 Docker 网桥到达的地址。本项目监听 `0.0.0.0:4004`，符合本次要求。如果只监听 127.0.0.1，走宿主机网关地址可能连接失败。Ubuntu 防火墙也不能拦截这条必要的容器到宿主机连接。

## 14. 先验证 HTTP 入口的反向代理

创建配置目录和文件：

```bash
mkdir -p /home/shufei-han/PRAC/nginx
nano /home/shufei-han/PRAC/nginx/default.conf
```

第一阶段配置：

```nginx
server {
    listen 80;
    server_name localhost;

    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files $uri $uri/ =404;
    }

    location /api/ {
        proxy_pass https://host.docker.internal:4004;
        proxy_set_header Host $host;
        proxy_ssl_verify off;
    }

    location /ws {
        proxy_pass https://host.docker.internal:4004;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_ssl_verify off;
        proxy_read_timeout 3600s;
    }
}
```

重新创建容器：

```bash
sudo docker stop nginx-study
sudo docker rm nginx-study

sudo docker run -d \
  --name nginx-study \
  -p 80:80 \
  --add-host host.docker.internal:host-gateway \
  --mount "type=bind,source=/home/shufei-han/PRAC/public,target=/usr/share/nginx/html,readonly" \
  --mount "type=bind,source=/home/shufei-han/PRAC/nginx/default.conf,target=/etc/nginx/conf.d/default.conf,readonly" \
  nginx:stable-alpine
```

测试：

```bash
sudo docker exec nginx-study nginx -t
curl -i http://localhost/api/auth/check
```

`nginx -t` 校验配置和相关文件是否可加载，不替代真实请求测试。`curl -i` 同时显示响应头和响应体。

未携带登录会话时，该接口返回 401 是预期行为，说明请求已经到达后端并被后端判定为未登录。502 则表示 Nginx 到上游的连接/处理出现问题，需要查看日志。

## 15. 解释 Nginx 里的关键配置

### 静态页面与 Hash 路由

`root` 指定静态资源目录，`index` 指定目录默认文件。

`try_files $uri $uri/ =404`：依次找文件和目录，找不到返回 404。本项目使用 `/#/login` 这种 Hash 路由，`#` 后面的部分由浏览器处理，不会发给 Nginx，所以不需要为 `/login` 配一个服务端路由回退。

如果以后改为 History 路由，才需要评估类似 `try_files $uri $uri/ /index.html` 的回退规则，同时保留 API 路径独立处理。

### proxy_pass 后面有没有斜杠

本次：

```nginx
location /api/ {
    proxy_pass https://host.docker.internal:4004;
}
```

没有附加 URI 部分，所以 `/api/login` 保留为后端的 `/api/login`。

若改成 `proxy_pass https://host.docker.internal:4004/;`，在该 location 的常规行为下，匹配的 `/api/` 前缀会被 `/` 替换，可能变成后端 `/login`，与项目接口路径不符。

### WebSocket 为什么需要额外配置

WebSocket 建连先发送 HTTP 握手，再升级协议：

```nginx
proxy_http_version 1.1;
proxy_set_header Upgrade $http_upgrade;
proxy_set_header Connection "upgrade";
```

这里显式使用 HTTP/1.1，并将升级协议需要的请求头传给上游。浏览器 Network 中看到 101 Switching Protocols，表示升级握手成功。

`proxy_read_timeout 3600s` 延长 Nginx 等待上游数据的超时时间，适用于本次长连接练习；它不是保证任何情况下都不断线的设置，应用仍需要处理连接断开。

### proxy_ssl_verify off 是哪一段

它只影响 Nginx 作为客户端访问 HTTPS 后端时是否验证上游证书。本次后端使用本地自签名证书，因此显式关闭上游校验以便开发测试。

它不会让浏览器信任 Nginx 的证书，也不会把 HTTP 入口变成 HTTPS。生产环境可以配置可信上游 CA 和对应校验，而不是直接照搬开发设置。

## 16. 第四个坑：页面能打开，登录 Cookie 却出问题

项目登录使用服务端会话。登录成功后后端设置 session Cookie，相关属性包含：

```text
HttpOnly
Secure
SameSite=Lax
Path=/
```

| 属性 | 含义 |
| --- | --- |
| HttpOnly | 浏览器页面脚本不能通过 document.cookie 读取该 Cookie，但浏览器仍可按规则随请求发送 |
| Secure | Cookie 用于安全连接，通常要求 HTTPS；localhost 有浏览器特殊规则，不应依赖它部署 |
| SameSite=Lax | 对跨站携带 Cookie 的场景施加限制，不是 CORS 配置 |
| Path=/ | Cookie 适用整个站点路径范围 |

当时入口是 `http://...`，Nginx 到后端是 `https://...`。后端链路已经加密，但浏览器看到的仍是 HTTP 站点，因此不能据此认为 Secure Cookie 已满足浏览器使用条件。

表现可能是登录接口响应成功，但 Cookie 被阻止保存或没有在后续请求中发送，`/api/auth/check` 仍判定未登录。浏览器版本和 localhost 特殊处理会影响具体表现。

本次解决方式：保留登录 Cookie 设置，给浏览器到 Nginx 这一段也加 HTTPS。

此外，`localhost` 和 `192.168.8.112` 是两个不同主机，它们的 Cookie、权限和浏览器存储分别管理，不能认为一个地址登录后另一个地址也自动登录。Cookie 不按端口隔离，但整个浏览器 origin 还包含协议和端口，不能把 Cookie 作用域与 origin 混为一谈。

## 17. 最终配置：Nginx HTTPS + API + WebSocket

### 17.1 复制证书

在项目根目录执行：

```bash
mkdir -p /home/shufei-han/PRAC/nginx/certs

cp .certs/dev-cert.pem .certs/dev-key.pem \
  /home/shufei-han/PRAC/nginx/certs/
```

这一步是复制，不是自动同步。以后项目证书重新生成，要再次复制，并 reload/restart Nginx。私钥不应提交到 Git 或分享给其他人。

### 17.2 最终 default.conf

文件位置：

```text
/home/shufei-han/PRAC/nginx/default.conf
```

内容：

```nginx
# 当前假定宿主机的标准 HTTPS 端口为 443。
server {
    listen 80;
    server_name localhost;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name localhost;

    ssl_certificate     /etc/nginx/certs/dev-cert.pem;
    ssl_certificate_key /etc/nginx/certs/dev-key.pem;

    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files $uri $uri/ =404;
    }

    location /api/ {
        proxy_pass https://host.docker.internal:4004;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_ssl_verify off;
    }

    location /ws {
        proxy_pass https://host.docker.internal:4004;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_ssl_verify off;
        proxy_read_timeout 3600s;
    }
}
```

新增配置解释：

| 配置 | 作用 |
| --- | --- |
| listen 443 ssl | Nginx 在容器 443 端口提供 TLS 服务 |
| ssl_certificate | 服务端证书路径，路径属于容器视角 |
| ssl_certificate_key | 证书对应私钥路径，路径属于容器视角 |
| return 301 ... | HTTP 请求永久重定向到 HTTPS |
| $host | 当前请求主机名或 IP，这里没有拼接自定义 HTTPS 端口 |
| $request_uri | 保留请求路径与查询参数；Hash 部分由浏览器处理 |
| X-Forwarded-Proto $scheme | 告诉后端入口协议，本例是 https；后端是否信任/使用该头取决于应用配置 |

当前只有一个 HTTPS server，所以通过局域网 IP 访问也会进入它；`server_name localhost` 本身不负责让 IP 证书通过校验。浏览器校验证书仍要匹配访问地址的 SAN。

若以后把宿主机 HTTPS 映射成 `8443:443`，这个跳转也要相应调整为包含 8443，不能只改 docker 的端口映射而继续假定外部是 443。

### 17.3 最终 docker run

```bash
sudo docker stop nginx-study
sudo docker rm nginx-study

sudo docker run -d \
  --name nginx-study \
  -p 80:80 \
  -p 443:443 \
  --add-host host.docker.internal:host-gateway \
  --mount "type=bind,source=/home/shufei-han/PRAC/public,target=/usr/share/nginx/html,readonly" \
  --mount "type=bind,source=/home/shufei-han/PRAC/nginx/default.conf,target=/etc/nginx/conf.d/default.conf,readonly" \
  --mount "type=bind,source=/home/shufei-han/PRAC/nginx/certs,target=/etc/nginx/certs,readonly" \
  nginx:stable-alpine
```

最终三组挂载：

| Ubuntu 路径 | 容器路径 | 用途 |
| --- | --- | --- |
| /home/shufei-han/PRAC/public | /usr/share/nginx/html | 前端构建产物 |
| /home/shufei-han/PRAC/nginx/default.conf | /etc/nginx/conf.d/default.conf | Nginx 站点配置 |
| /home/shufei-han/PRAC/nginx/certs | /etc/nginx/certs | HTTPS 证书和私钥 |

全部只读挂载，容器可以读取宿主机更新后的文件，但不能通过该挂载写回修改。`readonly` 不代表宿主机自己也不能修改。

### 17.4 验证

```bash
sudo docker ps
sudo docker exec nginx-study nginx -t
sudo docker logs --tail 100 nginx-study
curl -k -i https://localhost/api/auth/check
```

`curl -k` 仅用于本地测试时跳过证书验证，不能让浏览器自动信任证书，也不应用作生产客户端的默认设置。

浏览器测试顺序：

1. Ubuntu 打开 `https://localhost`；Windows 打开 Ubuntu 的可达 IP，例如 `https://192.168.8.112`。
2. 为开发证书处理本机信任。局域网 IP 必须在证书 SAN 中。
3. 使用不同账号登录两个浏览器会话。
4. Network 查看登录请求的 Set-Cookie，以及后续请求是否带 Cookie。
5. `/api/auth/check` 登录后应返回当前用户信息；不带会话返回 401。
6. `/ws` 应看到 101 和已建立的 WebSocket 连接。
7. 测试聊天与视频通话、设备开关、挂断释放。

本次最终截图中，局域网与 localhost 两端均登录成功，视频与计时显示正常，WebSocket 为 101。

## 18. HTTPS 的“不安全”与摄像头权限

自签名证书可以建立加密连接，但浏览器未必信任证书来源，地址栏仍可能显示“不安全”。加密、身份可信、浏览器认定安全上下文是相关但不同的条件。

摄像头与麦克风 API 通常需要安全上下文。localhost 有特殊待遇，但普通局域网 IP 的 HTTP 页面不应依赖这类例外；应使用匹配访问地址且被设备信任的证书。

本次已实际完成媒体采集与视频通话，说明当前浏览器环境已允许使用。以后手机或其他电脑访问时，要在对应设备上重新处理证书信任和站点权限，不能只在 Ubuntu 上信任一次就认为所有设备都已信任。

## 19. 配置修改后，到底 reload、restart 还是重新创建

| 改动 | 通常怎么处理 |
| --- | --- |
| 改容器名称 | docker rename |
| 改宿主机端口映射 | 重新创建容器 |
| 新增或修改挂载 source/target | 重新创建容器 |
| 新增 --add-host | 重新创建容器 |
| 修改挂载目录中的静态页面 | 刷新浏览器，必要时处理缓存 |
| 修改已有挂载中的 Nginx 配置内容 | 校验后 reload |
| 替换证书内容 | 确认证书和私钥匹配，然后校验并 reload |
| 改 /etc/docker/daemon.json | 重启 Docker 服务，不是只 reload Nginx |

常规 Nginx 更新：

```bash
sudo docker exec nginx-study nginx -t
```

只有校验成功后再执行：

```bash
sudo docker exec nginx-study nginx -s reload
```

`reload` 通常平滑加载新配置；`restart` 会重启容器内主进程，可能影响现有连接。本次长连接场景还应观察 WebSocket 重连行为。

注意：单个文件的 bind mount 可能因宿主机编辑器采用“替换文件”的保存方式而仍指向旧文件内容。若宿主机文件已更新、容器里查看却没变，可以重建容器；后续也可考虑挂载整个配置目录，并确保其中所有配置文件可控。

## 20. 常见报错对照与排查顺序

| 现象 | 优先检查 |
| --- | --- |
| NO_PUBKEY | 公钥下载、Signed-By 路径、可读权限、网络返回内容 |
| 拉镜像 i/o timeout | 仓库网络、镜像加速器配置和服务可用性 |
| docker ps 没有 hello-world | 程序是否已经退出，是否用了 --rm |
| container name already in use | 旧容器是否存在，使用 start 或先停止删除 |
| port is already allocated / address already in use | 宿主机相应端口是否被其他进程/容器占用 |
| bind source path does not exist | source 路径是否在 Ubuntu 上真实存在 |
| Nginx 启动后立即退出 | docker logs，配置语法、证书路径与权限 |
| 403 / 404 静态页面 | root、挂载内容、index.html、文件权限、资源路径 |
| API 404 | location 匹配、proxy_pass 尾斜杠、接口路径 |
| API 502 | 后端是否启动、监听地址、宿主机网关、端口、防火墙、上游 TLS 日志 |
| 登录成功后又回登录页 | Cookie 保存/发送、Secure、访问主机变化、会话是否过期或后端重启 |
| WebSocket 无法升级 | /ws 转发、HTTP/1.1、Upgrade 和 Connection 头 |
| HTTPS 证书错误 | SAN 是否匹配地址、证书是否可信、是否过期、是否复制了旧证书 |
| 摄像头不可用 | 安全上下文、站点权限、设备占用、系统权限 |

排查顺序建议从外到内，或按日志缩小范围，不要一有问题就重装 Docker：

```bash
# 容器是否运行，端口映射是什么
sudo docker ps -a

# Nginx 最近的错误
sudo docker logs --tail 100 nginx-study

# Nginx 配置是否有效
sudo docker exec nginx-study nginx -t

# Ubuntu 本机后端是否可响应
curl -k -i https://localhost:4004/api/auth/check

# Ubuntu 经 Nginx 代理后是否可响应
curl -k -i https://localhost/api/auth/check

# Ubuntu 上实际监听哪些 TCP 端口
sudo ss -lntp
```

未登录检查返回 401 是业务层拒绝，不是连接失败。502、连接拒绝、超时属于不同层面的线索。

## 21. 重启机器与数据保留

当前 docker run 没有指定 restart policy。`systemctl enable docker` 只保证 Docker 服务开机启动，不自动保证每个容器都开机运行。

如果只想给现有 Nginx 容器增加自动重启策略，可以执行：

```bash
sudo docker update --restart unless-stopped nginx-study
```

这是可选的后续完善，并非本次截图已验证的既有配置。Ubuntu 原生 Node 后端同样需要独立启动管理；Nginx 自动运行不代表后端也自动运行。

当前后端数据仍由 Ubuntu 上的 Node 读写项目 `server/db`，没有迁入 Docker。删除 Nginx 容器不会影响这份后端数据，也不会删除 bind mount 的宿主机页面、配置和证书。

后端会话保存在内存中，后端重启后需要重新登录。这与 Cookie 是否曾经保存成功是两回事。

## 22. 本次学习要点与下一步

已经实际完成：

1. Ubuntu 原生启动项目，理解 Bash 与 PowerShell 脚本差异。
2. 安装 Docker Engine，区分客户端和后台引擎。
3. 排查 apt 公钥校验与镜像仓库连接问题。
4. 通过 hello-world 理解镜像下载、容器创建、运行和退出。
5. 运行 Nginx，理解宿主机端口和容器端口映射。
6. 绑定挂载前端构建产物、Nginx 配置和证书。
7. 修改名称、端口，理解重启与重新创建的区别。
8. 通过宿主机网关代理原生后端，理解容器 localhost。
9. 配置 API、WebSocket 和 HTTPS，解决 Secure Cookie 问题。
10. 在 Windows 与 Ubuntu 两端实际完成登录和视频通话。

适合下一步学习：先把当前长 docker run 命令转成 Compose 文件，继续保持后端原生运行；熟悉配置更新与持久化后，再为后端编写 Dockerfile。后端入容器后，需要重新设计服务间地址和数据挂载，不能照搬“容器访问宿主机”的地址。

当前是开发学习环境。进入公网生产部署前，还需要单独评估可信证书、应用鉴权、用户数据、TURN、自动启动与备份等事项；本次完成的范围是上述局域网部署链路。

## 23. 参考资料

- Docker Engine Ubuntu 安装：https://docs.docker.com/engine/install/ubuntu/
- Docker CLI run：https://docs.docker.com/reference/cli/docker/container/run/
- Bind mounts：https://docs.docker.com/engine/storage/bind-mounts/
- Docker 网络：https://docs.docker.com/engine/network/
- Nginx WebSocket 代理：https://nginx.org/en/docs/http/websocket.html
- DaoCloud 公共镜像加速项目：https://github.com/DaoCloud/public-image-mirror

参考链接用于后续查阅；本文是本次操作与排障记录，公共镜像服务和软件版本规则应以实际使用时的文档为准。
