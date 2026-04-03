<script setup lang="ts">
import MarkdownIt from "markdown-it";

const route = useRoute();
const { settings } = useSiteSettings();
const { fetchPageDetail } = useSinglePages();

const pageKey = computed(() => String(route.params.key ?? "").trim());

const {
  data: pageData,
  pending,
  error,
} = useAsyncData(
  () => `single-page-${pageKey.value}`,
  () => fetchPageDetail(pageKey.value),
  {
    watch: [pageKey],
    server: true,
    lazy: false,
  },
);

watchEffect(() => {
  if (!error.value) return;
  throw createError({
    statusCode: Number((error.value as any).statusCode || 404),
    statusMessage: (error.value as any).statusMessage || "页面不存在",
  });
});

useHead(() => ({
  title: `${pageData.value?.title || "独立页"} - ${settings.value.siteTitle}`,
}));

const markdown = new MarkdownIt({
  html: false,
  linkify: true,
  typographer: true,
  breaks: true,
});

const renderedContent = computed(() => markdown.render(pageData.value?.content || ""));
</script>

<template>
  <div class="single-page">
    <main class="single-main">
      <section v-if="pageData" class="single-card">
        <header class="single-header">
          <h1>{{ pageData.title }}</h1>
          <time :datetime="pageData.updatedAt">
            更新于 {{ new Date(pageData.updatedAt).toLocaleDateString("zh-CN") }}
          </time>
        </header>

        <img
          v-if="pageData.coverImage"
          class="single-cover"
          :src="pageData.coverImage"
          :alt="pageData.title"
        />

        <div class="single-content" v-html="renderedContent" />
      </section>

      <section v-else class="single-card">
        <p>{{ pending ? "页面加载中..." : "页面不存在或已下线。" }}</p>
      </section>
    </main>
  </div>
</template>

<style scoped>
.single-page {
  min-height: 100vh;
  padding: 6.2rem 1rem 2.2rem;
  color: var(--theme-text);
}

.single-main {
  width: var(--site-content-width);
  margin: 0 auto;
}

.single-card {
  border-radius: 1rem;
  border: 1px solid var(--theme-border);
  background: var(--theme-surface);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  padding: 1.15rem 1.2rem;
}

.single-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 0.9rem;
  margin-bottom: 1rem;
}

.single-header h1 {
  margin: 0;
  font-size: var(--fs-h1);
  line-height: 1.1;
}

.single-header time {
  color: var(--theme-text-mute);
  font-size: 0.88rem;
}

.single-cover {
  width: 100%;
  max-height: 22rem;
  object-fit: cover;
  border-radius: 0.8rem;
  margin-bottom: 1rem;
}

.single-content :deep(*) {
  max-width: 100%;
}

.single-content :deep(p) {
  margin: 0.9rem 0;
  line-height: 1.8;
  color: rgba(219, 232, 245, 0.86);
}

.single-content :deep(h2),
.single-content :deep(h3),
.single-content :deep(h4) {
  margin: 1.2rem 0 0.65rem;
  color: rgba(239, 247, 255, 0.96);
}

.single-content :deep(code) {
  background: rgba(40, 52, 70, 0.66);
  padding: 0.08rem 0.32rem;
  border-radius: 0.28rem;
}

.single-content :deep(pre) {
  margin: 0.85rem 0;
  border-radius: 0.72rem;
  padding: 0.82rem 0.92rem;
  background: rgba(8, 17, 31, 0.92);
  border: 1px solid rgba(92, 133, 160, 0.26);
  overflow: auto;
}

.single-content :deep(pre code) {
  background: transparent;
  padding: 0;
}
</style>
