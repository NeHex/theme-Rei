<script setup lang="ts">
const isRouteLoading = ref(false);
const MIN_LOADER_VISIBLE_MS = 320;

let hideTimer: ReturnType<typeof setTimeout> | null = null;
let loaderStartAt = 0;

function startLoading() {
  if (hideTimer) {
    clearTimeout(hideTimer);
    hideTimer = null;
  }

  if (!isRouteLoading.value) {
    isRouteLoading.value = true;
    loaderStartAt = Date.now();
  }
}

function stopLoading() {
  if (!isRouteLoading.value) return;

  const elapsed = Date.now() - loaderStartAt;
  const remain = Math.max(0, MIN_LOADER_VISIBLE_MS - elapsed);

  hideTimer = setTimeout(() => {
    isRouteLoading.value = false;
    hideTimer = null;
  }, remain);
}

if (import.meta.client) {
  const router = useRouter();
  const nuxtApp = useNuxtApp();

  router.beforeEach((to, from) => {
    if (to.fullPath !== from.fullPath) {
      startLoading();
    }
    return true;
  });

  router.afterEach(() => {
    stopLoading();
  });

  nuxtApp.hook("app:error", () => {
    stopLoading();
  });
}
</script>

<template>
  <div>
    <NuxtRouteAnnouncer />
    <SiteNav />
    <NuxtPage />
    <SiteFooter />

    <Transition name="route-loader-fade">
      <div
        v-if="isRouteLoading"
        class="route-loader-overlay"
        role="status"
        aria-live="polite"
        aria-label="页面加载中"
      >
        <div class="route-loader-spinner" />
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.route-loader-overlay {
  position: fixed;
  inset: 0;
  z-index: 120;
  display: grid;
  place-items: center;
  pointer-events: none;
  background: radial-gradient(
    circle at center,
    rgba(5, 18, 34, 0.24) 0%,
    rgba(5, 18, 34, 0.1) 46%,
    rgba(5, 18, 34, 0) 74%
  );
}

.route-loader-spinner {
  width: 3.2rem;
  height: 3.2rem;
  border-radius: 999px;
  border: 3px solid rgba(151, 206, 239, 0.24);
  border-top-color: #62d9e8;
  box-shadow: 0 0 30px rgba(61, 187, 220, 0.24);
  animation: route-spin 0.78s linear infinite;
}

.route-loader-fade-enter-active,
.route-loader-fade-leave-active {
  transition: opacity 0.18s ease;
}

.route-loader-fade-enter-from,
.route-loader-fade-leave-to {
  opacity: 0;
}

@keyframes route-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
