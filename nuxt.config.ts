// https://nuxt.com/docs/api/configuration/nuxt-config
const websocketFutionEnabled = String(process.env.WEBSOCKET_FUTION || "TRUE")
  .trim()
  .toLowerCase() === "true";

export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: false },
  css: ["~/assets/css/base.css"],
  runtimeConfig: {
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
      onlineCountWsUrl: process.env.NUXT_PUBLIC_ONLINE_WS_URL || "",
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
