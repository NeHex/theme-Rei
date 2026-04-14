<script setup lang="ts">
import type { NuxtError } from "#app";
import SiteFooter from "~/components/SiteFooter.vue";
import SiteNav from "~/components/SiteNav.vue";

const props = defineProps<{
  error: NuxtError;
}>();

const statusCode = computed(() => Number(props.error?.statusCode || 404));
const isNotFound = computed(() => statusCode.value === 404);
const cardTitle = computed(() => (isNotFound.value ? "页面走丢了" : "页面暂时不可用"));
const cardDescription = computed(() => {
  if (isNotFound.value) return "你访问的页面可能已移动、删除，或输入了错误地址。";
  return String(props.error?.statusMessage || "请求处理失败，请稍后重试。");
});

function goHome() {
  clearError({ redirect: "/" });
}

function goBack() {
  if (import.meta.client && window.history.length > 1) {
    clearError();
    window.history.back();
    return;
  }
  clearError({ redirect: "/" });
}
</script>

<template>
  <div class="error-root">
    <SiteNav />
    <main class="error-main">
      <section class="error-card" role="alert" aria-live="assertive">
        <img
          class="error-illustration"
          src="/error-page-svgrepo-com.svg"
          alt="404 illustration"
          data-image-loader-ignore
        />
        <p class="error-code">{{ statusCode }}</p>
        <h1>{{ cardTitle }}</h1>
        <p class="error-desc">{{ cardDescription }}</p>
        <div class="error-actions">
          <button type="button" class="error-btn error-btn-primary" @click="goHome">回到首页</button>
          <button type="button" class="error-btn error-btn-ghost" @click="goBack">返回上一页</button>
        </div>
      </section>
    </main>
    <SiteFooter />
  </div>
</template>

<style scoped>
.error-root {
  position: relative;
  min-height: 100vh;
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
}

.error-main {
  flex: 1 0 auto;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 7.2rem 1rem 2.2rem;
}

.error-card {
  width: min(92vw, 34rem);
  border-radius: 1.2rem;
  border: 1px solid var(--theme-border);
  background:
    linear-gradient(155deg, rgba(28, 83, 120, 0.16), rgba(6, 22, 42, 0.08)),
    var(--theme-surface);
  backdrop-filter: blur(10px);
  box-shadow: 0 20px 50px rgba(2, 8, 20, 0.5);
  padding: 1.65rem 1.45rem 1.4rem;
  text-align: center;
}

.error-illustration {
  display: block;
  width: clamp(9.2rem, 40vw, 14rem);
  height: auto;
  margin: 0 auto 0.55rem;
}

.error-code {
  margin: 0 0 0.2rem;
  color: var(--theme-accent);
  font-size: clamp(1.6rem, 4vw, 2rem);
  font-weight: 700;
  letter-spacing: 0.04em;
  line-height: 1;
}

h1 {
  margin: 0;
  font-size: clamp(1.3rem, 3.2vw, 1.72rem);
  line-height: 1.2;
}

.error-desc {
  margin: 0.7rem 0 0;
  color: var(--theme-text-soft);
  line-height: 1.75;
}

.error-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.66rem;
  justify-content: center;
  margin-top: 1.18rem;
}

.error-btn {
  appearance: none;
  border: 1px solid transparent;
  border-radius: 999px;
  min-width: 8.8rem;
  height: 2.75rem;
  padding: 0 1.1rem;
  font-size: 0.96rem;
  font-weight: 600;
  color: var(--theme-text);
  cursor: pointer;
  transition: transform 0.18s ease, background-color 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease;
}

.error-btn:hover {
  transform: translateY(-1px);
}

.error-btn:focus-visible {
  outline: 2px solid rgba(42, 212, 225, 0.55);
  outline-offset: 2px;
}

.error-btn-primary {
  background: linear-gradient(135deg, rgba(28, 170, 192, 0.88), rgba(36, 122, 178, 0.84));
  border-color: rgba(90, 215, 236, 0.58);
  box-shadow: 0 10px 24px rgba(10, 84, 120, 0.4);
}

.error-btn-primary:hover {
  background: linear-gradient(135deg, rgba(46, 193, 216, 0.9), rgba(47, 143, 205, 0.86));
}

.error-btn-ghost {
  background: rgba(8, 24, 42, 0.72);
  border-color: rgba(132, 183, 219, 0.33);
}

.error-btn-ghost:hover {
  background: rgba(11, 35, 58, 0.84);
  border-color: rgba(162, 208, 237, 0.5);
}

@media (max-width: 640px) {
  .error-main {
    padding-top: 6.9rem;
  }

  .error-card {
    width: min(94vw, 28rem);
    padding: 1.25rem 1rem 1.15rem;
  }

  .error-actions {
    flex-direction: column;
  }

  .error-btn {
    width: 100%;
  }
}
</style>
