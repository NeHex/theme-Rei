<script setup lang="ts">
import MarkdownIt from "markdown-it";
import { mapArticleApiItem } from "~/composables/useArticles";
import type { ArticleApiItem } from "~/composables/useArticles";
import { installMarkdownExternalLinkRule, resolveSiteHostname } from "~/utils/link";

const route = useRoute();
const { settings } = useSiteSettings();
const requestUrl = useRequestURL();
const DISPLAY_TIME_ZONE = "Asia/Shanghai";

const articleId = computed(() => String(route.params.id ?? "").trim());
const { article, pending, error } = useArticleDetail(articleId);
const displayViews = ref(0);
const displayLikes = ref(0);
const isLiking = ref(false);
const isLiked = ref(false);
const likeHint = ref("");
const shareHint = ref("");
const markdownBodyRef = ref<HTMLElement | null>(null);
let actionHintTimer: ReturnType<typeof setTimeout> | null = null;

type ArticleDetailApiResponse = {
  data: ArticleApiItem;
};

watch(
  article,
  (next) => {
    displayViews.value = Number(next?.views || 0);
    displayLikes.value = Number(next?.likes || 0);
  },
  { immediate: true },
);

watch(articleId, () => {
  isLiked.value = false;
  likeHint.value = "";
  shareHint.value = "";
});

watch(
  articleId,
  async (id) => {
    if (import.meta.server) return;
    if (!id) return;

    try {
      const response = await $fetch<ArticleDetailApiResponse>(`/api/article/${id}/read`, {
        method: "POST",
      });
      const mapped = mapArticleApiItem(response.data);
      displayViews.value = mapped.views;
      displayLikes.value = mapped.likes;
    } catch (error) {
      console.warn("[article-detail] failed to increase read count", error);
    }
  },
  { immediate: true },
);

watchEffect(() => {
  if (!error.value) return;
  throw createError({
    statusCode: Number((error.value as any).statusCode || 500),
    statusMessage: (error.value as any).statusMessage || "Article Not Found",
  });
});

function compactText(raw: string) {
  return raw
    .replace(/\r\n/g, "\n")
    .replace(/\n{2,}/g, "\n")
    .replace(/\s+/g, " ")
    .trim();
}

function toAbsoluteUrl(pathOrUrl: string) {
  const input = String(pathOrUrl || "").trim();
  if (!input) return "";
  if (/^https?:\/\//i.test(input)) return input;
  return `${siteBaseUrl.value}${input.startsWith("/") ? input : `/${input}`}`;
}

const siteBaseUrl = computed(() => {
  const configured = String(settings.value.siteUrl || "").trim();
  if (configured) return configured.replace(/\/+$/, "");
  return `${requestUrl.protocol}//${requestUrl.host}`;
});
const siteHostname = computed(() =>
  resolveSiteHostname(settings.value.siteUrl, `${requestUrl.protocol}//${requestUrl.host}`),
);

const canonicalUrl = computed(() => {
  const articlePath = articleId.value ? `/article/${encodeURIComponent(articleId.value)}` : "/article";
  return `${siteBaseUrl.value}${articlePath}`;
});

const seoDescription = computed(() => {
  const summary = String(article.value?.summary || "").trim();
  const fallback = compactText(String(article.value?.content || ""));
  const source = summary || fallback || settings.value.siteDesc;
  return source.slice(0, 160) || settings.value.siteDesc;
});

const ogImage = computed(() => {
  const cover = String(article.value?.cover || "").trim();
  const fallback = String(settings.value.userHeadpic || "/images/head.jpg").trim();
  return toAbsoluteUrl(cover || fallback);
});

const articleSchema = computed(() => {
  if (!article.value) return null;
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.value.title,
    description: seoDescription.value,
    image: ogImage.value ? [ogImage.value] : undefined,
    datePublished: article.value.publishedAt,
    dateModified: article.value.updatedAt,
    mainEntityOfPage: canonicalUrl.value,
    author: {
      "@type": "Person",
      name: settings.value.userName || settings.value.siteTitle,
    },
    publisher: {
      "@type": "Organization",
      name: settings.value.siteTitle,
      logo: ogImage.value
        ? {
            "@type": "ImageObject",
            url: ogImage.value,
          }
        : undefined,
    },
  };
});

useHead(() => ({
  title: `${article.value?.title ?? "文章"} - ${settings.value.siteTitle}`,
  link: [
    {
      rel: "canonical",
      href: canonicalUrl.value,
    },
  ],
  meta: [
    {
      name: "description",
      content: seoDescription.value,
    },
    {
      property: "og:type",
      content: "article",
    },
    {
      property: "og:title",
      content: `${article.value?.title ?? "文章"} - ${settings.value.siteTitle}`,
    },
    {
      property: "og:description",
      content: seoDescription.value,
    },
    {
      property: "og:url",
      content: canonicalUrl.value,
    },
    {
      property: "og:image",
      content: ogImage.value,
    },
    {
      name: "twitter:card",
      content: "summary_large_image",
    },
    {
      name: "twitter:title",
      content: `${article.value?.title ?? "文章"} - ${settings.value.siteTitle}`,
    },
    {
      name: "twitter:description",
      content: seoDescription.value,
    },
    {
      name: "twitter:image",
      content: ogImage.value,
    },
  ],
  script: articleSchema.value
    ? [
        {
          type: "application/ld+json",
          key: "article-schema",
          children: JSON.stringify(articleSchema.value),
        },
      ]
    : [],
}));

const markdown = new MarkdownIt({
  html: false,
  linkify: true,
  typographer: true,
  breaks: true,
});
installMarkdownExternalLinkRule(markdown, () => siteHostname.value);

const renderedMarkdown = computed(() => markdown.render(article.value?.content || ""));
const articleInfoStyle = computed<Record<string, string>>(() => {
  const cover = String(article.value?.cover || "").trim();
  if (!cover) return {};

  const coverUrl = String(toAbsoluteUrl(cover) || cover).replace(/"/g, '\\"');
  return {
    "--article-cover-url": `url("${coverUrl}")`,
  };
});

function formatDate(dateInput: string) {
  const date = new Date(dateInput);
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
    timeZone: DISPLAY_TIME_ZONE,
  }).format(date);
}

function formatCount(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

function handleCommentSubmit(payload: {
  content: string;
  targetType: string;
  targetId: number;
  parentId: number;
}) {
  console.log("[comment-mock-submit]", payload);
}

function setActionHint(kind: "like" | "share", message: string) {
  if (kind === "like") {
    likeHint.value = message;
    shareHint.value = "";
  } else {
    shareHint.value = message;
    likeHint.value = "";
  }

  if (!import.meta.client) return;
  if (actionHintTimer !== null) {
    window.clearTimeout(actionHintTimer);
  }
  actionHintTimer = window.setTimeout(() => {
    likeHint.value = "";
    shareHint.value = "";
    actionHintTimer = null;
  }, 2400);
}

async function copyText(text: string) {
  if (!import.meta.client) return false;

  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Ignore and fallback below.
  }

  try {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "true");
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    textarea.style.pointerEvents = "none";
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    const copied = document.execCommand("copy");
    document.body.removeChild(textarea);
    return copied;
  } catch {
    return false;
  }
}

async function shareCurrentArticle() {
  if (!article.value || !import.meta.client) return;

  const title = String(article.value.title || settings.value.siteTitle || "文章").trim();
  const text = String(article.value.summary || settings.value.siteDesc || "").trim();
  const url = canonicalUrl.value;

  try {
    if (navigator.share) {
      await navigator.share({
        title,
        text: text || title,
        url,
      });
      setActionHint("share", "已调起系统分享");
      return;
    }
  } catch (error: any) {
    if (String(error?.name || "") === "AbortError") return;
  }

  const copied = await copyText(url);
  setActionHint("share", copied ? "链接已复制" : "分享失败，请手动复制链接");
}

async function likeCurrentArticle() {
  if (!article.value || isLiking.value || isLiked.value) return;
  isLiking.value = true;
  likeHint.value = "";
  shareHint.value = "";

  try {
    const response = await $fetch<ArticleDetailApiResponse>(`/api/article/${article.value.id}/like`, {
      method: "POST",
    });
    const mapped = mapArticleApiItem(response.data);
    displayViews.value = mapped.views;
    displayLikes.value = mapped.likes;
    isLiked.value = true;
    setActionHint("like", "已点赞");
  } catch (error: any) {
    const statusCode = Number(error?.statusCode || error?.response?.status || 0);
    if (statusCode === 409) {
      isLiked.value = true;
      setActionHint("like", "你已点赞过");
      return;
    }
    setActionHint("like", "点赞失败，请稍后重试");
  } finally {
    isLiking.value = false;
  }
}

function applyMarkdownImageShapeClass(image: HTMLImageElement) {
  const naturalWidth = Number(image.naturalWidth || 0);
  const naturalHeight = Number(image.naturalHeight || 0);
  if (naturalWidth <= 0 || naturalHeight <= 0) return;

  const isPortrait = naturalHeight > naturalWidth * 1.08;
  image.classList.toggle("markdown-image-portrait", isPortrait);
  image.classList.toggle("markdown-image-landscape", !isPortrait);
}

function updateMarkdownImageShape() {
  if (!import.meta.client) return;
  const root = markdownBodyRef.value;
  if (!root) return;

  const images = Array.from(root.querySelectorAll("img"));
  for (const image of images) {
    if (image.complete) {
      applyMarkdownImageShapeClass(image);
      continue;
    }

    image.addEventListener("load", () => {
      applyMarkdownImageShapeClass(image);
    }, { once: true });
  }
}

if (import.meta.client) {
  watch(
    renderedMarkdown,
    async () => {
      await nextTick();
      updateMarkdownImageShape();
    },
  );

  onMounted(() => {
    void nextTick(() => {
      updateMarkdownImageShape();
    });
  });
}

onBeforeUnmount(() => {
  if (!import.meta.client || actionHintTimer === null) return;
  window.clearTimeout(actionHintTimer);
  actionHintTimer = null;
});
</script>

<template>
  <div class="article-page">
    <main class="article-main">
      <div class="article-nav">
        <NuxtLink prefetch="false" to="/article" class="article-back" aria-label="返回文章列表">
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M14.5 5.5L8 12l6.5 6.5" />
          </svg>
        </NuxtLink>
      </div>

      <template v-if="article">
        <header
          class="article-info"
          :class="{ 'has-cover': Boolean(article.cover) }"
          :style="articleInfoStyle"
        >
          <p class="article-kicker">BLOG ARTICLE</p>
          <h1>{{ article.title }}</h1>

          <div class="article-meta-row">
            <time :datetime="article.publishedAt">{{ formatDate(article.publishedAt) }}</time>
            <span class="meta-dot" aria-hidden="true"></span>
            <span>阅读 {{ formatCount(displayViews) }}</span>
            <span class="meta-dot" aria-hidden="true"></span>
            <span>点赞 {{ formatCount(displayLikes) }}</span>
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

        <div class="article-card-wrap">
          <article class="article-card">
            <div ref="markdownBodyRef" class="markdown-body" v-html="renderedMarkdown" />
          </article>
          <div class="article-float-actions" role="group" aria-label="文章操作">
            <button
              class="article-icon-button"
              type="button"
              aria-label="分享文章"
              @click="shareCurrentArticle"
            >
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M15 5.5L19.5 10L15 14.5" />
                <path d="M7.5 10H19.2" />
                <path d="M19 14.8V18.1C19 19.2 18.1 20.1 17 20.1H6.9C5.8 20.1 4.9 19.2 4.9 18.1V5.9C4.9 4.8 5.8 3.9 6.9 3.9H10.1" />
              </svg>
            </button>
            <button
              class="article-icon-button article-like-icon-button"
              type="button"
              :aria-label="isLiked ? '已点赞' : '点赞文章'"
              :title="isLiked ? '已点赞' : isLiking ? '点赞中...' : '点赞'"
              :disabled="isLiking || isLiked"
              :class="{ 'is-liked': isLiked }"
              @click="likeCurrentArticle"
            >
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M12 20.2C11.7 20.2 11.4 20.1 11.2 19.9L6.5 15.6C4.4 13.6 3 12.2 3 9.9C3 7.9 4.5 6.4 6.5 6.4C7.6 6.4 8.6 6.9 9.3 7.8L12 10.8L14.7 7.8C15.4 6.9 16.4 6.4 17.5 6.4C19.5 6.4 21 7.9 21 9.9C21 12.2 19.6 13.6 17.5 15.6L12.8 19.9C12.6 20.1 12.3 20.2 12 20.2Z" />
              </svg>
            </button>
            <span class="article-like-count">{{ formatCount(displayLikes) }}</span>
          </div>
          <p v-if="likeHint || shareHint" class="article-action-hint">{{ likeHint || shareHint }}</p>
        </div>

        <CommentSection
          :article-id="article.id"
          @submit="handleCommentSubmit"
        />
      </template>

      <section v-else class="article-card article-loading">
        <p>{{ pending ? "文章加载中..." : "文章不存在或已被删除。" }}</p>
      </section>
    </main>
  </div>
</template>

<style scoped>
.article-page {
  position: relative;
  min-height: 100vh;
  padding: 6.4rem 0.8rem 2.2rem;
  isolation: isolate;
  color: var(--theme-text);
  background: transparent;
}

.article-page::after {
  content: "";
  position: fixed;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  background-image: url("/exported_image_sck.svg");
  background-position: center center;
  background-repeat: no-repeat;
  background-size: cover;
  opacity: 0.24;
  filter: invert(1) contrast(1.08) brightness(1.18);
  mix-blend-mode: screen;
  transform: translateZ(0);
  will-change: transform;
}

.article-main {
  position: relative;
  z-index: 1;
  width: calc(var(--site-max-width) - 20.6rem);
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
  position: relative;
  overflow: hidden;
  isolation: isolate;
  margin-bottom: 1rem;
  padding: 1rem 1.1rem;
  border-radius: 1rem;
  border: 1px solid var(--theme-border);
  background: var(--theme-surface);
  backdrop-filter: blur(8px);
}

.article-info.has-cover::before {
  content: "";
  position: absolute;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  background-image:
    linear-gradient(
      to right,
      rgba(8, 15, 27, 0.98) 0%,
      rgba(8, 15, 27, 0.9) 32%,
      rgba(8, 15, 27, 0.58) 62%,
      rgba(8, 15, 27, 0.16) 84%,
      rgba(8, 15, 27, 0.04) 100%
    ),
    var(--article-cover-url);
  background-repeat: no-repeat;
  background-size: cover, cover;
  background-position: center, right center;
}

.article-info > * {
  position: relative;
  z-index: 1;
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

.article-card-wrap {
  position: relative;
  margin-bottom: 0.35rem;
}

.article-float-actions {
  position: absolute;
  right: -3.6rem;
  bottom: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
}

.article-icon-button {
  width: 2.65rem;
  height: 2.65rem;
  border: 1px solid rgba(123, 193, 222, 0.34);
  border-radius: 999px;
  background: rgba(8, 27, 42, 0.82);
  color: rgba(225, 242, 255, 0.96);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 10px 24px rgba(0, 0, 0, 0.24);
  transition: border-color 0.2s ease, transform 0.2s ease, background-color 0.2s ease;
}

.article-icon-button svg {
  width: 1.2rem;
  height: 1.2rem;
}

.article-icon-button path {
  stroke: currentColor;
  stroke-width: 1.8;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.article-icon-button:hover:not(:disabled) {
  border-color: rgba(170, 227, 250, 0.66);
  background: rgba(12, 41, 63, 0.9);
  transform: translateY(-1px);
}

.article-icon-button:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.article-like-icon-button.is-liked {
  color: #95f2ff;
  border-color: rgba(149, 242, 255, 0.5);
  background: rgba(24, 64, 82, 0.9);
}

.article-like-count {
  min-width: 2.65rem;
  padding: 0.22rem 0.4rem;
  border-radius: 999px;
  border: 1px solid rgba(118, 170, 194, 0.3);
  background: rgba(7, 22, 35, 0.86);
  color: rgba(191, 219, 238, 0.94);
  font-size: 0.78rem;
  line-height: 1.2;
  text-align: center;
}

.article-action-hint {
  position: absolute;
  right: -4.65rem;
  bottom: -2rem;
  width: 4.7rem;
  margin: 0;
  text-align: center;
  font-size: 0.74rem;
  color: rgba(186, 214, 234, 0.96);
}

.article-loading {
  display: grid;
  place-items: center;
  min-height: 12rem;
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
  display: block;
  margin: 1rem auto;
  width: auto;
  max-width: min(100%, 52rem);
  max-height: min(76vh, 54rem);
  height: auto;
  border-radius: 0.68rem;
}

.markdown-body :deep(img.markdown-image-portrait) {
  max-width: min(72vw, 25rem);
  max-height: min(82vh, 48rem);
}

@media (max-width: 1080px) {
  .article-main {
    width: var(--site-max-width);
  }
}

@media (max-width: 760px) {
  .article-page {
    margin-top:2em;
    padding: 5.9rem 0.55rem 2.4rem;
  }

  .article-main {
    width: min(96%, 1560px);
  }

  .article-info,
  .article-card {
    padding: 1rem;
  }

  .article-float-actions {
    right: 0.55rem;
    bottom: 0.55rem;
    gap: 0.45rem;
  }

  .article-icon-button {
    width: 2.45rem;
    height: 2.45rem;
  }

  .article-like-count {
    min-width: 2.45rem;
    font-size: 0.74rem;
  }

  .article-action-hint {
    right: 0.35rem;
    bottom: -1.45rem;
    width: 4rem;
  }

  .markdown-body :deep(h1) {
    font-size: 1.72rem;
  }

  .markdown-body :deep(h2) {
    font-size: 1.45rem;
  }

  .markdown-body :deep(img.markdown-image-portrait) {
    max-width: min(82vw, 19.5rem);
  }
}
</style>
