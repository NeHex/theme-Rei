# Rei 主题优化清单

本文档基于当前项目结构、生产构建结果和现有测试整理，目标是将优化工作拆成可以逐项实施、验证和回滚的任务。

## 0. 当前基线

- 技术栈：Nuxt 4、Vue 3、Nitro、TypeScript、Markdown It、MapLibre GL。
- 数据模式：页面通过本地 `/api/*` 请求，Nitro 服务端再转发到 `API_BASE_URL`。
- 渲染模式：SSR、部分预渲染、客户端 WebSocket 内容同步。
- 已通过：`npm run test:contracts`，18 项测试全部通过。
- 已通过：`npm run build`，5 个配置的预渲染路由生成成功。
- 优化前工作区无未提交改动。

### 已观察到的主要信号

| 项目 | 当前情况 | 影响 |
| --- | --- | --- |
| 客户端大 chunk | 构建提示存在约 1 MB 的压缩前 chunk | 首屏下载、解析和移动端内存压力较高 |
| 静态资源 | `background.png` 约 3 MB，字体约 2.3 MB，`loading.gif` 约 1.1 MB | 首屏流量和加载时间偏高 |
| 大型源码文件 | `app/pages/index.vue` 约 64 KB，`about.vue` 约 51 KB，`CommentSection.vue` 约 43 KB | 修改风险和维护成本较高 |
| 后端请求 | 多数 composable 使用 `cache: "no-store"` | 缓存利用率低，后端压力较大 |
| 文章列表 | `server/api/article.get.ts` 会合并多页数据 | 文章数量增大后请求量和响应时间会线性增长 |
| 测试覆盖 | 目前主要是详情 API 契约测试 | 页面交互、API 代理和实时同步缺少自动保护 |
| 文档 | README 中仍有部分“待实现”功能与当前代码不一致 | 部署和维护者容易误判实际能力 |

## 1. 优先级定义

- **P0：必须优先处理**。涉及安全、数据正确性、生产故障或明确的高风险行为。
- **P1：高收益优化**。对首屏性能、接口压力和用户体验有明显影响。
- **P2：结构性改进**。降低长期维护成本，改善测试和开发效率。
- **P3：持续改进**。低风险增强或体验细节，可排入常规迭代。

## 2. P0：稳定性与安全

### P0-01 统一外部 API 转发策略

- 位置：`server/api/page/[key].get.ts`、`server/api/comment.post.ts`、`server/api/comment/[id]/like.post.ts`、`server/api/friend-apply.post.ts`。
- 问题：部分接口直接使用 `$fetch` 拼接 URL，部分接口使用 `backendFetch`，超时、重试、错误映射和预渲染跳过策略不一致。
- 优化：所有服务端代理统一走 `server/utils/backendFetch.ts`，集中定义超时、重试、请求头透传、错误脱敏和预渲染行为。
- 验收：后端超时、404、429、500 时返回稳定错误结构，不泄露内部地址或堆栈；代理不再重复实现 base URL 处理。

### P0-02 限制评论和友链申请的输入边界

- 位置：`server/api/comment.post.ts`、`server/api/friend-apply.post.ts`、`app/components/CommentSection.vue`、`app/pages/friends.vue`。
- 优化：服务端校验字段类型、长度、枚举和 URL 协议；限制请求体大小；拒绝 `javascript:`、`data:` 等危险协议；对昵称、联系方式、站点描述设置长度上限。
- 建议：引入轻量 schema 校验层，或在 `server/utils` 建立统一校验函数，避免仅依赖前端表单校验。
- 验收：绕过前端发送非法 JSON、超长文本、缺字段和危险 URL 时返回 400/422，且不会向上游发送非法数据。

### P0-03 增加公开写接口的限流和反滥用保护

- 位置：评论发布、评论点赞、文章点赞、相册点赞、文章阅读量接口。
- 问题：点赞 Cookie 只能阻止同一浏览器重复操作，不能阻止脚本、多客户端或伪造请求；评论接口需要额外防刷。
- 优化：在反向代理或后端增加按 IP、Cookie、设备标记的限流；验证码状态必须由服务端验证；对重复提交使用幂等键或短期请求指纹。
- 验收：连续请求超过阈值返回 429；正常用户操作不被误伤；限流规则、窗口时间和恢复方式有部署文档。

### P0-04 复核管理员标记的信任边界

- 位置：`server/utils/adminIdentity.ts`、`app/composables/useAdminMarker.ts`、`app/plugins/admin-marker-sync.client.ts`、`server/api/comment.post.ts`。
- 问题：管理员身份可由请求头、Cookie 或会话 Cookie 得到。它们都属于客户端可控制输入，最终权限判断必须由后端控制台或内容后端再次验证。
- 优化：前台只传递短期标记，不把标记本身视为可信权限；服务端只透传白名单字段；生产环境开启 HTTPS、`Secure`、合适的 `SameSite`，并确认敏感 Cookie 不被前端脚本读取。
- 验收：伪造 `x-nehex-admin-marker` 不能直接获得管理员权限；身份失效后标记按规定时间失效；日志不打印完整令牌。

### P0-05 为实时同步增加生命周期和失败隔离测试

- 位置：`app/plugins/content-sync.client.ts`、`server/api/sync/changes.get.ts`、`server/api/sync/version.get.ts`。
- 优化：明确 WebSocket 失败、轮询失败、序号倒退、分页游标不前进、重复事件和页面卸载行为；限制重连频率和最大并发请求；同步异常不能影响页面主流程。
- 验收：WebSocket 不可用时页面仍可正常浏览；断线重连不会产生多个 socket 或轮询器；重复事件不会重复刷新；无未处理 Promise rejection。

### P0-06 固定动态页面的错误语义

- 位置：`app/pages/[key].vue`、`app/pages/article/[id].vue`、`app/pages/daily/[id].vue`、`app/pages/project/[id].vue`、`app/pages/album/[id].vue`。
- 优化：区分参数错误、资源不存在、上游不可用和内容校验失败；404 使用 404 页面，502/503 使用可重试提示；不要把所有异步错误转换成“页面不存在”。
- 验收：非法 ID、真实 404、后端超时和契约错误分别得到正确状态码和用户提示；服务端日志包含 scope 和 request id。

## 3. P1：首屏和运行时性能

### P1-01 优化大体积静态资源

- 位置：`public/images/background.png`、`public/ChillRoundM.woff2`、`public/images/loading.gif`、`public/images/coseroom-logo.png`。
- 优化：背景图转换为 AVIF/WebP，并提供移动端和桌面端版本；只保留实际使用的字体字重和字符子集；将 GIF 替换为压缩动画 WebP 或 CSS/轻量 SVG；删除或合并重复头像资源。
- 验收：首屏关键资源总大小下降 40% 以上；LCP 不再等待大 GIF 或完整字体；低带宽移动设备仍能正常展示。

### P1-02 拆分客户端大 chunk

- 位置：`nuxt.config.ts`、`app/pages/index.vue`、`app/pages/about.vue`、`app/components/CommentSection.vue`、`app/components/SiteNav.vue`。
- 优化：使用构建分析确认约 1 MB chunk 的依赖来源；MapLibre 仅在地图进入视口或用户打开地图区域时动态加载；评论区、验证码、相册查看器按路由或交互动态导入；按真实依赖关系拆分 manual chunks。
- 验收：首屏初始 JS 明显下降；未访问关于页不下载 MapLibre；未打开评论或相册不加载对应重型模块；大 chunk 警告得到解释或消除。

### P1-03 建立图片尺寸和加载策略

- 位置：`app/plugins/image-loader.client.ts`、首页、相册、文章和项目页面。
- 优化：头像、封面、相册图提供固定宽高或 `aspect-ratio`；首屏主图使用 `fetchpriority="high"`，非首屏图懒加载；外部图片提供失败占位；全局图片插件不得影响验证码和加载动画。
- 验收：Lighthouse CLS 小于 0.1；图片失败时布局不抖动；长页面不会一次下载全部相册图片。

### P1-04 减少无效的 `no-store` 请求

- 位置：`app/composables/useArticles.ts`、`useAlbums.ts`、`useDailies.ts`、`useProjects.ts`、`useSiteSettings.ts` 及对应 API。
- 问题：公共内容全部 `no-store`，实时性较好但牺牲了 SSR、浏览器和 Nitro 缓存收益。
- 优化：站点设置、友链、项目列表使用短 TTL SWR；文章、日常、相册列表使用 30 秒至 5 分钟服务端缓存；WebSocket 事件到达时主动 `refreshNuxtData`；点赞、阅读量和评论使用写后刷新或局部更新。
- 验收：重复访问公共页面不重复请求上游；内容更新事件能主动刷新缓存；点赞和评论不显示旧计数。

### P1-05 控制文章全量抓取和并发

- 位置：`server/api/article.get.ts`。
- 问题：当前逻辑请求第一页后继续请求所有分页，再在主题端过滤、排序和分页；文章增长后请求量和响应时间线性增加。
- 优化：优先让后端支持关键词、标签、排序和分页，主题 API 只请求当前页；若上游暂不支持，至少限制最大页数、增加并发上限、设置结果缓存，并返回是否还有更多数据。
- 验收：文章达到数百或数千条时不会并发打满上游；响应时间不再与总文章数线性增长；筛选和分页保持正确。

### P1-06 优化首页首次渲染

- 位置：`app/pages/index.vue`、`app/app.vue`、`app/components/SiteNav.vue`。
- 优化：首页非首屏项目、相册、日常内容延迟到进入视口后加载；降低首屏动画、模糊背景和大面积 `backdrop-filter`；增加 `prefers-reduced-motion` 降级；路由遮罩只在导航超过短阈值时出现。
- 验收：快速跳转不闪屏；低端设备滚动和点击无明显卡顿；减少动画设置后核心内容完整可用。

### P1-07 控制实时同步轮询成本

- 位置：`app/plugins/content-sync.client.ts`。
- 优化：页面不可见时暂停或延长轮询；离线时停止重连；使用指数退避和最大重连间隔；多个标签页可使用 `BroadcastChannel` 共享同步结果。
- 验收：后台标签页不持续高频请求；断网期间请求数可控；恢复网络后能补齐变化且不重复刷新。

## 4. P1：接口和 SEO

### P1-08 统一 API 响应和错误格式

- 位置：全部 `server/api/*.ts`。
- 优化：统一成功结构、分页结构、错误字段和 request id；不要混用 `detail`、`statusMessage` 和自由文本；对上游错误做稳定映射。
- 验收：前端只需一个错误解析函数；接口可用统一模板描述；日志和客户端提示能关联 request id。

### P1-09 补齐 API 代理的参数编码和类型校验

- 位置：所有动态接口，特别是 `server/api/article/[id].get.ts`、`project/[id].get.ts`、`album/[id].get.ts`、`page/[key].get.ts`。
- 优化：统一校验正整数 ID、单页 key 和 query 参数；转发到上游的 path 参数使用 `encodeURIComponent`；禁止通过 endpoint 字符串拼接产生非预期路径。
- 验收：特殊字符、空值、数组 query 和非法数字均有确定结果；不会访问非预期上游路径。

### P1-10 完善动态页面的 SEO 和索引策略

- 位置：动态详情页、`server/routes/sitemap.xml.ts`、`server/routes/feed.ts`、`nuxt.config.ts`。
- 优化：文章、日常、项目、相册详情统一生成 canonical、description、Open Graph 和 JSON-LD；sitemap 只输出有效资源并正确使用更新时间；明确 SSR 和客户端加载边界；错误页、空列表和草稿状态设置合适的 robots 行为。
- 验收：canonical 不受代理 Host 变化影响；结构化数据可解析；sitemap 不包含失效链接。

### P1-11 处理 Markdown 内容的安全边界

- 位置：`app/pages/[key].vue`、`app/pages/article/[id].vue`、`app/pages/daily/[id].vue`、`app/pages/project/[id].vue`、`app/utils/link.ts`。
- 当前状态：Markdown It 已关闭原始 HTML，但仍应明确链接协议、图片地址和外部链接规则。
- 优化：只允许 `http`、`https` 和站内相对路径；明确是否允许图片、自动链接和 `target=_blank`；增加不可信后台内容的 HTML 安全回归测试。
- 验收：`javascript:`、异常协议和恶意 HTML 不进入最终 DOM；正常 Markdown、代码块、图片和外部链接保持兼容。

## 5. P2：代码结构和可维护性

### P2-01 拆分超大页面文件

- 优先拆分：
  - `app/pages/index.vue`：Hero、站长卡片、文章列表、日常区、相册区、项目区、项目弹窗。
  - `app/pages/about.vue`：地图、技能、教育、生活目标、访客数据、动画逻辑。
  - `app/pages/friends.vue`：友链列表、申请弹窗、评论区。
  - `app/components/CommentSection.vue`：评论查询、表单、验证码、评论树、点赞。
- 原则：组件负责展示和事件派发，数据转换放 composable，API 调用放服务端代理。
- 验收：单个页面组件处于可理解范围；子组件有清晰 props/emits；拆分不改变 SSR 输出和交互行为。

### P2-02 抽取重复的 SEO 和 URL 处理逻辑

- 位置：多个页面中重复的 `siteBaseUrl`、canonical、OG image、日期格式化和 URL 归一化逻辑。
- 优化：建立 `usePageSeo`、`useSiteBaseUrl` 或同等轻量工具；统一处理站点配置缺失、代理 Host 和外部图片 URL。
- 验收：新增页面不再复制完整 SEO 代码；站点 URL 变化时所有页面生成一致结果。

### P2-03 统一数据映射和默认值

- 位置：`app/composables/useArticles.ts`、`useAlbums.ts`、`useDailies.ts`、`useProjects.ts`、`useSinglePages.ts`。
- 优化：把日期、图片、标签、外部 URL、计数和空值处理集中到可测试 mapper；避免页面层重复归一化。
- 验收：每种内容类型都有正常、空值、非法日期、相对路径和异常数值测试。

### P2-04 统一代理 API 的类型定义

- 问题：多个 API 文件重复声明 Article、Album、Comment 等类型，字段更新容易遗漏。
- 优化：建立 `server/types` 或共享契约文件；区分上游 API 类型、主题内部 ViewModel 和写请求类型。
- 验收：字段变更只需修改一个契约来源；TypeScript 能发现前后端字段不一致。

### P2-05 为契约校验补充完整测试

- 位置：`server/utils/detailApiContracts.js`、`tests/detail-api-contracts.test.mjs`。
- 增加覆盖：文章详情、分页列表、评论树、设置响应、主题配置、多种错误 envelope、可选字段、null 字段和未知字段。
- 验收：上游字段类型变化、缺失必填字段和错误嵌套结构能在 CI 被发现。

### P2-06 增加 API 代理单元测试和 E2E 测试

- API 测试：后端不可用、超时、404、429、重试、Cookie 透传、管理员标记和限流响应。
- E2E 测试：首页、文章详情、评论提交、点赞去重、相册查看器、友链申请、404、断网降级和移动端布局。
- 验收：核心流程至少有一条自动化回归；CI 可使用 mock server，不依赖真实内容后端。

### P2-07 加入 TypeScript 和静态检查门禁

- 优化：增加 `typecheck`、ESLint、格式检查和构建检查脚本；禁止新增未解释的 `any`；服务端错误统一用 `unknown` 后收窄。
- 验收：Pull Request 必须通过类型检查、契约测试和生产构建。

### P2-08 清理和更新项目文档

- 位置：`README.md`、`.env.example`、`ecosystem.config.cjs`、`launch.sh`。
- 优化：同步已实现功能、部署变量、API 地址、WebSocket 配置、预渲染行为、健康检查和故障排查；说明 `WEBSOCKET_FUTION` 的历史拼写兼容策略。
- 验收：新部署者只根据 README 和 `.env.example` 就能启动主题、配置后端并验证连接。

## 6. P2：部署、观测与运维

### P2-09 增加健康检查和启动前检查

- 位置：Nuxt routes、`ecosystem.config.cjs`、`launch.sh`。
- 优化：增加 `/health` 或 `/api/health`，检查应用进程和可选的后端连通性；启动时输出脱敏配置摘要；PM2 增加重启策略、日志大小限制和环境变量说明。
- 验收：负载均衡器可区分应用存活和后端不可用；启动失败有明确日志；不会把 API 密钥打印到日志。

### P2-10 建立统一结构化日志

- 记录：request id、route、上游 endpoint 名称、耗时、状态码、错误分类、缓存命中情况。
- 不记录：Cookie 全值、管理员标记、评论邮箱、完整用户 IP 和正文内容。
- 验收：一次 API 失败可以从前端 request id 追到 Nitro 和上游日志；敏感信息不会出现在日志中。

### P2-11 增加性能预算和构建报告

- 建议预算：首屏关键 JS、首屏图片、字体、单路由总传输量、LCP、CLS、INP。
- 优化：CI 保存构建产物大小报告；当最大 chunk、总静态资源或 Lighthouse 指标超过预算时失败或警告。
- 验收：性能回归能在合并前发现，而不是部署后才人工发现。

## 7. P3：体验增强

### P3-01 完善加载、空状态和错误状态

- 统一文章、日常、相册、项目、友链和电影页面的加载中、空数据、后端不可用和重试状态。
- 空状态要说明当前没有内容，不能只显示空白区域。
- 验收：关闭后端或返回空数组时，每个公开页面仍有明确可理解的界面。

### P3-02 完善可访问性

- 检查键盘焦点、弹窗焦点回收、ESC 关闭、图片 alt、按钮名称、表单错误关联和颜色对比度。
- 重点检查 `AlbumViewer.vue`、`DragPuzzleCaptcha.vue`、评论表单和导航菜单。
- 验收：主要流程可以只用键盘完成；屏幕阅读器能识别弹窗、按钮和错误信息。

### P3-03 支持减少动画和低性能设备

- 对路由遮罩、首页卡片揭示、关于页循环动画和相册过渡增加 `prefers-reduced-motion` 分支。
- 在移动设备或低内存环境降低模糊、阴影和背景动画。
- 验收：减少动画设置下无持续循环动画，核心内容和操作不受影响。

### P3-04 优化交互状态同步

- 点赞成功、重复点赞、接口失败、实时刷新和页面返回时，统一处理本地计数与服务端计数。
- 对文章、相册和评论点赞使用相同状态机，减少重复实现。
- 验收：快速连续点击不会重复发送请求；失败后按钮和计数能恢复；跨页面返回后状态一致。

## 8. 推荐实施顺序

## 本轮实施记录

### 已完成

- **P0-01 部分完成**：独立页详情、评论发布、友链申请、评论点赞已统一使用 `server/utils/backendFetch.ts`；写请求关闭自动重试，保留友链申请的 404 双端点兼容。
- **P0-02 已完成第一阶段**：评论和友链申请增加服务端类型、长度、URL 协议、邮箱、目标类型和请求字段校验。
- **P0-06 已完成第一阶段**：文章、日常、项目、相册和独立页详情统一区分 400、404 和上游失败；上游异常默认返回 502。
- **P1-09 已完成第一阶段**：动态数字 ID 统一校验为正整数，path 参数统一编码后再转发。
- **P2-05 已完成第一阶段**：测试入口扩展为自动运行 `tests/*.test.mjs`，当前契约和输入边界测试共 14 项。
- **P2-08 已完成第一阶段**：README、`.env.example`、`launch.sh` 和 PM2 配置已同步启动、探针、预渲染与 WebSocket 环境变量说明。
- **P2-09 已完成第一阶段**：增加 `/health` 存活检查、`/ready` 后端就绪检查、启动前依赖检查和 PM2 重启/内存策略。
- **P2-10 已完成第一阶段**：增加请求 ID 响应头与 JSON 请求日志，日志字段不包含 Cookie、管理员标记、邮箱、完整 IP 或正文。

### 部分完成或待外部条件

- **P0-03**：限流需要结合反向代理、共享 Redis 或内容后端实现，暂不在单个 Nuxt 进程内做内存限流。
- **P0-04**：管理员标记已增加长度和控制字符过滤，但最终权限验证、短期过期和 Cookie 安全属性仍需与控制台/内容后端联调。
- **P0-05**：实时同步逻辑已具备基础重连和轮询机制，尚未补齐浏览器级断线、重复事件和多标签页测试。
- **P1-01 至 P1-07**：资源压缩、chunk 拆分、缓存和实时同步成本尚未开始处理。

### 验证结果

- `npm run test:contracts`：14 项全部通过。
- `npm run build`：成功；5 个预渲染入口正常生成。
- `git diff --check`：通过。
- `npx nuxt typecheck`：受当前环境 `vue-tsc`/TypeScript 包导出错误阻塞，未进入项目代码诊断。

### 第一阶段：生产风险收敛

- [x] P0-01 统一后端代理。
- [x] P0-02 输入校验和请求体限制。
- [ ] P0-03 写接口限流和反滥用。
- [ ] P0-04 管理员标记信任边界。
- [ ] P0-05 实时同步失败隔离。
- [x] P0-06 动态页面错误语义。
- [x] P2-05 补齐数据契约测试。

### 第二阶段：首屏性能和接口压力

- [ ] P1-01 压缩图片、字体和加载动画。
- [ ] P1-02 分析并拆分大 chunk。
- [ ] P1-03 建立图片尺寸和加载策略。
- [ ] P1-04 为公共内容增加短 TTL 缓存。
- [ ] P1-05 改造文章分页和并发策略。
- [ ] P1-06 优化首页首次渲染。
- [ ] P1-07 控制实时同步轮询。

### 第三阶段：结构和质量门禁

- [ ] P1-08 统一 API 响应格式。
- [ ] P1-09 统一参数校验和编码。
- [ ] P1-10 完善动态 SEO 和 sitemap。
- [ ] P1-11 完成 Markdown 安全回归测试。
- [ ] P2-01 拆分大页面组件。
- [ ] P2-02 抽取 SEO 和 URL 工具。
- [ ] P2-03 统一 mapper。
- [ ] P2-04 统一类型契约。
- [ ] P2-06 增加 API 和 E2E 测试。
- [ ] P2-07 增加 typecheck、lint 和 CI 门禁。

### 第四阶段：运维和体验

- [x] P2-08 更新 README 和部署文档（第一阶段）。
- [x] P2-09 增加健康检查（第一阶段）。
- [x] P2-10 增加结构化日志（第一阶段）。
- [ ] P2-11 增加性能预算。
- [ ] P3-01 至 P3-04 完善空状态、可访问性、动画和交互同步。

## 9. 建议跟踪指标

每次优化前后记录同一组指标，避免只凭主观感受判断效果：

- 首屏：LCP、CLS、INP、TTFB。
- 资源：首屏 JS、最大 chunk、首屏图片、字体和总传输量。
- 服务端：API P50/P95 响应时间、上游请求次数、缓存命中率、错误率。
- 实时同步：WebSocket 重连次数、轮询次数、重复事件数、同步失败率。
- 质量：类型检查、契约测试、E2E 通过率、构建成功率。
- 安全：429 数量、非法输入拦截数、管理员标记验证失败数、敏感日志扫描结果。

## 10. 完成标准

一次优化迭代至少应同时满足：

1. 有明确的代码范围和行为变化说明。
2. 有对应的自动化测试或可重复的人工验证步骤。
3. `npm run test:contracts` 和 `npm run build` 通过。
4. 没有引入未解释的 API 行为变化或配置兼容性破坏。
5. 性能、安全或稳定性指标至少有一项得到可量化改善。
6. README、`.env.example` 或部署配置在行为变化时同步更新。
