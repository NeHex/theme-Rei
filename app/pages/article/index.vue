<script setup lang="ts">
import { articles } from "~/data/articles";

useHead({
  title: "文章 - NeHex",
});

const sortBy = ref<"latest" | "oldest" | "updated">("latest");
const searchKeyword = ref("");
const activeTag = ref<string | null>(null);
const currentPage = ref(1);
const pageSize = 10;

const normalizedKeyword = computed(() => searchKeyword.value.trim().toLowerCase());

const filteredArticles = computed(() => {
  return articles.filter((article) => {
    const byKeyword =
      normalizedKeyword.value.length === 0 ||
      [article.title, article.summary, article.excerpt, article.tags.join(" ")]
        .join(" ")
        .toLowerCase()
        .includes(normalizedKeyword.value);

    const byTag = !activeTag.value || article.tags.includes(activeTag.value);
    return byKeyword && byTag;
  });
});

const featuredArticle = computed(() => filteredArticles.value.find((article) => article.featured));

const sortedArticles = computed(() => {
  const rest = filteredArticles.value.filter((article) => article.id !== featuredArticle.value?.id);

  return [...rest].sort((a, b) => {
    const aPublished = new Date(a.publishedAt).getTime();
    const bPublished = new Date(b.publishedAt).getTime();
    const aUpdated = new Date(a.updatedAt).getTime();
    const bUpdated = new Date(b.updatedAt).getTime();

    if (sortBy.value === "oldest") return aPublished - bPublished;
    if (sortBy.value === "updated") return bUpdated - aUpdated;
    return bPublished - aPublished;
  });
});

const totalPages = computed(() => Math.max(1, Math.ceil(sortedArticles.value.length / pageSize)));

const pagedArticles = computed(() => {
  const start = (currentPage.value - 1) * pageSize;
  const end = start + pageSize;
  return sortedArticles.value.slice(start, end);
});

const tagStats = computed(() => {
  const map = new Map<string, number>();
  for (const article of articles) {
    for (const tag of article.tags) {
      map.set(tag, (map.get(tag) ?? 0) + 1);
    }
  }

  return [...map.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
});

watch([searchKeyword, activeTag, sortBy], () => {
  currentPage.value = 1;
});

watch(totalPages, (pageCount) => {
  if (currentPage.value > pageCount) {
    currentPage.value = pageCount;
  }
});

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
</script>

<template>
  <div class="article-page">
    <main class="article-shell">
      <section class="article-main">
        <header class="article-head">
          <p class="head-sub">BLOG</p>
          <h1>文章</h1>
        </header>

        <NuxtLink
          v-if="featuredArticle"
          :to="`/article/${featuredArticle.id}`"
          class="featured-card"
        >
          <p class="featured-badge">置顶</p>
          <h2>{{ featuredArticle.title }}</h2>
          <p class="featured-summary">{{ featuredArticle.summary }}</p>
          <div class="post-bottom">
            <p class="post-meta">
              <time :datetime="featuredArticle.publishedAt">{{ formatDate(featuredArticle.publishedAt) }}</time>
              <span v-if="featuredArticle.edited">（已编辑）</span>
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
          <p>共 {{ filteredArticles.length }} 篇</p>
          <div class="sort-row">
            <button :class="{ active: sortBy === 'latest' }" @click="sortBy = 'latest'">最新</button>
            <button :class="{ active: sortBy === 'oldest' }" @click="sortBy = 'oldest'">最早</button>
            <button :class="{ active: sortBy === 'updated' }" @click="sortBy = 'updated'">最近更新</button>
          </div>
        </div>

        <div class="post-list">
          <NuxtLink
            v-for="article in pagedArticles"
            :key="article.id"
            :to="`/article/${article.id}`"
            class="post-item"
          >
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
        </div>

        <div class="pager">
          <button :disabled="currentPage <= 1" @click="gotoPrevPage">← 上一页</button>
          <p>第 {{ currentPage }} 页，共 {{ totalPages }} 页</p>
          <button :disabled="currentPage >= totalPages" @click="gotoNextPage">下一页 →</button>
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

          <button class="all-tag-btn" @click="activeTag = null">全部标签</button>
        </div>
      </aside>
    </main>
  </div>
</template>

<style scoped>
.article-page {
  position: relative;
  min-height: 100vh;
  padding: 6.4rem 0.8rem 3rem;
  isolation: isolate;
}

.article-page::before {
  content: "";
  position: fixed;
  inset: 0;
  z-index: -3;
  background:
    linear-gradient(180deg, rgba(7, 10, 18, 0.9), rgba(6, 10, 16, 0.94)),
    url("/images/background.png") center / cover no-repeat fixed;
}

.article-page::after {
  content: "";
  position: fixed;
  inset: 0;
  z-index: -2;
  opacity: 0.5;
  background-image:
    radial-gradient(circle at 20% 10%, rgba(255, 255, 255, 0.65) 0 2px, transparent 3px),
    radial-gradient(circle at 64% 20%, rgba(255, 215, 225, 0.56) 0 2px, transparent 3px),
    radial-gradient(circle at 86% 34%, rgba(255, 255, 255, 0.58) 0 1.8px, transparent 3px),
    radial-gradient(circle at 30% 52%, rgba(255, 228, 236, 0.56) 0 2px, transparent 3px);
  background-size: 580px 580px, 720px 720px, 640px 640px, 860px 860px;
  animation: float-petals 32s linear infinite;
  pointer-events: none;
}

.article-shell {
  width: min(92%, 1560px);
  margin: 0 auto;
  display: grid;
  grid-template-columns: minmax(0, 1fr) 19rem;
  gap: 1.6rem;
}

.article-main {
  min-width: 0;
}

.article-head {
  margin-bottom: 1rem;
}

.head-sub {
  margin: 0;
  color: rgba(207, 218, 236, 0.66);
  letter-spacing: 0.46em;
  font-size: 0.8rem;
}

.article-head h1 {
  margin: 0.55rem 0 0;
  font-size: clamp(2.2rem, 4.6vw, 3.6rem);
  line-height: 1;
}

.featured-card {
  display: block;
  margin-top: 1rem;
  padding: 1.25rem 1.3rem;
  border-radius: 0.72rem;
  text-decoration: none;
  color: inherit;
  border: 1px solid rgba(118, 170, 194, 0.2);
  background: linear-gradient(120deg, rgba(255, 255, 255, 0.07), rgba(255, 255, 255, 0.03));
}

.featured-badge {
  margin: 0;
  color: #79f3b0;
  font-size: 0.88rem;
  font-weight: 700;
}

.featured-card h2 {
  margin: 0.62rem 0 0;
  font-size: clamp(1.5rem, 2.1vw, 2.3rem);
}

.featured-summary {
  margin: 0.7rem 0 0;
  color: rgba(195, 210, 229, 0.78);
  line-height: 1.7;
}

.list-head {
  margin-top: 1rem;
  padding: 0.68rem 0 0.62rem;
  border-bottom: 1px solid rgba(118, 170, 194, 0.22);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.list-head p {
  margin: 0;
  color: rgba(170, 192, 214, 0.72);
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

.post-item {
  display: block;
  padding: 1.25rem 0;
  text-decoration: none;
  color: inherit;
  border-bottom: 1px solid rgba(118, 170, 194, 0.12);
}

.post-item h3 {
  margin: 0;
  font-size: clamp(1.6rem, 2.2vw, 2.35rem);
  line-height: 1.22;
}

.post-excerpt {
  margin: 0.55rem 0 0;
  color: rgba(194, 209, 226, 0.72);
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
  color: rgba(160, 183, 205, 0.72);
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
  border: 1px solid rgba(118, 170, 194, 0.2);
  background: rgba(29, 33, 40, 0.72);
  padding: 1rem;
}

.search-box {
  height: 2.25rem;
  display: flex;
  align-items: center;
  gap: 0.4rem;
  border-bottom: 1px solid rgba(118, 170, 194, 0.2);
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
  color: #eaf3ff;
  outline: none;
}

.tag-grid {
  margin-top: 0.92rem;
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.tag-chip {
  border: 1px solid rgba(118, 170, 194, 0.26);
  border-radius: 0.55rem;
  background: rgba(255, 255, 255, 0.04);
  color: rgba(225, 236, 248, 0.9);
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

@keyframes float-petals {
  from {
    transform: translateY(0);
  }
  to {
    transform: translateY(52px);
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
}
</style>
