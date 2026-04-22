// https://nuxt.com/docs/api/configuration/nuxt-config
const websocketFutionEnabled = String(process.env.WEBSOCKET_FUTION || "TRUE")
  .trim()
  .toLowerCase() === "true";
const contentSyncEnabled = String(process.env.NUXT_PUBLIC_CONTENT_SYNC_ENABLED || "true")
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
  experimental: {
    defaults: {
      nuxtLink: {
        // Disable automatic link prefetch to avoid loading heavy route chunks on first paint.
        prefetch: false,
      },
    },
  },
  css: ["~/assets/css/base.css"],
  nitro: {
    prerender: {
      routes: ["/", "/about", "/archive", "/friends", "/games"],
    },
  },
  vite: {
    build: {
      rollupOptions: {
        output: {
          manualChunks(id: string) {
            if (id.includes("node_modules/maplibre-gl")) {
              return "vendor-maplibre";
            }
            if (id.includes("node_modules/markdown-it")) {
              return "vendor-markdown-it";
            }
          },
        },
      },
    },
  },
  routeRules: {
    "/": { prerender: true },
    "/about": { prerender: true },
    "/archive": { prerender: true },
    "/friends": { prerender: true },
    "/games": { prerender: true },
    "/feed": { swr: 600 },
    "/robots.txt": { swr: 600 },
    "/sitemap.xml": { swr: 300 },
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
      contentUpdatesWsUrl:
        process.env.NUXT_PUBLIC_CONTENT_UPDATES_WS_URL ||
        process.env.CONTENT_UPDATES_WS_URL ||
        "",
      contentSyncEnabled,
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
