# 优酷下载器调研

调研日期：2026-11-24。范围为 GitHub 上游源码、官方测试及本机公开页面验证。不使用账号 Cookie、口令、代理或地域/访问限制绕过。

## 结论

**本次没有证实任何一个下载器当前能在普通公开链接上端到端取得可播放媒体，因此目前不能认定存在适合启用现有专用优酷入口的已验证 extractor。** 三个项目都仍包含 Youku extractor，但代码存在不等于当前服务可下载。继续接入前应由产品侧提供获授权、当前可播放且允许下载的测试视频，并在目标部署环境复测。

| 项目 | 上游证据 | 当前状态与验证 |
| --- | --- | --- |
| [yt-dlp](https://github.com/yt-dlp/yt-dlp) | [Youku extractor](https://github.com/yt-dlp/yt-dlp/blob/master/yt_dlp/extractor/youku.py) 仍实现视频与剧集解析，官方 `_TESTS` 有公开视频样例；最近一次针对 Youku 的专门修复为 [#10626](https://github.com/yt-dlp/yt-dlp/commit/0088c6de23d832b117061a33e984dc452d992e9c)，日期 2024-08-01。 | 使用 yt-dlp 2026.11.23 和 `--no-config --no-geo-bypass --no-playlist --dump-single-json` 请求官方样例 `XNjA1NzA2Njgw`、`XNzMxNzY1Mjc4`，均返回服务端错误 `-6004`，称账号被限制播放；未得到格式或媒体。其首个样例本身标注为密码保护且官方测试跳过 404，不是无条件可用证据。 |
| [you-get](https://github.com/soimort/you-get) | [Youku extractor 源码](https://github.com/soimort/you-get/blob/develop/src/you_get/extractors/youku.py) 使用 UPS API、固定 ccode/ckey 并支持密码参数；最新版发布页为 [v0.4.1743](https://github.com/soimort/you-get/releases/tag/v0.4.1743)（2025-01-04）。 | 临时安装官方版 0.4.1743 后对同一公开视频查询，提示 `Password:` 并失败；debug 请求返回“该视频已被屏蔽”。没有下载或验证媒体文件。 |
| [lux](https://github.com/iawia002/lux) | [Youku extractor](https://github.com/iawia002/lux/blob/master/extractors/youku/youku.go) 请求 UPS API 并可下载分段；[官方测试](https://github.com/iawia002/lux/blob/master/extractors/youku/youku_test.go) 声明一个 22,692,900 字节、720p 的公开视频。最近的 extractor 源码提交记录为 2023-02-02；[最新发布 v0.24.1](https://github.com/iawia002/lux/releases/tag/v0.24.1) 日期为 2024-05-06。 | 官方 Go 发行版成功编译；对上述官方测试 URL 执行 `lux -i`，服务端返回“用户账户异常、请重新登录”。测试文件未声明需要登录，但当前端点拒绝提供数据；未得到媒体。 |

## 对专用入口的适配

仓库现有 [视频下载页面](../src/pages/VideoDownloaderPage.tsx) 面向“解析优酷链接、选择剧集、服务端生成 MP4”。yt-dlp 的 Youku extractor具备视频/剧集解析入口，理论上更接近现有流程；但本次端到端验证失败，且 Youku 输出为 m3u8 媒体流，要经过服务端下载/合并并处理临时 URL。you-get/lux 也提供剧集或分段能力，但本次均未验证成功。**因此当前证据只支持保留为候选研究对象，不支持将任一者标记为可用工具或宣称兼容现有入口。**

上线判断至少还需确认：目标服务所在网络可合法访问样例、视频不要求未提供的账号/口令、不受地域或版权限制，工具能稳定返回媒体格式且完成完整文件下载/合并。对被服务端拒绝的样例不应通过伪造身份、解锁区域、规避付费/权限限制来提升成功率。

## 一手来源

- yt-dlp extractor、官方测试及提交历史：[源码](https://github.com/yt-dlp/yt-dlp/blob/master/yt_dlp/extractor/youku.py)、[Youku 专用修复](https://github.com/yt-dlp/yt-dlp/commit/0088c6de23d832b117061a33e984dc452d992e9c)
- you-get extractor 及发布：[源码](https://github.com/soimort/you-get/blob/develop/src/you_get/extractors/youku.py)、[v0.4.1743](https://github.com/soimort/you-get/releases/tag/v0.4.1743)
- lux extractor、测试及发布：[源码](https://github.com/iawia002/lux/blob/master/extractors/youku/youku.go)、[测试](https://github.com/iawia002/lux/blob/master/extractors/youku/youku_test.go)、[v0.24.1](https://github.com/iawia002/lux/releases/tag/v0.24.1)
- 仓库现有专用入口：[VideoDownloaderPage.tsx](../src/pages/VideoDownloaderPage.tsx)
