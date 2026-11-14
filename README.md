# Assan 应用库

个人效率工具集的 React 前端，配套 API 位于 `../assan-server-store`。认证用户可访问应用首页和工具；可用工具提供入口，规划中的工具标记为预览。

## 社区工具灵感

首页的「开发」「效率」「文本」分类现可进入以下三个浏览器本地工具：

- [JSON 格式化](/tools/json-beautifier)：校验 JSON、按 2 或 4 空格缩进或压缩，并复制结果。
- [时间戳转换](/tools/timestamp)：输入整数 Unix 秒/毫秒时间戳，查看本地及 UTC 时间；也可将设备时区下的日期时间转换为秒/毫秒时间戳。
- [文本比较](/tools/text-diff)：粘贴两段文本并排查看逐行增删改；每侧最多 300 行。

功能选择参考社区项目 [IT-Tools](https://github.com/CorentinTh/it-tools) 中的 [JSON Viewer](https://github.com/CorentinTh/it-tools/tree/main/src/tools/json-viewer)、[Date and Time Converter](https://github.com/CorentinTh/it-tools/tree/main/src/tools/date-time-converter) 和 [Text Diff](https://github.com/CorentinTh/it-tools/tree/main/src/tools/text-diff)。IT-Tools 源码采用 GPL-3.0 许可；本站页面及处理逻辑为基于需求独立编写的 React/TypeScript 实现，未复制其源码。

## 荒漠塔防

登录后从首页「游戏」分类进入 `/tools/tower-defense`。可选择荒原前哨（沙丘，12 波）、绿洲迷径（绿洲，14 波）、赤岩峡谷（峡谷，16 波）、失落古城（遗迹，18 波）四关；各关有独立的曲折路线、起始资源与敌群组合，切换关卡会重新开始。20×10 格的地图会随可用宽度放大，较窄屏幕可用鼠标左右拖动或触屏横向滑动探索；关卡含仙人掌、棕榈、绿洲水潭、峡谷岩石、灌木与遗迹砖迹等地貌。点击「全屏游戏」可在全屏下游玩，按 Esc 或点击「退出全屏」返回。

空地可建造连弩、霜冻、火炮、光束、毒雾（持续腐蚀）与雷暴（连锁攻击）六种塔，抵御赤焰魔、暗影魔、重甲魔、荒原巨魔及沙蜥斥候（高速）、绿洲祭司（治疗同伴）、岩甲攻城兽（厚甲高破坏）；每波开场前显示敌群预告。击败敌人获得金币，可升级防御塔（最高三级）或出售返还部分投入。每波清空后获得补给；生命归零则失败，守住当前关卡全部波次即获胜。支持暂停、双倍速及重新挑战；切换标签页会自动暂停。游戏完全在浏览器中运行，刷新后重新开始。

战场使用按需加载的 Phaser 3 渲染。防御塔、动态魔物和商店图鉴采用 [CraftPix 防御塔](https://opengameart.org/content/stone-tower-defense-game-art)与[怪物动画](https://opengameart.org/content/monster-game-sprites)素材，地面采用 [hassekf 的沙漠背景](https://opengameart.org/content/tower-defense-dirt-background)，全部作为本地贴图部署；新增敌塔复用已有本地贴图并以色调与尺寸区分。素材作者、授权与裁剪/缩放说明见[素材许可](public/tower-defense/LICENSE.txt)。Phaser 绘制不同地形的道路、弹道及命中粒子，GSAP 编排命中爆发、火炮震屏和波次开场动效。游戏规则由浏览器内的 TypeScript 模拟，地图上的交互按钮保留键盘操作与无障碍标签。启用系统「减少动态效果」时会收敛装饰动画，暂停和双倍速会同步作用于战场动效。

## 车内氛围生成器

登录后从「音频」分类打开 `/tools/atmosphere`。可选择雨夜巡航、露营夜晚等场景，也可以实时调节雨声、微风、篝火、白噪音及环境音总音量；点击播放后声音由浏览器本地生成，不需要上传或下载音频资源。可选设备上的音频文件作为背景音乐，使用独立播放器控制，文件只留在浏览器中；停止按钮会同时暂停环境音和背景音乐，离开页面会停止播放并释放文件链接。请在停车时调整设置，行驶时专注驾驶。

## M4A 转 FLAC

转换完成后可勾选多个结果或全选，点击「打包选中」生成 ZIP，再下载压缩包；也可逐个下载 FLAC。重名文件在 ZIP 内自动添加编号。打包完全在浏览器进行，会额外占用内存，大批量文件建议分批下载。

登录后从首页「音频」分类打开工具，或访问 `/tools/m4a-to-flac`。支持多选 M4A 文件，点击开始转换后顺序处理，每个文件单独显示进度、错误和 FLAC 下载入口。单个文件失败不影响后续文件；取消保留已完成结果，再次开始只处理未完成的文件。重新选择会替换列表并释放已有下载链接，请先下载结果。

- 使用单线程 ffmpeg.wasm Worker，支持 M4A 中的 AAC/ALAC，转换第一条音轨，复制内嵌封面及标题、歌手、专辑等常见标签；格式专有标签可能无法完整迁移。AAC 转 FLAC 不会提升原始音质。
- 音频完全在浏览器内存中处理，不上传；引擎由站点自身提供，无运行时 CDN 依赖。首次加载约 32 MB，工具路由按需加载，无需 SharedArrayBuffer 或跨源隔离头。
- 单文件限制 100 MiB；长音频仍可能超出设备内存，手机建议使用更小的文件。取消或离开页面会终止 Worker，下载链接在更换文件或离开页面时释放。
- 引擎依赖 `@ffmpeg/core` 0.12.10（GPL-2.0-or-later），发布包含引擎的镜像时需遵守其许可证；源码与构建脚本见 https://github.com/ffmpegwasm/ffmpeg.wasm/tree/v0.12.10 。

## 飞牛音乐

登录应用库后从首页「音频」分类进入 `/tools/music`。首次使用点击「音乐账号设置」，填写你自己的飞牛音乐账号；以后进入该页面会在全屏 iframe 中尝试自动登录。可以随时更换或删除保存的账号。播放和曲库依赖 `https://www.assanye.top:66/music/` 可访问；尚未使用真实账号验证自动登录与播放，若上游登录页面改版，可能需要更新 `public/music-login.js`。

移动端播放器的左侧会显示手势控制区：上划上一首、下划下一首、双击播放或暂停。手势区仅在触屏设备且播放器控制按钮已渲染时出现；聚焦后也可用上下方向键及空格键操作。手势脚本 `public/music-gestures.js` 根据播放器当前按钮结构定位控件，上游若修改控制栏 DOM，需要同步调整选择器。

Native Tools Android 客户端还可通过无需鉴权的服务端队列远程控制飞牛音乐。客户端发送的操作按顺序保存；播放器打开且控件就绪时每 1.5 秒领取一条并执行，服务端返回即视为消费，不重复下发。服务端接口和部署要求见配套后端 `docs/api.md`。

音乐页面经本站 `/music/` 同域代理，HTML 注入本站维护的 `public/music-custom.css`、自动登录脚本和手势脚本。Nginx 对播放器资源逐次校验应用库会话，只向上游转发 `music-token` Cookie；音频由 Nginx 直接转发并支持长连接，不经 API 内存缓存。账号按应用库用户分别加密保存于后端 SQLite，密钥单独通过环境变量提供，浏览器只在登录时从同源 API 临时读取凭据，密码不写入浏览器存储。**同域代理意味着飞牛播放器脚本与应用库页面共享浏览器源权限**；只在信任该播放器服务时启用此集成。

Docker 部署使用 Nginx 1.29，通过 Docker 内置 DNS 动态解析音乐上游，DNS 缓存有效期为 30 秒，避免上游公网 IP 变化后持续连接旧地址。出现 `/music/` 504 时的诊断与恢复步骤见 [部署排查文档](docs/docker-deployment.md#音乐页面-504连接了旧的上游-ip)。

## 技术栈

- React + TypeScript（strict）+ Vite
- React Router、Tailwind CSS v4、Lucide icons、Phaser 3 + GSAP（塔防战场按需加载）
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
