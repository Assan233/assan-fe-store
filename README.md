# Assan 应用库

个人效率工具集的 React 前端，配套 API 位于 `../assan-server-store`。认证用户可访问应用首页和工具；可用工具提供入口，规划中的工具标记为预览。

## M4A 转 FLAC

转换完成后可勾选多个结果或全选，点击「打包选中」生成 ZIP，再下载压缩包；也可逐个下载 FLAC。重名文件在 ZIP 内自动添加编号。打包完全在浏览器进行，会额外占用内存，大批量文件建议分批下载。

登录后从首页「音频」分类打开工具，或访问 `/tools/m4a-to-flac`。支持多选 M4A 文件，点击开始转换后顺序处理，每个文件单独显示进度、错误和 FLAC 下载入口。单个文件失败不影响后续文件；取消保留已完成结果，再次开始只处理未完成的文件。重新选择会替换列表并释放已有下载链接，请先下载结果。

- 使用单线程 ffmpeg.wasm Worker，支持 M4A 中的 AAC/ALAC，转换第一条音轨，复制内嵌封面及标题、歌手、专辑等常见标签；格式专有标签可能无法完整迁移。AAC 转 FLAC 不会提升原始音质。
- 音频完全在浏览器内存中处理，不上传；引擎由站点自身提供，无运行时 CDN 依赖。首次加载约 32 MB，工具路由按需加载，无需 SharedArrayBuffer 或跨源隔离头。
- 单文件限制 100 MiB；长音频仍可能超出设备内存，手机建议使用更小的文件。取消或离开页面会终止 Worker，下载链接在更换文件或离开页面时释放。
- 引擎依赖 `@ffmpeg/core` 0.12.10（GPL-2.0-or-later），发布包含引擎的镜像时需遵守其许可证；源码与构建脚本见 https://github.com/ffmpegwasm/ffmpeg.wasm/tree/v0.12.10 。

## 飞牛音乐

登录应用库后从首页「音频」分类进入 `/tools/music`。首次使用点击「音乐账号设置」，填写你自己的飞牛音乐账号；以后进入该页面会在全屏 iframe 中尝试自动登录。可以随时更换或删除保存的账号。播放和曲库依赖 `https://www.assanye.top:66/music/` 可访问；尚未使用真实账号验证自动登录与播放，若上游登录页面改版，可能需要更新 `public/music-login.js`。

音乐页面经本站 `/music/` 同域代理，HTML 注入本站维护的 `public/music-custom.css` 与自动登录脚本。Nginx 对播放器资源逐次校验应用库会话，只向上游转发 `music-token` Cookie；音频由 Nginx 直接转发并支持长连接，不经 API 内存缓存。账号按应用库用户分别加密保存于后端 SQLite，密钥单独通过环境变量提供，浏览器只在登录时从同源 API 临时读取凭据，密码不写入浏览器存储。**同域代理意味着飞牛播放器脚本与应用库页面共享浏览器源权限**；只在信任该播放器服务时启用此集成。

## 技术栈

- React + TypeScript（strict）+ Vite
- React Router、Tailwind CSS v4、Lucide icons
- Vitest + Testing Library
- 同源 `/api` 请求；开发时 Vite 代理到后端，Docker 部署由 Nginx 代理 API

要求 Node.js 22.12+、pnpm 8+（项目固定使用 pnpm 8.15.9）。

## 本地开发

```sh
pnpm install
pnpm dev
```

默认将 `/api` 代理到 `http://localhost:8080`，`/music` 代理到飞牛音乐。先启动 `../assan-server-store`，或设置 `VITE_API_PROXY_TARGET` 覆盖 API 目标。本地测试音乐账号时，先设置后端 `MUSIC_CREDENTIAL_KEY`；Vite 开发代理只供本机调试，正式访问控制由生产 Nginx 执行。

```sh
pnpm lint
pnpm test
pnpm build
```

## Docker / NAS

完整的 NAS 部署、HTTPS 反向代理、验证和备份步骤见 [Docker Compose 部署文档](docs/docker-deployment.md)。从前端仓库根目录启动完整应用和相邻后端：

```sh
cp .env.example .env
# 在 .env 中填写由 openssl rand -base64 32 生成的 MUSIC_CREDENTIAL_KEY
# 本地 HTTP 测试时编辑 .env，将 SECURE_COOKIES 改为 false
docker compose config --quiet
docker compose up -d --build
```

Compose 默认将 `web` 映射到 NAS 本机 `127.0.0.1:28080`（容器端口 8080），`api` 映射到 `127.0.0.1:29090`（容器端口 9090）；外部站点入口应转发到前端 28080。`HOST_PORT`、`API_HOST_PORT` 可分别覆盖宿主机端口，`BIND_ADDRESS` 仅控制前端绑定地址，后端始终仅绑定宿主机回环地址；已有 `.env` 需同步修改，单独修改 `.env.example` 不会改变实际部署。请将 NAS 反向代理配置为覆盖 `X-Real-IP` 并填入真实客户端 IP；前端 Nginx 将该值传给隔离的后端容器供认证限流使用。NAS 代理必须保留 `/music/`、`/api/` 原始路径及 Range 请求头，并允许 WebSocket 升级（如播放器使用）。后端 SQLite 数据写入 `assan-data` Docker volume。生产部署保留 `SECURE_COOKIES=true`；本地 HTTP 测试需改为 `false`。保管好 `.env` 中的密钥，**更换或丢失密钥后已有音乐密码无法解密，需重新保存**。

### 本机账号管理

账号及 Argon2id 密码哈希保存在 NAS 的数据卷中，验证由本机 API 完成，不依赖外部认证服务；各设备连接同一个 NAS 即可共享账号。更新镜像保留账号，请保留数据卷。

- 空安装首次访问自动进入「设置管理员」，创建后关闭初始化入口；没有公开注册。
- 管理员可在「用户管理」添加、禁用、启用、删除子账号或重置密码。禁用、删除、重置会撤销子账号的所有会话。
- 子账号可以使用全部工具，在账户设置修改自己的密码，不能访问用户管理。
- 管理员忘记密码可使用 `docker compose exec -it api /usr/local/bin/reset-password USERNAME`，输入不会回显。
- 首次初始化应由部署者在开放 NAS 访问前完成。已有安装升级及清空旧账号的步骤见 `../assan-server-store/docs/api.md`，更新镜像本身不会清空数据。

## 项目结构

```text
src/
  app/         路由与认证边界
  components/  应用壳和共享 UI
  features/    登录、管理员初始化、账户设置与本地音频转换
  lib/         API 客户端
  pages/       首页、用户管理和工具页面
  test/        测试初始化
```
