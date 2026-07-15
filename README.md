# theme-nehex
NeHex 个人空间引擎的 Rei 默认主题。

## 启动

生产环境推荐使用：

```bash
cp .env.example .env
# 按需修改 .env 中的 API_BASE_URL 和其他配置
./launch.sh
```

`launch.sh` 会检查 Node.js、npm 和 PM2，然后通过 `ecosystem.config.cjs` 启动应用。PM2 配置会先执行生产构建，再启动端口 `7887` 的 Node 服务。

也可以直接运行：

```bash
npm install
npm run build
npm run start
```

启动后可使用以下探针：

```text
GET /health  # 只检查主题进程，进程正常即返回 200
GET /ready   # 默认检查内容后端，不可用时返回 503
```

两个接口都会返回 `x-request-id` 和 JSON 请求 ID。`/health` 适合存活探针，`/ready` 适合负载均衡器或发布系统的就绪探针。

国内网络加速：
- 项目根目录已内置 `.npmrc`，默认使用 `https://registry.npmmirror.com/`
- 如需临时切回官方源：`npm config set registry https://registry.npmjs.org/`

## 环境变量

复制 `.env.example` 为 `.env` 后按需修改。服务端代理默认访问 `http://127.0.0.1:7878`，生产部署通常至少需要设置 `API_BASE_URL`。

示例：
```env
API_BASE_URL=http://127.0.0.1:7878
# 可选：构建时请求后端（默认 false，后端未启动也可稳定构建）
# NUXT_PRERENDER_FETCH_BACKEND=false
# /ready 是否检查内容后端（默认 true）；只想检查主题进程时设为 false
# NUXT_READINESS_CHECK_BACKEND=true
```

`WEBSOCKET_FUTION` 是历史拼写，当前仍保留兼容；新部署可继续使用它，不要误改成 `WEBSOCKET_FUNCTION`。HTTPS 站点使用 `wss://` 的 WebSocket 地址，并为管理员标记配置合适的 HTTPS Cookie 属性。

## 验证

提交或发布前运行：

```bash
npm run test:contracts
npm run build
curl -fsS http://127.0.0.1:7887/health
curl -i http://127.0.0.1:7887/ready
```

`/health` 不依赖内容后端；`/ready` 在后端不可用时预期返回 HTTP 503。应用日志使用 JSON 记录请求 ID、路由、状态码、耗时和错误分类，不记录 Cookie、管理员标记、评论邮箱、完整 IP 或正文。

参考&模仿项目：
[Chill-Round 寒蝉圆体系列](https://github.com/Warren2060/ChillRound)
[koi](https://github.com/tcdw/koi)
[Yohaku.](https://github.com/Innei/Yohaku)
[保罗的小窝](https://paul.ren/)

推荐使用[mx-space](https://mx-space.js.org/)博客引擎，更加简易好用！而且功能更加全面，性能更好，主题也多！
Mix Space 是一个现代化的前后端分离个人空间解决方案，也可以作为个人博客使用。

已实现的主要能力包括项目、关于页、游戏页、友情链接申请、WebSocket 在线人数、文章阅读量和点赞、相册点赞、评论和内容实时同步。搜索、主题后台和加载动画随机化仍取决于后端或后续功能开发。
