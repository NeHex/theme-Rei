<script setup lang="ts">
type LoaderPhase = "enter" | "boost" | "loading" | "exit";

const isRouteLoading = ref(false);
const loaderPhase = ref<LoaderPhase>("enter");

const ENTER_MS = 520;
const BOOST_MS = 320;
const EXIT_MS = 540;
const MIN_LOADER_VISIBLE_MS = 920;

let loaderStartAt = 0;
let settleTimer: ReturnType<typeof setTimeout> | null = null;
const phaseTimers: ReturnType<typeof setTimeout>[] = [];
let enterGate: Promise<void> | null = null;
let resolveEnterGate: (() => void) | null = null;

function clearPhaseTimers() {
  while (phaseTimers.length) {
    const timer = phaseTimers.pop();
    if (timer) clearTimeout(timer);
  }
}

function releaseEnterGate() {
  if (resolveEnterGate) {
    resolveEnterGate();
    resolveEnterGate = null;
  }
  enterGate = null;
}

function clearSettleTimer() {
  if (!settleTimer) return;
  clearTimeout(settleTimer);
  settleTimer = null;
}

function queuePhaseTimer(callback: () => void, durationMs: number) {
  const timer = setTimeout(callback, durationMs);
  phaseTimers.push(timer);
}

function startLoading() {
  clearSettleTimer();

  if (!isRouteLoading.value) {
    clearPhaseTimers();
    releaseEnterGate();
    isRouteLoading.value = true;
    loaderPhase.value = "enter";
    loaderStartAt = Date.now();
    enterGate = new Promise<void>((resolve) => {
      resolveEnterGate = resolve;
    });

    queuePhaseTimer(() => {
      if (!isRouteLoading.value || loaderPhase.value !== "enter") return;
      loaderPhase.value = "boost";
      releaseEnterGate();

      queuePhaseTimer(() => {
        if (!isRouteLoading.value || loaderPhase.value !== "boost") return;
        loaderPhase.value = "loading";
      }, BOOST_MS);
    }, ENTER_MS);
    return enterGate;
  }

  if (loaderPhase.value === "exit") {
    clearPhaseTimers();
    loaderPhase.value = "loading";
    releaseEnterGate();
  }

  return Promise.resolve();
}

function stopLoading() {
  if (!isRouteLoading.value) return;

  releaseEnterGate();
  const elapsed = Date.now() - loaderStartAt;
  const remain = Math.max(0, MIN_LOADER_VISIBLE_MS - elapsed);
  clearSettleTimer();

  settleTimer = setTimeout(() => {
    if (!isRouteLoading.value) return;

    clearPhaseTimers();
    loaderPhase.value = "exit";

    queuePhaseTimer(() => {
      isRouteLoading.value = false;
      loaderPhase.value = "enter";
      clearPhaseTimers();
      releaseEnterGate();
    }, EXIT_MS);
  }, remain);
}

if (import.meta.client) {
  const router = useRouter();
  const nuxtApp = useNuxtApp();

  router.beforeEach(async (to, from) => {
    if (to.fullPath !== from.fullPath) {
      await startLoading();
    }
    return true;
  });

  router.afterEach(() => {
    stopLoading();
  });

  nuxtApp.hook("page:finish", () => {
    stopLoading();
  });

  nuxtApp.hook("app:error", () => {
    stopLoading();
  });

  onBeforeUnmount(() => {
    clearPhaseTimers();
    clearSettleTimer();
    releaseEnterGate();
  });
}
</script>

<template>
  <div class="app-root">
    <NuxtRouteAnnouncer />
    <SiteNav />
    <NuxtPage />
    <SiteFooter />

    <div
      v-if="isRouteLoading"
      class="route-loader-overlay"
      :class="`is-${loaderPhase}`"
      role="status"
      aria-live="polite"
      aria-label="页面加载中"
    >
      <img
        class="route-loader-gif"
        src="/images/loading.gif"
        alt=""
        aria-hidden="true"
      />
    </div>
  </div>
</template>

<style scoped>
.app-root {
  position: relative;
  min-height: 100vh;
  overflow-x: clip;
}

.route-loader-overlay {
  position: fixed;
  inset: 0;
  z-index: 140;
  pointer-events: auto;
}

.route-loader-gif {
  position: absolute;
  left: 50%;
  top: 50%;
  width: clamp(6.5rem, 12vw, 9.8rem);
  height: auto;
  transform: translate(-50%, 170%) scale(1);
  transform-origin: center center;
  filter: drop-shadow(0 14px 28px rgba(0, 0, 0, 0.32));
  will-change: transform;
}

.route-loader-overlay.is-enter .route-loader-gif {
  animation: loader-enter 520ms cubic-bezier(0.18, 0.84, 0.3, 1) forwards;
}

.route-loader-overlay.is-boost .route-loader-gif {
  animation: loader-boost 320ms cubic-bezier(0.22, 0.9, 0.26, 1) forwards;
}

.route-loader-overlay.is-loading .route-loader-gif {
  transform: translate(-50%, -50%) scale(1.3);
}

.route-loader-overlay.is-exit .route-loader-gif {
  animation: loader-exit 540ms cubic-bezier(0.2, 0.86, 0.25, 1) forwards;
}

@keyframes loader-enter {
  from {
    transform: translate(-50%, 170%) scale(1);
  }

  to {
    transform: translate(-50%, -50%) scale(1);
  }
}

@keyframes loader-boost {
  from {
    transform: translate(-50%, -50%) scale(1);
  }

  to {
    transform: translate(-50%, -50%) scale(1.3);
  }
}

@keyframes loader-exit {
  from {
    transform: translate(-50%, -50%) scale(1.3);
  }

  to {
    transform: translate(-50%, 175%) scale(1.08);
  }
}
</style>
