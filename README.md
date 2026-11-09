# Assan 应用库

个人效率工具集的 React 前端，配套 API 位于 `../assan-server-store`。认证用户可访问应用首页和工具；可用工具提供入口，规划中的工具标记为预览。

## M4A 转 FLAC

转换完成后可勾选多个结果或全选，点击「打包选中」生成 ZIP，再下载压缩包；也可逐个下载 FLAC。重名文件在 ZIP 内自动添加编号。打包完全在浏览器进行，会额外占用内存，大批量文件建议分批下载。

登录后从首页「音频」分类打开工具，或访问 `/tools/m4a-to-flac`。支持多选 M4A 文件，点击开始转换后顺序处理，每个文件单独显示进度、错误和 FLAC 下载入口。单个文件失败不影响后续文件；取消保留已完成结果，再次开始只处理未完成的文件。重新选择会替换列表并释放已有下载链接，请先下载结果。

- 使用单线程 ffmpeg.wasm Worker，支持 M4A 中的 AAC/ALAC，转换第一条音轨，复制内嵌封面及标题、歌手、专辑等常见标签；格式专有标签可能无法完整迁移。AAC 转 FLAC 不会提升原始音质。
- 音频完全在浏览器内存中处理，不上传；引擎由站点自身提供，无运行时 CDN 依赖。首次加载约 32 MB，工具路由按需加载，无需 SharedArrayBuffer 或跨源隔离头。
- 单文件限制 100 MiB；长音频仍可能超出设备内存，手机建议使用更小的文件。取消或离开页面会终止 Worker，下载链接在更换文件或离开页面时释放。
- 引擎依赖 `@ffmpeg/core` 0.12.10（GPL-2.0-or-later），发布包含引擎的镜像时需遵守其许可证；源码与构建脚本见 https://github.com/ffmpegwasm/ffmpeg.wasm/tree/v0.12.10 。

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

默认将 `/api` 代理到 `http://localhost:8080`。先启动 `../assan-server-store`，或设置 `VITE_API_PROXY_TARGET` 覆盖目标。

```sh
pnpm lint
pnpm test
pnpm build
```

## Docker / NAS

从前端仓库根目录启动完整应用和相邻后端：

```sh
cp .env.example .env
# 本地 HTTP 测试时编辑 .env，将 SECURE_COOKIES 改为 false
docker compose config --quiet
docker compose up -d --build
```

默认只绑定 `127.0.0.1:8080`；由 NAS HTTPS 反向代理转发至该端口。请将 NAS 反向代理配置为覆盖 `X-Real-IP` 并填入真实客户端 IP；前端 Nginx 将该值传给隔离的后端容器供认证限流使用。Nginx 也会保留 `/api/` 路径与 Cookie，其余路径回退到 `index.html`。后端 SQLite 数据写入 `assan-data` Docker volume。生产部署保留 `SECURE_COOKIES=true`；本地 HTTP 测试需改为 `false`。首次访问可注册账户，忘记密码时参考 `../assan-server-store/README.md` 的管理员重置命令。

## 项目结构

```text
src/
  app/         路由与认证边界
  components/  应用壳和共享 UI
  features/    登录、注册、账户设置与本地音频转换
  lib/         API 客户端
  pages/       首页和工具预览
  test/        测试初始化
```
