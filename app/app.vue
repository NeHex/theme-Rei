<script setup lang="ts">
import SiteFooter from "~/components/SiteFooter.vue";
import SiteNav from "~/components/SiteNav.vue";
type LoaderPhase = "enter" | "loading" | "exit";

const isRouteLoading = ref(false);
const loaderPhase = ref<LoaderPhase>("enter");
const { settings } = useSiteSettings();

const ENTER_MS = 420;
const EXIT_MS = 360;

let phaseTimer: ReturnType<typeof setTimeout> | null = null;
let enterGate: Promise<void> | null = null;
let resolveEnterGate: (() => void) | null = null;
let pendingStop = false;

useHead(() => ({
  title: settings.value.siteTitle,
  meta: [
    {
      name: "description",
      content: settings.value.siteDesc,
    },
    {
      name: "theme-color",
      content: "#0f172a",
    },
  ],
  link: [
    {
      rel: "shortcut icon",
      href: settings.value.siteFavicon || "/favicon.ico",
    },
    {
      rel: "icon",
      href: settings.value.siteFavicon || "/favicon.ico",
    },
    {
      rel: "icon",
      type: "image/png",
      sizes: "32x32",
      href: "/favicon-32x32.png",
    },
    {
      rel: "icon",
      type: "image/png",
      sizes: "16x16",
      href: "/favicon-16x16.png",
    },
    {
      rel: "apple-touch-icon",
      sizes: "180x180",
      href: "/apple-touch-icon.png",
    },
    {
      rel: "manifest",
      href: "/site.webmanifest",
    },
  ],
}));

function clearPhaseTimer() {
  if (!phaseTimer) return;
  clearTimeout(phaseTimer);
  phaseTimer = null;
}

function releaseEnterGate() {
  if (resolveEnterGate) {
    resolveEnterGate();
    resolveEnterGate = null;
  }
  enterGate = null;
}

function startLoading() {
  if (!isRouteLoading.value) {
    clearPhaseTimer();
    releaseEnterGate();
    isRouteLoading.value = true;
    loaderPhase.value = "enter";
    pendingStop = false;
    enterGate = new Promise<void>((resolve) => {
      resolveEnterGate = resolve;
    });

    phaseTimer = setTimeout(() => {
      phaseTimer = null;
      if (!isRouteLoading.value || loaderPhase.value !== "enter") {
        releaseEnterGate();
        return;
      }

      loaderPhase.value = "loading";
      releaseEnterGate();

      if (pendingStop) {
        pendingStop = false;
        stopLoading();
      }
    }, ENTER_MS);

    return enterGate;
  }

  if (loaderPhase.value === "exit") {
    clearPhaseTimer();
    loaderPhase.value = "loading";
    pendingStop = false;
    releaseEnterGate();
  }

  return enterGate ?? Promise.resolve();
}

function stopLoading() {
  if (!isRouteLoading.value) return;

  if (loaderPhase.value === "enter") {
    pendingStop = true;
    return;
  }

  releaseEnterGate();
  clearPhaseTimer();
  loaderPhase.value = "exit";

  phaseTimer = setTimeout(() => {
    phaseTimer = null;
    isRouteLoading.value = false;
    loaderPhase.value = "enter";
    pendingStop = false;
    releaseEnterGate();
  }, EXIT_MS);
}

function logThemeBanner() {
  if (!import.meta.client) return;

  const win = window as Window & { __reiThemeBannerLogged?: boolean };
  if (win.__reiThemeBannerLogged) return;
  win.__reiThemeBannerLogged = true;

  const rootStyle = getComputedStyle(document.documentElement);
  const accent = rootStyle.getPropertyValue("--theme-accent").trim() || "#2ad4e1";
  const surface = rootStyle.getPropertyValue("--theme-surface-strong").trim() || "#081529";

  console.log(
    "%c Rei %c https://github.com/nehex/theme-rei ",
    [
      `background:${accent}`,
      "color:#04101a",
      "font-weight:700",
      "padding:4px 10px",
      "border-radius:8px 0 0 8px",
    ].join(";"),
    [
      `background:${surface}`,
      `color:${accent}`,
      "font-weight:600",
      "padding:4px 10px",
      "border-radius:0 8px 8px 0",
    ].join(";"),
  );
}

if (import.meta.client) {
  const router = useRouter();
  const nuxtApp = useNuxtApp();

  onMounted(() => {
    logThemeBanner();
  });

  router.beforeEach(async (to, from) => {
    if (to.fullPath !== from.fullPath) {
      await startLoading();
    }
    return true;
  });

  nuxtApp.hook("page:finish", () => {
    stopLoading();
  });

  nuxtApp.hook("app:error", () => {
    stopLoading();
  });

  onBeforeUnmount(() => {
    clearPhaseTimer();
    pendingStop = false;
    releaseEnterGate();
  });
}
</script>

<template>
  <div class="app-root">
    <NuxtRouteAnnouncer />
    <SiteNav />
    <main class="app-main">
      <NuxtPage />
    </main>
    <SiteFooter />

    <div
      v-if="isRouteLoading"
      class="route-loader-overlay"
      :class="`is-${loaderPhase}`"
      role="status"
      aria-live="polite"
      aria-label="页面加载中"
    >
      <div class="route-loader-mask" aria-hidden="true" />
      <img
        class="route-loader-gif"
        src="/images/loading.gif"
        alt=""
        aria-hidden="true"
        data-image-loader-ignore
      />
    </div>
  </div>
</template>

<style scoped>
.app-root {
  position: relative;
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  min-height: 100dvh;
  overflow-x: clip;
}

.app-main {
  flex: 1 0 auto;
  min-height: 0;
}

.route-loader-overlay {
  position: fixed;
  inset: 0;
  z-index: 140;
  pointer-events: auto;
  overflow: hidden;
}

.route-loader-mask {
  position: absolute;
  inset: 0;
  opacity: 0;
  background:
    radial-gradient(circle at 50% 50%, rgba(20, 54, 84, 0.32) 0%, rgba(4, 12, 24, 0.66) 62%, rgba(3, 7, 20, 0.82) 100%),
    linear-gradient(180deg, rgba(7, 17, 34, 0.3) 0%, rgba(5, 14, 28, 0.58) 100%);
  backdrop-filter: blur(0px) saturate(100%);
  -webkit-backdrop-filter: blur(0px) saturate(100%);
  will-change: opacity, backdrop-filter;
}

.route-loader-gif {
  position: absolute;
  left: 50%;
  top: 50%;
  width: clamp(6.5rem, 12vw, 9.8rem);
  height: auto;
  transform: translate(-50%, -50%) scale(0.72);
  transform-origin: center center;
  opacity: 0;
  filter: drop-shadow(0 14px 28px rgba(0, 0, 0, 0.32));
  will-change: transform, opacity;
}

.route-loader-overlay.is-enter .route-loader-gif {
  animation: loader-gif-enter 420ms cubic-bezier(0.2, 0.86, 0.24, 1) forwards;
}

.route-loader-overlay.is-enter .route-loader-mask {
  animation: loader-mask-enter 420ms cubic-bezier(0.2, 0.86, 0.24, 1) forwards;
}

.route-loader-overlay.is-loading .route-loader-gif {
  transform: translate(-50%, -50%) scale(1);
  opacity: 1;
}

.route-loader-overlay.is-loading .route-loader-mask {
  opacity: 1;
  backdrop-filter: blur(12px) saturate(118%);
  -webkit-backdrop-filter: blur(12px) saturate(118%);
}

.route-loader-overlay.is-exit .route-loader-gif {
  animation: loader-gif-exit 360ms cubic-bezier(0.22, 0.84, 0.26, 1) forwards;
}

.route-loader-overlay.is-exit .route-loader-mask {
  animation: loader-mask-exit 360ms cubic-bezier(0.22, 0.84, 0.26, 1) forwards;
}

@keyframes loader-gif-enter {
  from {
    transform: translate(-50%, -50%) scale(0.72);
    opacity: 0;
  }

  to {
    transform: translate(-50%, -50%) scale(1);
    opacity: 1;
  }
}

@keyframes loader-gif-exit {
  from {
    transform: translate(-50%, -50%) scale(1);
    opacity: 1;
  }

  to {
    transform: translate(-50%, -50%) scale(0.74);
    opacity: 0;
  }
}

@keyframes loader-mask-enter {
  from {
    opacity: 0;
    backdrop-filter: blur(0px) saturate(100%);
    -webkit-backdrop-filter: blur(0px) saturate(100%);
  }

  to {
    opacity: 1;
    backdrop-filter: blur(12px) saturate(118%);
    -webkit-backdrop-filter: blur(12px) saturate(118%);
  }
}

@keyframes loader-mask-exit {
  from {
    opacity: 1;
    backdrop-filter: blur(12px) saturate(118%);
    -webkit-backdrop-filter: blur(12px) saturate(118%);
  }

  to {
    opacity: 0;
    backdrop-filter: blur(0px) saturate(100%);
    -webkit-backdrop-filter: blur(0px) saturate(100%);
  }
}
</style>
