// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: false },
  css: ["~/assets/css/base.css"],
  runtimeConfig: {
    settingsApiBase: process.env.SETTINGS_API_BASE || "http://127.0.0.1:7878",
    public: {
      settingsApiBase:
        process.env.NUXT_PUBLIC_SETTINGS_API_BASE || "http://127.0.0.1:7878",
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
