<script setup lang="ts">
import MarkdownIt from "markdown-it";

const route = useRoute();
const { settings } = useSiteSettings();

const articleId = computed(() => String(route.params.id ?? "").trim());
const { article, pending, error } = useArticleDetail(articleId);

watchEffect(() => {
  if (!error.value) return;
  throw createError({
    statusCode: Number((error.value as any).statusCode || 500),
    statusMessage: (error.value as any).statusMessage || "Article Not Found",
  });
});

useHead(() => ({
  title: `${article.value?.title ?? "文章"} - ${settings.value.siteTitle}`,
}));

const markdown = new MarkdownIt({
  html: false,
  linkify: true,
  typographer: true,
  breaks: true,
});

const renderedMarkdown = computed(() => markdown.render(article.value?.content || ""));

function formatDate(dateInput: string) {
  const date = new Date(dateInput);
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  }).format(date);
}

function formatCount(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}
</script>

<template>
  <div class="article-page">
    <main class="article-main">
      <div class="article-nav">
        <NuxtLink to="/article" class="article-back" aria-label="返回文章列表">
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M14.5 5.5L8 12l6.5 6.5" />
          </svg>
        </NuxtLink>
      </div>

      <template v-if="article">
        <header class="article-info">
          <p class="article-kicker">BLOG ARTICLE</p>
          <h1>{{ article.title }}</h1>

          <div class="article-meta-row">
            <time :datetime="article.publishedAt">{{ formatDate(article.publishedAt) }}</time>
            <span class="meta-dot" aria-hidden="true"></span>
            <span>阅读 {{ formatCount(article.views) }}</span>
            <span class="meta-dot" aria-hidden="true"></span>
            <span>分类 <mark>{{ article.category }}</mark></span>
          </div>

          <p v-if="article.tags.length" class="article-tags">
            <span v-for="tag in article.tags" :key="tag">#{{ tag }}</span>
          </p>

          <address>
            最后更新：{{ formatDate(article.updatedAt) }}
          </address>
        </header>

        <article class="article-card">
          <img v-if="article.cover" :src="article.cover" :alt="article.title" class="article-cover" />
          <div class="markdown-body" v-html="renderedMarkdown" />
        </article>
      </template>

      <section v-else class="article-card article-loading">
        <p>{{ pending ? "文章加载中..." : "文章不存在或已被删除。" }}</p>
      </section>
    </main>
  </div>
</template>

<style scoped>
.article-page {
  min-height: 100vh;
  padding: 6.4rem 1rem 2.2rem;
  color: var(--theme-text);
  background: transparent;
}

.article-main {
  width: var(--site-content-width);
  margin: 0 auto;
}

.article-nav {
  margin-bottom: 1rem;
}

.article-back {
  width: 2.4rem;
  height: 2.4rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  color: rgba(231, 243, 255, 0.92);
  border: 1px solid rgba(151, 201, 231, 0.26);
  background: rgba(8, 18, 32, 0.62);
  backdrop-filter: blur(10px);
  text-decoration: none;
  transition: all 0.2s ease;
}

.article-back:hover {
  color: #ffffff;
  border-color: rgba(182, 226, 251, 0.5);
  background: rgba(10, 24, 42, 0.84);
  box-shadow: 0 10px 24px rgba(0, 0, 0, 0.3);
}

.article-back svg {
  width: 1.15rem;
  height: 1.15rem;
}

.article-back path {
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.article-info {
  margin-bottom: 1rem;
  padding: 1rem 1.1rem;
  border-radius: 1rem;
  border: 1px solid var(--theme-border);
  background: var(--theme-surface);
  backdrop-filter: blur(8px);
}

.article-kicker {
  margin: 0;
  color: #2ad4e1;
  font-weight: 700;
  letter-spacing: 0.12em;
}

.article-info h1 {
  margin: 0.3rem 0 0.65rem;
  font-size: var(--fs-h1);
}

.article-meta-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem 0.55rem;
  align-items: center;
  color: rgba(186, 206, 222, 0.78);
}

.article-meta-row mark {
  border-radius: 999px;
  padding: 0.12rem 0.45rem;
  color: #d5f6ff;
  background: rgba(42, 212, 225, 0.2);
}

.meta-dot {
  width: 0.3rem;
  height: 0.3rem;
  border-radius: 50%;
  background: rgba(153, 191, 217, 0.52);
}

.article-tags {
  margin: 0.72rem 0 0;
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.article-tags span {
  border-radius: 999px;
  border: 1px solid rgba(118, 170, 194, 0.28);
  padding: 0.18rem 0.5rem;
  color: rgba(199, 223, 243, 0.88);
  font-size: 0.86rem;
}

address {
  margin-top: 0.65rem;
  font-style: normal;
  color: rgba(171, 196, 216, 0.78);
}

.article-card {
  padding: 1.2rem;
  border-radius: 1rem;
  border: 1px solid var(--theme-border);
  background: var(--theme-surface);
  backdrop-filter: blur(8px);
}

.article-loading {
  display: grid;
  place-items: center;
  min-height: 12rem;
}

.article-cover {
  width: 100%;
  display: block;
  border-radius: 0.8rem;
  margin-bottom: 1.15rem;
}

.markdown-body :deep(*) {
  box-sizing: border-box;
}

.markdown-body :deep(h1),
.markdown-body :deep(h2),
.markdown-body :deep(h3),
.markdown-body :deep(h4),
.markdown-body :deep(h5),
.markdown-body :deep(h6) {
  color: rgba(230, 243, 255, 0.96);
  margin: 1.05em 0 0.58em;
  line-height: 1.3;
}

.markdown-body :deep(h1) {
  font-size: 2rem;
}

.markdown-body :deep(h2) {
  font-size: 1.6rem;
}

.markdown-body :deep(h3) {
  font-size: 1.35rem;
}

.markdown-body :deep(p),
.markdown-body :deep(li),
.markdown-body :deep(blockquote) {
  line-height: 1.82;
  color: rgba(206, 223, 240, 0.9);
}

.markdown-body :deep(p) {
  margin: 0.78em 0;
}

.markdown-body :deep(ul),
.markdown-body :deep(ol) {
  margin: 0.7em 0;
  padding-left: 1.3rem;
}

.markdown-body :deep(blockquote) {
  margin: 0.95em 0;
  padding: 0.62rem 0.86rem;
  border-left: 3px solid #2ad4e1;
  background: rgba(255, 255, 255, 0.04);
  border-radius: 0.35rem;
}

.markdown-body :deep(pre) {
  margin: 0.9em 0;
  overflow-x: auto;
  padding: 0.9rem;
  border-radius: 0.7rem;
  background: rgba(0, 0, 0, 0.35);
}

.markdown-body :deep(code) {
  font-family: inherit;
  font-size: 0.92em;
}

.markdown-body :deep(p code),
.markdown-body :deep(li code) {
  padding: 0.08rem 0.35rem;
  border-radius: 0.32rem;
  background: rgba(255, 255, 255, 0.08);
}

.markdown-body :deep(hr) {
  border: 0;
  border-top: 1px solid var(--theme-border);
  margin: 1.2em 0;
}

.markdown-body :deep(table) {
  width: 100%;
  border-collapse: collapse;
  margin: 1em 0;
  border-radius: 0.62rem;
  overflow: hidden;
}

.markdown-body :deep(th),
.markdown-body :deep(td) {
  border: 1px solid var(--theme-border);
  padding: 0.5rem 0.6rem;
  text-align: left;
}

.markdown-body :deep(img) {
  max-width: 100%;
  border-radius: 0.68rem;
}

@media (max-width: 760px) {
  .article-page {
    padding: 5.8rem 0.55rem 2rem;
  }

  .article-main {
    width: min(96%, 980px);
  }

  .article-info,
  .article-card {
    padding: 1rem;
  }

  .markdown-body :deep(h1) {
    font-size: 1.72rem;
  }

  .markdown-body :deep(h2) {
    font-size: 1.45rem;
  }
}
</style>
