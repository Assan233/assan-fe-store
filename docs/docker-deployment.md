# NAS Docker Compose 部署

本项目通过前端仓库根目录的 `compose.yaml` 统一部署：`web` 容器提供页面并代理 `/api/`、`/music/`，`api` 容器运行后端，命名卷 `assan-data` 保存 SQLite 数据。两者属于同一个 Compose 项目，不需要分别启动。以下命令在 NAS 的 SSH 终端执行。

## 准备

1. 在 NAS 上安装 Docker Engine 和 Docker Compose v2，并确保 NAS 能下载 Docker 基础镜像及构建依赖。
2. 将前后端两个仓库放在**同一个父目录**，例如：

   ```text
   /volume1/docker/assan/
   ├── assan-fe-store/
   │   └── compose.yaml
   └── assan-server-store/
       └── Dockerfile
   ```

   可分别克隆仓库，也可从开发机复制完整源码。`compose.yaml` 中后端构建路径为 `../assan-server-store`，因此不能只上传前端目录。后续命令均在 `assan-fe-store` 目录运行；更新时也保持相同目录和 Compose 项目名，以沿用原有数据卷。

3. 确定 HTTPS 入口：建议由 NAS 自带的反向代理或已有的网关提供域名和 TLS 证书。默认 `web` 发布到 NAS 宿主机的 `127.0.0.1:3280`（容器端口 8080），`api` 发布到 `127.0.0.1:3290`（容器端口 9090），均不向局域网直接开放。站点入口应指向 `web`，不要直接公开 `api`。

## 配置环境变量

在 NAS 的 `assan-fe-store` 目录：

```sh
cp .env.example .env
openssl rand -base64 32
```

编辑 `.env`，把生成的密钥填入 `MUSIC_CREDENTIAL_KEY`；用于 HTTPS 部署时配置如下：

```dotenv
BIND_ADDRESS=127.0.0.1
HOST_PORT=3280
API_HOST_PORT=3290
SECURE_COOKIES=true
MUSIC_CREDENTIAL_KEY=在这里填写生成的密钥
```

`MUSIC_CREDENTIAL_KEY` 必须是 Base64 编码的 **32 字节随机值**；填写任意短字符串会导致后端启动失败。它用于加密每个用户保存的飞牛音乐账号，更新或迁移部署时必须保持原值。若从已有安装迁移数据，也要沿用原安装的密钥。妥善保管 `.env`，不要提交到 Git，也不要在部署后重新生成密钥。仅在不经过 HTTPS 的本地测试中才将 `SECURE_COOKIES` 设为 `false`。已有 `.env` 不会随 `.env.example` 自动更新：升级时需手动设置 `HOST_PORT=3280` 和 `API_HOST_PORT=3290`，并将 NAS 反向代理目标端口从 8080 改为 3280。

## 构建与启动

在 `assan-fe-store` 目录运行：

```sh
docker compose config --quiet
docker compose up -d --build
docker compose ps
docker compose logs --tail=100 web api
```

首次构建需要下载 Node、Nginx、Go 等基础镜像及项目依赖。`config --quiet` 校验 Compose 配置，不输出包含环境变量值的完整配置。用以下命令在 NAS 宿主机检查前端与后端代理是否响应：

```sh
curl -I http://127.0.0.1:3280/
curl http://127.0.0.1:3280/api/v1/ping
curl http://127.0.0.1:3290/healthz
```

第二条请求应返回包含 `"message":"pong"` 的 JSON，第三条用于检查直接映射的后端健康状态。若修改了 `HOST_PORT` 或 `API_HOST_PORT`，相应替换检查命令中的端口。

## 配置 HTTPS 反向代理

将域名的 HTTPS 入口转发到 NAS 宿主机 `http://127.0.0.1:3280`。反向代理需要：

- 保留请求的原始路径与查询参数，使 `/api/`、`/music/` 能到达前端 Nginx；传递客户端的 `Host`。
- **覆盖**入站 `X-Real-IP` 为真实客户端 IP，不能信任客户端自行提供的该头；后端认证限流使用它。
- 转发 `Range` 请求头以支持音频分段请求，并允许 WebSocket 升级。
- 对外使用 HTTPS，保持 `.env` 中 `SECURE_COOKIES=true`。

如果 NAS 反向代理也运行在另一个容器中，其 `127.0.0.1` 指向代理容器自身，不能直接访问上面的宿主机监听地址。可将代理接入同一 Docker 网络并访问 `web:8080`；或将 `BIND_ADDRESS` 改成 NAS 可访问的网卡地址，仅允许反向代理访问 3280、3290 端口。不要将 `api:9090` 作为站点入口，否则页面及 `/music/` 代理无法使用。变更 `BIND_ADDRESS` 会同时改变前后端的宿主机监听地址。

确认 HTTPS 站点可访问后，**先由部署者完成首次「设置管理员」**，再向其他人开放访问。安装后没有公开注册，管理员在「用户管理」中创建其他账号。

## 更新、备份与排查

- **更新**：拉取或复制两个仓库的新代码，保持原 `.env` 和 Compose 项目目录，然后在前端目录运行 `docker compose up -d --build`。使用 `docker compose ps`、`docker compose logs --tail=100 web api` 检查运行状态。
- **备份**：定期备份 Compose 命名卷 `assan-data`（其中有 `/data/assan.db`）及单独安全保存的 `.env` 密钥。数据库备份应在停止写入后进行，或采用可靠的 SQLite 在线备份方案。`docker compose down` 保留命名卷；`docker compose down -v` 会删除数据卷，不能用于常规更新。
- **站点可打开但无法登录**：检查域名是否使用 HTTPS、`SECURE_COOKIES` 设置、`/api/` 路径和后端日志。
- **音乐工具无法使用**：确认 NAS 能访问 `https://www.assanye.top:66/music/`，检查密钥是否与保存凭据时一致，并查看 `web`、`api` 日志。上游播放器脚本经本站同域代理运行；只在信任该服务时启用音乐集成。
- **管理员忘记密码**：在前端目录运行 `docker compose exec -it api /usr/local/bin/reset-password USERNAME`，按提示输入新密码。

### 构建时报 `docker.fnnas.com` 返回 401

若错误为 `failed to resolve source metadata for docker.io/docker/dockerfile:1`，并显示 `https://docker.fnnas.com/...: 401 Unauthorized`，失败发生在拉取 Dockerfile 的构建语法镜像阶段，还没有开始编译本项目。两个 Dockerfile 的首行 `# syntax=docker/dockerfile:1` 会触发该镜像拉取；镜像请求被 NAS 配置的 `docker.fnnas.com` 镜像加速源转发并拒绝。日志中 `failed to read current commit information` 的警告与此失败无关。

1. 在 **NAS 本机**检查 Docker Engine 的镜像源配置并复现拉取：

   ```sh
   docker info
   docker pull docker/dockerfile:1
   ```

2. 若 Docker Engine 配置了 `docker.fnnas.com` 作为 registry mirror，在 NAS 的 Docker 管理界面将其更换为可正常访问且允许拉取 Docker Hub 镜像的源，或移除该镜像源以直连 Docker Hub。按 NAS 的管理方式让 Docker Engine 重新加载配置，再次执行 `docker pull docker/dockerfile:1`；不需要修改应用的 `.env` 或执行 `docker login` 登录应用。
3. 拉取成功后，在前端仓库目录重新运行 `docker compose up -d --build`。如果接着在 `node:22-alpine`、`golang:1.26-alpine`、`nginx:1.29-alpine` 或 `alpine:3.23` 处出现类似错误，仍需排查同一镜像源或 NAS 对 Docker Hub 的网络连通性。

### 构建时报 `proxy.golang.org` 连接超时

如果后端在 `RUN go mod download` 阶段报 `dial tcp ...:443: i/o timeout`，表示**构建容器**无法访问默认 Go 模块代理 `proxy.golang.org`。这与 Docker 基础镜像拉取是两条网络路径；同一批构建中前端的 `pnpm install` 显示 `CANCELED` 是后端构建失败后的取消，不代表前端依赖有错。

先在 NAS 上检查可用的 Go 模块代理，确保构建容器可以连接（此示例使用公开镜像 `goproxy.cn`）：

```sh
docker run --rm golang:1.26-alpine sh -c 'GOPROXY=https://goproxy.cn go mod download -json github.com/dustin/go-humanize@v1.1.0'
```

成功后，在前端仓库的 `.env` 中添加 `GO_MODULE_PROXY=https://goproxy.cn`，从前端目录执行 `docker compose up -d --build`。此变量仅传入后端**构建阶段**，不会传入运行时容器；默认仍使用 Go 的 `https://proxy.golang.org,direct`。保持 Go 模块校验开启（不要设置 `GOSUMDB=off`）。如果示例代理同样超时，请选择 NAS 构建容器能访问的 HTTPS Go 模块镜像或修复 NAS 的 Docker 容器 DNS/出口网络，再重试；设置主机上的 `GOPROXY` 不会自动影响 Docker 构建。
