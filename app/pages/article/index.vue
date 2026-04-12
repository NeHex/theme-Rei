<script setup lang="ts">
import { mapArticleApiItem } from "~/composables/useArticles";
import type { ArticleApiItem, ArticleViewItem } from "~/composables/useArticles";

type ArticlePagination = {
  page: number;
  size: number;
  total: number;
  total_pages: number;
};

type ArticleTagStat = {
  tag: string;
  count: number;
};

type ArticleListApiResponse = {
  data: ArticleApiItem[];
  pagination?: Partial<ArticlePagination> | null;
  tag_stats?: ArticleTagStat[];
};

const { settings } = useSiteSettings();
const requestUrl = useRequestURL();

const siteBaseUrl = computed(() => {
  const configured = String(settings.value.siteUrl || "").trim();
  if (configured) return configured.replace(/\/+$/, "");
  return `${requestUrl.protocol}//${requestUrl.host}`;
});
const canonicalUrl = computed(() => `${siteBaseUrl.value}/article`);
const seoDescription = computed(() => `文章列表与分类检索 - ${settings.value.siteDesc}`);
const ogImage = computed(() => {
  const input = String(settings.value.userHeadpic || "/images/head.jpg").trim();
  if (!input) return "";
  if (/^https?:\/\//i.test(input)) return input;
  return `${siteBaseUrl.value}${input.startsWith("/") ? input : `/${input}`}`;
});
const articleListSchema = computed(() => ({
  "@context": "https://schema.org",
  "@type": "CollectionPage",
  name: `文章 - ${settings.value.siteTitle}`,
  description: seoDescription.value,
  url: canonicalUrl.value,
}));

useHead(() => ({
  title: `文章 - ${settings.value.siteTitle}`,
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
      content: "website",
    },
    {
      property: "og:title",
      content: `文章 - ${settings.value.siteTitle}`,
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
  ],
  script: [
    {
      type: "application/ld+json",
      key: "article-list-schema",
      children: JSON.stringify(articleListSchema.value),
    },
  ],
}));

const sortBy = ref<"latest" | "oldest" | "updated">("latest");
const searchKeyword = ref("");
const activeTag = ref<string | null>(null);
const currentPage = ref(1);
const pageSize = 10;
const BLOG_TEXT = "BLOG";
const BLOG_LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

const blogAnimatedText = ref(BLOG_TEXT);
let blogTextIntervalId: number | null = null;
const blogTextTimeoutIds: number[] = [];
let searchDebounceTimer: number | null = null;
const debouncedKeyword = ref("");

const articleQuery = computed(() => ({
  page: currentPage.value,
  size: pageSize,
  sort: sortBy.value,
  q: debouncedKeyword.value || undefined,
  tag: activeTag.value || undefined,
}));

const {
  data: articleList,
  pending: articlePending,
  error: articleError,
} = useAsyncData(
  "article-list",
  async () => {
    const response = await $fetch<ArticleListApiResponse>("/api/article", {
      query: articleQuery.value,
    });

    const items = (response.data ?? []).map(mapArticleApiItem);
    const pagination = {
      page: Number(response.pagination?.page ?? currentPage.value),
      size: Number(response.pagination?.size ?? pageSize),
      total: Number(response.pagination?.total ?? items.length),
      total_pages: Number(response.pagination?.total_pages ?? (items.length > 0 ? 1 : 0)),
    } satisfies ArticlePagination;

    return {
      items,
      pagination,
      tagStats: response.tag_stats ?? [],
    };
  },
  {
    watch: [articleQuery],
    server: true,
    lazy: true,
    default: () => ({
      items: [] as ArticleViewItem[],
      pagination: {
        page: 1,
        size: pageSize,
        total: 0,
        total_pages: 0,
      } satisfies ArticlePagination,
      tagStats: [] as ArticleTagStat[],
    }),
  },
);

const totalArticles = computed(() => articleList.value.pagination.total);
const totalPages = computed(() => Math.max(1, articleList.value.pagination.total_pages || 0));
const pageArticles = computed(() => articleList.value.items);
const featuredArticle = computed(() => pageArticles.value.find((article) => article.featured));
const pagedArticles = computed(() =>
  pageArticles.value.filter((article) => article.id !== featuredArticle.value?.id),
);
const tagStats = computed(() => articleList.value.tagStats);

watch(searchKeyword, (value) => {
  if (searchDebounceTimer !== null) {
    globalThis.clearTimeout(searchDebounceTimer);
    searchDebounceTimer = null;
  }

  currentPage.value = 1;
  searchDebounceTimer = globalThis.setTimeout(() => {
    debouncedKeyword.value = value.trim();
    searchDebounceTimer = null;
  }, 220);
});

watch([activeTag, sortBy], () => {
  currentPage.value = 1;
});

watch(
  () => articleList.value.pagination.total_pages,
  (pageCount) => {
    const safePageCount = Math.max(1, Number(pageCount || 0));
    if (currentPage.value > safePageCount) {
      currentPage.value = safePageCount;
    }
  },
);

function formatDate(dateInput: string) {
  const date = new Date(dateInput);
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  }).format(date);
}

function fromNow(dateInput: string) {
  const now = Date.now();
  const target = new Date(dateInput).getTime();
  const diffDays = Math.max(1, Math.floor((now - target) / 86400000));
  if (diffDays < 30) return `${diffDays}天前`;
  const months = Math.floor(diffDays / 30);
  if (months < 12) return `${months}个月前`;
  return `${Math.floor(months / 12)}年前`;
}

function formatCount(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

function toggleTag(tag: string) {
  activeTag.value = activeTag.value === tag ? null : tag;
}

function gotoPrevPage() {
  if (currentPage.value > 1) currentPage.value -= 1;
}

function gotoNextPage() {
  if (currentPage.value < totalPages.value) currentPage.value += 1;
}

function randomBlogLetter() {
  return BLOG_LETTERS[Math.floor(Math.random() * BLOG_LETTERS.length)] ?? "B";
}

function clearBlogAnimationTimers() {
  if (blogTextIntervalId !== null) {
    window.clearInterval(blogTextIntervalId);
    blogTextIntervalId = null;
  }

  while (blogTextTimeoutIds.length) {
    const timeoutId = blogTextTimeoutIds.pop();
    if (timeoutId !== undefined) window.clearTimeout(timeoutId);
  }
}

function playBlogTextAnimation() {
  clearBlogAnimationTimers();
  blogAnimatedText.value = BLOG_TEXT;

  let settledCount = 0;
  blogTextIntervalId = window.setInterval(() => {
    const chars = BLOG_TEXT.split("");
    for (let i = settledCount; i < chars.length; i += 1) {
      chars[i] = randomBlogLetter();
    }
    blogAnimatedText.value = chars.join("");
  }, 56);

  for (let i = 0; i < BLOG_TEXT.length; i += 1) {
    const timeoutId = window.setTimeout(() => {
      settledCount = i + 1;
      if (settledCount >= BLOG_TEXT.length) {
        clearBlogAnimationTimers();
        blogAnimatedText.value = BLOG_TEXT;
      }
    }, 240 + i * 220);

    blogTextTimeoutIds.push(timeoutId);
  }
}

onMounted(() => {
  playBlogTextAnimation();
});

onBeforeUnmount(() => {
  clearBlogAnimationTimers();
  if (searchDebounceTimer !== null) {
    globalThis.clearTimeout(searchDebounceTimer);
    searchDebounceTimer = null;
  }
});

function clearCardLeaveTimer(el: HTMLElement) {
  const timerId = Number(el.dataset.leaveTimerId ?? 0);
  if (timerId > 0) {
    window.clearTimeout(timerId);
    delete el.dataset.leaveTimerId;
  }
}

function onArticleCardEnter(event: MouseEvent) {
  const target = event.currentTarget;
  if (!(target instanceof HTMLElement)) return;

  clearCardLeaveTimer(target);
  target.classList.remove("is-leaving");
  target.classList.remove("is-hovering");
  void target.offsetWidth;
  target.classList.add("is-hovering");
}

function onArticleCardLeave(event: MouseEvent) {
  const target = event.currentTarget;
  if (!(target instanceof HTMLElement)) return;

  target.classList.remove("is-hovering");
  target.classList.add("is-leaving");

  clearCardLeaveTimer(target);
  const timerId = window.setTimeout(() => {
    target.classList.remove("is-leaving");
    delete target.dataset.leaveTimerId;
  }, 460);
  target.dataset.leaveTimerId = String(timerId);
}
</script>

<template>
  <div class="article-page">
    <main class="article-shell">
      <section class="article-main">
        <header class="article-head">
          <p class="head-sub" aria-label="BLOG">{{ blogAnimatedText }}</p>
          <h1>文章</h1>
        </header>

        <NuxtLink prefetch="false"
          v-if="featuredArticle"
          :to="`/article/${featuredArticle.id}`"
          class="featured-card article-card-reveal"
          :style="{ '--reveal-order': 0 }"
          @mouseenter="onArticleCardEnter"
          @mouseleave="onArticleCardLeave"
        >
          <div class="card-cover-side" aria-hidden="true">
            <img :src="featuredArticle.cover" alt="" />
            <span class="card-cover-fade" />
          </div>
          <p class="featured-badge">置顶 ✨</p>
          <h2>{{ featuredArticle.title }}</h2>
          <p class="featured-summary">{{ featuredArticle.summary }}</p>
          <div class="post-bottom">
            <p class="post-meta">
              <time :datetime="featuredArticle.publishedAt">{{ formatDate(featuredArticle.publishedAt) }}</time>
              <span v-if="featuredArticle.edited"></span>
              <strong>{{ featuredArticle.category }}</strong>
            </p>
            <div class="post-stats">
              <span>
                <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M2.8 12s3.8-6.2 9.2-6.2s9.2 6.2 9.2 6.2s-3.8 6.2-9.2 6.2S2.8 12 2.8 12Z" />
                  <circle cx="12" cy="12" r="2.7" />
                </svg>
                {{ formatCount(featuredArticle.views) }}
              </span>
              <span>
                <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M12 20.2s-7-4.2-7-9.3c0-2.2 1.7-4 3.9-4c1.5 0 2.6.8 3.1 1.8c.5-1 1.6-1.8 3.1-1.8c2.2 0 3.9 1.8 3.9 4c0 5.1-7 9.3-7 9.3Z" />
                </svg>
                {{ featuredArticle.likes }}
              </span>
            </div>
          </div>
        </NuxtLink>

        <div class="list-head">
          <p>共 {{ totalArticles }} 篇</p>
          <div class="sort-row">
            <button :class="{ active: sortBy === 'latest' }" @click="sortBy = 'latest'">最新</button>
            <button :class="{ active: sortBy === 'oldest' }" @click="sortBy = 'oldest'">最久</button>
            <button :class="{ active: sortBy === 'updated' }" @click="sortBy = 'updated'">新更新✨</button>
          </div>
        </div>

        <div class="post-list">
          <p v-if="articleError" class="post-state">文章加载失败，请稍后重试。</p>
          <p v-else-if="articlePending" class="post-state">文章加载中...</p>
          <template v-else>
            <NuxtLink prefetch="false"
              v-for="(article, index) in pagedArticles"
              :key="article.id"
              :to="`/article/${article.id}`"
              class="post-item article-card-reveal"
              :style="{ '--reveal-order': index + 1 }"
              @mouseenter="onArticleCardEnter"
              @mouseleave="onArticleCardLeave"
            >
              <div class="card-cover-side" aria-hidden="true">
                <img :src="article.cover" alt="" />
                <span class="card-cover-fade" />
              </div>
              <h3>{{ article.title }}</h3>
              <p class="post-excerpt">{{ article.excerpt }}</p>

              <div class="post-bottom">
                <p class="post-meta">
                  <span>{{ fromNow(article.publishedAt) }}</span>
                  <strong>{{ article.category }}</strong>
                  <span>/</span>
                  <span>{{ article.tags[0] }}</span>
                </p>

                <div class="post-stats">
                  <span>
                    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path d="M2.8 12s3.8-6.2 9.2-6.2s9.2 6.2 9.2 6.2s-3.8 6.2-9.2 6.2S2.8 12 2.8 12Z" />
                      <circle cx="12" cy="12" r="2.7" />
                    </svg>
                    {{ formatCount(article.views) }}
                  </span>
                  <span>
                    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path d="M12 20.2s-7-4.2-7-9.3c0-2.2 1.7-4 3.9-4c1.5 0 2.6.8 3.1 1.8c.5-1 1.6-1.8 3.1-1.8c2.2 0 3.9 1.8 3.9 4c0 5.1-7 9.3-7 9.3Z" />
                    </svg>
                    {{ article.likes }}
                  </span>
                </div>
              </div>
            </NuxtLink>
          </template>
        </div>

        <div class="pager">
          <button :disabled="currentPage <= 1" @click="gotoPrevPage">上一页</button>
          <p>第{{ currentPage }}/{{ totalPages }}页</p>
          <button :disabled="currentPage >= totalPages" @click="gotoNextPage">下一页</button>
        </div>
      </section>

      <aside class="sidebar">
        <div class="sidebar-card">
          <label class="search-box">
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle cx="11" cy="11" r="6.3" />
              <path d="m16 16l4 4" />
            </svg>
            <input v-model="searchKeyword" type="text" placeholder="搜索" />
          </label>

          <div class="tag-grid">
            <button
              v-for="item in tagStats"
              :key="item.tag"
              class="tag-chip"
              :class="{ active: activeTag === item.tag }"
              @click="toggleTag(item.tag)"
            >
              {{ item.tag }}
              <span>{{ item.count }}</span>
            </button>
          </div>

          <button class="all-tag-btn" @click="activeTag = null">查看所有</button>
        </div>
      </aside>
    </main>
  </div>
</template>

<style scoped>
.article-page {
  position: relative;
  min-height: 100vh;
  padding: 6.4rem 0.8rem 2.2rem;
  isolation: isolate;
}

.article-page::after {
  content: "";
  position: absolute;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  background-image: url("/exported_image_sck.svg");
  background-position: center center;
  background-repeat: no-repeat;
  background-size: cover;
  background-attachment: fixed;
  opacity: 0.24;
  filter: invert(1) contrast(1.08) brightness(1.18);
  mix-blend-mode: screen;
}

.article-shell {
  position: relative;
  z-index: 1;
  width: var(--site-max-width);
  margin: 0 auto;
  display: grid;
  grid-template-columns: minmax(0, 1fr) 19rem;
  gap: 1.6rem;
}

.article-main {
  min-width: 0;
}

.article-page a,
.article-page a:visited,
.article-page a:hover,
.article-page a:focus-visible {
  color: inherit;
  text-decoration: none;
  background-image: none;
  background-size: 0 0;
}

.article-head {
  margin-bottom: 1rem;
}

.head-sub {
  margin: 0;
  color: var(--theme-text-mute);
  letter-spacing: 0.46em;
  font-size: var(--fs-tiny);
}

.article-head h1 {
  margin: 0.55rem 0 0;
  font-size: var(--fs-display);
  line-height: 1;
}

.article-card-reveal {
  opacity: 0;
  transform: translate(-0.86rem, 0.95rem);
  animation: article-card-reveal-in 620ms cubic-bezier(0.2, 0.86, 0.24, 1) forwards;
  animation-delay: calc(var(--reveal-order, 0) * 105ms);
}

.featured-card {
  --card-cover-width: clamp(10rem, 30%, 18rem);
  display: block;
  position: relative;
  isolation: isolate;
  overflow: hidden;
  margin-top: 1rem;
  padding: 1.4rem calc(1.5rem + var(--card-cover-width)) 1.4rem 1.5rem;
  border-radius: 0.72rem;
  text-decoration: none;
  color: inherit;
  border: 1px solid var(--theme-border);
  background: linear-gradient(120deg, rgba(255, 255, 255, 0.07), rgba(255, 255, 255, 0.03));
}

.featured-card::before,
.featured-card::after,
.post-item::before,
.post-item::after {
  content: "";
  position: absolute;
  inset: 0;
  pointer-events: none;
  transform: scaleX(0);
  transform-origin: right center;
  z-index: 1;
  will-change: transform;
}

.featured-card::before,
.post-item::before {
  background: #041E3C;
}

.featured-card::after,
.post-item::after {
  background: #282828;
}

.featured-card.is-hovering::before,
.post-item.is-hovering::before {
  animation: article-card-layer-one-in 0.32s cubic-bezier(0.2, 0.86, 0.25, 1) forwards;
}

.featured-card.is-hovering::after,
.post-item.is-hovering::after {
  animation: article-card-layer-two-in 0.32s cubic-bezier(0.2, 0.86, 0.25, 1) 0.1s forwards;
}

.featured-card.is-leaving::after,
.post-item.is-leaving::after {
  animation: article-card-layer-two-out 0.32s cubic-bezier(0.2, 0.86, 0.25, 1) forwards;
}

.featured-card > :not(.card-cover-side),
.post-item > :not(.card-cover-side) {
  position: relative;
  z-index: 2;
}

.featured-badge {
  margin: 0;
  color: #79f3b0;
  font-size: 0.88rem;
  font-weight: 700;
}

.featured-card h2 {
  margin: 0.62rem 0 0;
  display: inline;
  font-size: clamp(1.5rem, 2.1vw, 2.3rem);
  box-decoration-break: clone;
  -webkit-box-decoration-break: clone;
  background-image: linear-gradient(
    100deg,
    rgba(255, 246, 148, 0.7) 0%,
    rgba(255, 240, 126, 0.52) 100%
  );
  background-repeat: no-repeat;
  background-position: 100% 88%;
  background-size: 0% 0.54em;
  transition: background-size 0.34s cubic-bezier(0.22, 0.9, 0.24, 1), color 0.22s ease;
}

.featured-card:hover h2 {
  color: rgba(252, 254, 238, 0.98);
  background-size: 100% 0.54em;
}

.featured-summary {
  margin: 0.7rem 0 0;
  color: var(--theme-text-soft);
  line-height: 1.7;
}

.list-head {
  margin-top: 1rem;
  padding: 0.68rem 0 0.62rem;
  border-bottom: 1px solid var(--theme-border);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.list-head p {
  margin: 0;
  color: var(--theme-text-mute);
}

.sort-row {
  display: flex;
  gap: 0.36rem;
}

.sort-row button {
  border: 0;
  padding: 0.18rem 0.36rem;
  background: transparent;
  color: rgba(170, 192, 214, 0.8);
  cursor: pointer;
}

.sort-row button.active {
  color: #7df0b2;
}

.post-list {
  margin-top: 0.45rem;
  display: flex;
  flex-direction: column;
}

.post-state {
  margin: 1rem 0 0;
  color: var(--theme-text-mute);
}

.post-item {
  --card-cover-width: clamp(9.2rem, 29%, 16rem);
  display: block;
  position: relative;
  isolation: isolate;
  overflow: hidden;
  padding: 1.25rem calc(1.1rem + var(--card-cover-width)) 1.25rem 1.1rem;
  text-decoration: none;
  color: inherit;
  border: 1px solid var(--theme-border);
  border-radius: 0.68rem;
}

.post-item + .post-item {
  margin-top: 0.45rem;
}

.post-item h3 {
  margin: 0;
  display: inline;
  font-size: clamp(1.6rem, 2.2vw, 2.35rem);
  line-height: 1.22;
  box-decoration-break: clone;
  -webkit-box-decoration-break: clone;
  background-image: linear-gradient(
    100deg,
    rgba(255, 246, 148, 0.7) 0%,
    rgba(255, 240, 126, 0.52) 100%
  );
  background-repeat: no-repeat;
  background-position: 100% 88%;
  background-size: 0% 0.54em;
  transition: background-size 0.34s cubic-bezier(0.22, 0.9, 0.24, 1), color 0.22s ease;
}

.post-item:hover h3 {
  color: rgba(252, 254, 238, 0.98);
  background-size: 100% 0.54em;
}

.card-cover-side {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  width: var(--card-cover-width);
  z-index: 0;
  pointer-events: none;
  overflow: hidden;
}

.card-cover-side img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  filter: saturate(1.02) contrast(0.98) brightness(0.86);
}

.card-cover-fade {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    90deg,
    rgba(8, 15, 27, 0.98) 0%,
    rgba(8, 15, 27, 0.72) 32%,
    rgba(8, 15, 27, 0.12) 78%,
    rgba(8, 15, 27, 0) 100%
  );
}

@keyframes article-card-layer-one-in {
  from {
    transform-origin: right center;
    transform: scaleX(0);
  }

  to {
    transform-origin: right center;
    transform: scaleX(1);
  }
}

@keyframes article-card-layer-two-in {
  from {
    transform-origin: right center;
    transform: scaleX(0);
  }

  to {
    transform-origin: right center;
    transform: scaleX(1);
  }
}

@keyframes article-card-layer-two-out {
  from {
    transform-origin: left center;
    transform: scaleX(1);
  }

  to {
    transform-origin: left center;
    transform: scaleX(0);
  }
}

@keyframes article-card-reveal-in {
  from {
    opacity: 0;
    transform: translate(-0.86rem, 0.95rem);
  }

  to {
    opacity: 1;
    transform: translate(0, 0);
  }
}

.post-excerpt {
  margin: 0.55rem 0 0;
  color: var(--theme-text-soft);
  line-height: 1.7;
}

.post-bottom {
  margin-top: 0.7rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.post-meta {
  margin: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  color: var(--theme-text-mute);
}

.post-meta strong {
  color: rgba(226, 236, 248, 0.92);
  font-weight: 700;
}

.post-stats {
  display: flex;
  align-items: center;
  gap: 0.8rem;
  color: rgba(164, 187, 209, 0.72);
}

.post-stats span {
  display: inline-flex;
  align-items: center;
  gap: 0.2rem;
}

.post-stats svg {
  width: 0.88rem;
  height: 0.88rem;
}

.post-stats path,
.post-stats circle {
  stroke: currentColor;
  stroke-width: 1.7;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.pager {
  margin-top: 1.4rem;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1.5rem;
}

.pager p {
  margin: 0;
  color: rgba(167, 191, 214, 0.7);
}

.pager button {
  border: 0;
  color: #7df0b2;
  background: transparent;
  cursor: pointer;
}

.pager button:disabled {
  color: rgba(167, 191, 214, 0.46);
  cursor: not-allowed;
}

.sidebar {
  position: relative;
}

.sidebar-card {
  position: sticky;
  top: 7rem;
  border-radius: 0.72rem;
  border: 1px solid var(--theme-border);
  background: var(--theme-surface);
  padding: 1rem;
}

.search-box {
  height: 2.25rem;
  display: flex;
  align-items: center;
  gap: 0.4rem;
  border-bottom: 1px solid var(--theme-border);
  padding-bottom: 0.72rem;
}

.search-box svg {
  width: 1rem;
  height: 1rem;
  color: rgba(180, 203, 224, 0.7);
}

.search-box circle,
.search-box path {
  stroke: currentColor;
  stroke-width: 1.8;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.search-box input {
  width: 100%;
  border: 0;
  background: transparent;
  color: var(--theme-text);
  outline: none;
}

.tag-grid {
  margin-top: 0.92rem;
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.tag-chip {
  border: 1px solid var(--theme-border);
  border-radius: 0.55rem;
  background: rgba(255, 255, 255, 0.04);
  color: var(--theme-text);
  padding: 0.38rem 0.58rem;
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  cursor: pointer;
}

.tag-chip span {
  color: rgba(163, 188, 213, 0.68);
}

.tag-chip.active {
  border-color: rgba(125, 240, 178, 0.55);
  background: rgba(125, 240, 178, 0.12);
  color: #b6ffda;
}

.all-tag-btn {
  margin-top: 0.7rem;
  border: 0;
  background: transparent;
  color: rgba(157, 180, 203, 0.68);
  cursor: pointer;
}

@media (prefers-reduced-motion: reduce) {
  .article-card-reveal {
    opacity: 1;
    transform: none;
    animation: none;
  }
}

@media (max-width: 1080px) {
  .article-shell {
    grid-template-columns: 1fr;
  }

  .sidebar-card {
    position: relative;
    top: auto;
  }
}

@media (max-width: 760px) {
  .article-page {
    margin-top: 2em;
    padding: 5.9rem 0.55rem 2.4rem;
  }

  .article-shell {
    width: min(96%, 1560px);
    gap: 1rem;
  }

  .list-head {
    flex-direction: column;
    align-items: flex-start;
  }

  .post-bottom {
    flex-direction: column;
    align-items: flex-start;
  }

  .post-item h3 {
    font-size: 1.7rem;
  }

  .featured-card,
  .post-item {
    padding-right: 1rem;
  }

  .card-cover-side {
    display: none;
  }
}
</style>
