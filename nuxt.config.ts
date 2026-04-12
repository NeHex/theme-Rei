// https://nuxt.com/docs/api/configuration/nuxt-config
const websocketFutionEnabled = String(process.env.WEBSOCKET_FUTION || "TRUE")
  .trim()
  .toLowerCase() === "true";
const prerenderFetchBackend = String(
  process.env.NUXT_PRERENDER_FETCH_BACKEND || process.env.PRERENDER_FETCH_BACKEND || "false",
)
  .trim()
  .toLowerCase() === "true";

export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: false },
  css: ["~/assets/css/base.css"],
  nitro: {
    prerender: {
      routes: ["/", "/about", "/archive", "/friends", "/games"],
    },
  },
  routeRules: {
    "/": { prerender: true },
    "/about": { prerender: true },
    "/archive": { prerender: true },
    "/friends": { prerender: true },
    "/games": { prerender: true },
    "/article": { swr: 300 },
    "/article/**": { swr: 300 },
    "/album": { swr: 300 },
    "/daily": { swr: 300 },
    "/feed": { swr: 600 },
    "/robots.txt": { swr: 600 },
    "/sitemap.xml": { swr: 300 },
    "/about/": { redirect: { to: "/about", statusCode: 301 } },
    "/archive/": { redirect: { to: "/archive", statusCode: 301 } },
    "/friends/": { redirect: { to: "/friends", statusCode: 301 } },
    "/games/": { redirect: { to: "/games", statusCode: 301 } },
    "/article/": { redirect: { to: "/article", statusCode: 301 } },
    "/album/": { redirect: { to: "/album", statusCode: 301 } },
    "/daily/": { redirect: { to: "/daily", statusCode: 301 } },
    "/feed/": { redirect: { to: "/feed", statusCode: 301 } },
  },
  runtimeConfig: {
    prerenderFetchBackend,
    adminMarkerCookieName:
      process.env.NUXT_ADMIN_MARKER_COOKIE_NAME ||
      process.env.ADMIN_MARKER_COOKIE_NAME ||
      "nehex_admin_marker",
    adminSessionCookieNames:
      process.env.NUXT_ADMIN_SESSION_COOKIE_NAMES ||
      process.env.ADMIN_SESSION_COOKIE_NAMES ||
      "nehex_admin_session,admin_session,nehex_admin_token,admin_token",
    settingsApiBase:
      process.env.NUXT_API_BASE ||
      process.env.SETTINGS_API_BASE ||
      process.env.API_BASE_URL ||
      "http://127.0.0.1:7878",
    public: {
      settingsApiBase:
        process.env.NUXT_PUBLIC_API_BASE ||
        process.env.NUXT_PUBLIC_SETTINGS_API_BASE ||
        process.env.API_BASE_URL ||
        "http://127.0.0.1:7878",
      adminMarkerCookieName:
        process.env.NUXT_PUBLIC_ADMIN_MARKER_COOKIE_NAME ||
        process.env.NUXT_ADMIN_MARKER_COOKIE_NAME ||
        process.env.ADMIN_MARKER_COOKIE_NAME ||
        "nehex_admin_marker",
      onlineCountWsUrl: process.env.NUXT_PUBLIC_ONLINE_WS_URL || "",
      adminConsoleUrl:
        process.env.NUXT_PUBLIC_ADMIN_CONSOLE_URL ||
        process.env.ADMIN_CONSOLE_URL ||
        "/admin",
      adminPublicMarkerUrl:
        process.env.NUXT_PUBLIC_ADMIN_PUBLIC_MARKER_URL ||
        process.env.ADMIN_PUBLIC_MARKER_URL ||
        "",
      websocketFutionEnabled,
    },
  },
  app: {
    head: {
      charset: "utf-8",
      htmlAttrs: {
        lang: "zh-CN",
      },
    },
  },
})
