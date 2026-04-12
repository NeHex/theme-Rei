# theme-nehex
NeHex个人空间引擎的默认主题

pm2启动
> pm2 start ecosystem.config.cjs

说明：`pm2` 启动时会自动执行构建，再启动服务（默认端口 `7887`）。

国内网络加速：
- 项目根目录已内置 `.npmrc`，默认使用 `https://registry.npmmirror.com/`
- 如需临时切回官方源：`npm config set registry https://registry.npmjs.org/`

环境变量配置（`.env`）
1. 复制 `.env.example` 为 `.env`
2. 按需修改 `API_BASE_URL`
3. 如需在构建阶段预渲染真实后端内容，设置 `NUXT_PRERENDER_FETCH_BACKEND=true`

示例：
```env
API_BASE_URL=http://127.0.0.1:7878
# 可选：构建时请求后端（默认 false，后端未启动也可稳定构建）
# NUXT_PRERENDER_FETCH_BACKEND=false
```

参考&模仿项目：
[Chill-Round 寒蝉圆体系列](https://github.com/Warren2060/ChillRound)
[koi](https://github.com/tcdw/koi)
[Yohaku.](https://github.com/Innei/Yohaku)
[保罗的小窝](https://paul.ren/)

推荐使用[mx-space](https://mx-space.js.org/)博客引擎，更加简易好用！而且功能更加全面，性能更好，主题也多！
Mix Space 是一个现代化的前后端分离个人空间解决方案，也可以作为个人博客使用。

等待实现的功能：
    - 项目自定义
    - 后台
    - 关于页
    - 游戏页
    - 搜索功能
    - 友情链接提交
    - websocket在线人数
    - 前端文章访问数计算（后端API未实现）
    - 前端文章点赞数计算（后端API未实现）
    - 前端相册点赞功能
    - 加载GIF随机
