<script setup lang="ts">
const requestUrl = useRequestURL();
const { settings } = useSiteSettings();
const { movies, pending, error } = useMovies();

const siteBaseUrl = computed(() => {
  const configured = String(settings.value.siteUrl || "").trim();
  if (configured) return configured.replace(/\/+$/, "");
  return `${requestUrl.protocol}//${requestUrl.host}`;
});
const canonicalUrl = computed(() => `${siteBaseUrl.value}/movie`);
const seoDescription = computed(() => `电影清单与观影记录 - ${settings.value.siteDesc}`);
const ogImage = computed(() => {
  const input = String(settings.value.userHeadpic || "/images/head.jpg").trim();
  if (!input) return "";
  if (/^https?:\/\//i.test(input)) return input;
  return `${siteBaseUrl.value}${input.startsWith("/") ? input : `/${input}`}`;
});
const movieSchema = computed(() => ({
  "@context": "https://schema.org",
  "@type": "CollectionPage",
  name: `电影墙 - ${settings.value.siteTitle}`,
  description: seoDescription.value,
  url: canonicalUrl.value,
}));

useHead(() => ({
  title: `电影墙 - ${settings.value.siteTitle}`,
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
      content: `电影墙 - ${settings.value.siteTitle}`,
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
      key: "movie-schema",
      children: JSON.stringify(movieSchema.value),
    },
  ],
}));

const allStatusLabel = "全部";
const STATUS_LABEL_MAP: Record<string, string> = {
  watched: "看过",
  liked: "喜欢",
  watching: "在看",
  want: "想看",
  unknown: "未分类",
};
const STATUS_ORDER = ["watched", "liked", "watching", "want", "unknown"];
const activeStatus = ref(allStatusLabel);

function getStatusSortWeight(status: string) {
  const index = STATUS_ORDER.indexOf(status);
  return index >= 0 ? index : STATUS_ORDER.length + 1;
}

function getStatusLabel(status: string) {
  return STATUS_LABEL_MAP[status] || status || "其他";
}

const statusOptions = computed(() => {
  const statusSet = new Set<string>();
  for (const movie of movies.value) {
    const status = String(movie.watchStatus || "").trim().toLowerCase() || "unknown";
    statusSet.add(status);
  }

  const list = [...statusSet].sort((a, b) => {
    const weightDiff = getStatusSortWeight(a) - getStatusSortWeight(b);
    if (weightDiff !== 0) return weightDiff;
    return a.localeCompare(b, "zh-Hans-CN", { numeric: true });
  });

  return [allStatusLabel, ...list];
});

watch(
  statusOptions,
  (options) => {
    if (!options.includes(activeStatus.value)) {
      activeStatus.value = allStatusLabel;
    }
  },
  { immediate: true },
);

const filteredMovies = computed(() => {
  if (activeStatus.value === allStatusLabel) return movies.value;
  return movies.value.filter((movie) => movie.watchStatus === activeStatus.value);
});

const watchedCount = computed(
  () => movies.value.filter((movie) => movie.watchStatus === "watched").length,
);
const likedCount = computed(
  () => movies.value.filter((movie) => movie.watchStatus === "liked").length,
);
const watchingCount = computed(
  () => movies.value.filter((movie) => movie.watchStatus === "watching").length,
);
const wantCount = computed(
  () => movies.value.filter((movie) => movie.watchStatus === "want").length,
);

function formatScore(score: number | null) {
  if (score === null) return "暂无评分";
  return `评分 ${score}`;
}
</script>

<template>
  <div class="movie-page">
    <main class="movie-shell">
      <section class="movie-hero">
        <p class="movie-caption">MOVIE WALL</p>
        <h1>电影墙</h1>
        <p class="movie-subtitle">把喜欢、在看、想看的电影都贴上来。</p>

        <div class="movie-stats">
          <article>
            <strong>{{ movies.length }}</strong>
            <span>总计</span>
          </article>
          <article>
            <strong>{{ watchedCount }}</strong>
            <span>看过</span>
          </article>
          <article>
            <strong>{{ likedCount }}</strong>
            <span>喜欢</span>
          </article>
          <article>
            <strong>{{ watchingCount }}</strong>
            <span>在看</span>
          </article>
          <article>
            <strong>{{ wantCount }}</strong>
            <span>想看</span>
          </article>
        </div>
      </section>

      <section class="movie-filter">
        <button
          v-for="(status, index) in statusOptions"
          :key="status"
          class="filter-btn filter-btn-reveal"
          :class="{ active: status === activeStatus }"
          :style="{ '--filter-order': index }"
          @click="activeStatus = status"
        >
          {{ status === allStatusLabel ? status : getStatusLabel(status) }}
        </button>
      </section>

      <p v-if="pending" class="movie-state">正在加载电影列表…</p>
      <p v-else-if="error" class="movie-state movie-state-error">电影列表加载失败，请稍后重试。</p>

      <section v-else class="movie-grid">
        <article
          v-for="(item, index) in filteredMovies"
          :key="item.id"
          class="movie-card movie-card-reveal"
          :style="{ '--movie-order': index }"
        >
          <div class="movie-cover-shell">
            <img :src="item.cover" :alt="item.title" class="movie-cover" />
            <span class="movie-status-tag" :class="`status-${item.watchStatus}`">
              {{ getStatusLabel(item.watchStatus) }}
            </span>
          </div>

          <div class="movie-card-body">
            <h3>{{ item.title }}</h3>
            <p class="movie-meta">
              <span>{{ item.years || "年份未知" }}</span>
              <span>{{ formatScore(item.score) }}</span>
            </p>
            <p class="movie-desc">{{ item.description || "暂无简介" }}</p>
            <div class="movie-foot">
              <p class="movie-provider">
                来源 {{ item.provider || "未知" }}
              </p>
              <a
                v-if="item.url"
                :href="item.url"
                class="external-link"
                target="_blank"
                rel="noopener noreferrer"
              >
                详情
              </a>
            </div>
          </div>
        </article>

        <article v-if="!filteredMovies.length" class="movie-empty">
          当前筛选下暂无电影
        </article>
      </section>
    </main>
  </div>
</template>

<style scoped>
.movie-page {
  min-height: 100vh;
  padding: 6.2rem 1rem 2.2rem;
  color: var(--theme-text);
}

.movie-shell {
  width: var(--site-max-width);
  margin: 0 auto;
  display: grid;
  gap: 1rem;
}

.movie-hero {
  border-radius: 1.2rem;
  border: 1px solid rgba(105, 168, 206, 0.34);
  background:
    radial-gradient(circle at 82% 20%, rgba(42, 212, 225, 0.28), transparent 46%),
    radial-gradient(circle at 20% 80%, rgba(31, 99, 171, 0.3), transparent 45%),
    rgba(7, 16, 33, 0.86);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  padding: 1.05rem 1.2rem;
}

.movie-caption {
  margin: 0;
  font-size: 0.75rem;
  letter-spacing: 0.25em;
  color: rgba(141, 207, 226, 0.78);
}

.movie-hero h1 {
  margin: 0.32rem 0 0;
  font-size: var(--fs-h1);
  line-height: 1.1;
}

.movie-subtitle {
  margin: 0.6rem 0 0;
  color: var(--theme-text-soft);
}

.movie-stats {
  margin-top: 0.95rem;
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 0.6rem;
}

.movie-stats article {
  border-radius: 0.9rem;
  border: 1px solid rgba(124, 178, 206, 0.24);
  background: rgba(8, 20, 35, 0.75);
  padding: 0.52rem 0.66rem;
  display: grid;
  gap: 0.16rem;
}

.movie-stats strong {
  font-size: 1.2rem;
  line-height: 1;
}

.movie-stats span {
  font-size: 0.76rem;
  color: var(--theme-text-mute);
}

.movie-filter {
  display: flex;
  align-items: center;
  gap: 0.48rem;
  flex-wrap: wrap;
}

.filter-btn {
  border: 1px solid rgba(125, 170, 196, 0.24);
  background: rgba(8, 22, 38, 0.74);
  color: var(--theme-text);
  border-radius: 999px;
  padding: 0.34rem 0.9rem;
  font-size: 0.86rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.filter-btn:hover {
  border-color: rgba(130, 202, 217, 0.56);
  transform: translateY(-1px);
}

.filter-btn.active {
  border-color: rgba(127, 228, 240, 0.72);
  background: rgba(18, 62, 90, 0.85);
}

.filter-btn-reveal {
  opacity: 0;
  animation: filter-fade-in 320ms ease-out both;
  animation-delay: calc(var(--filter-order, 0) * 42ms);
}

.movie-state {
  margin: 0;
  color: var(--theme-text-soft);
}

.movie-state-error {
  color: #ffbdbd;
}

.movie-grid {
  display: grid;
  gap: 0.86rem;
  grid-template-columns: repeat(5, minmax(0, 1fr));
}

.movie-card {
  border-radius: 1rem;
  border: 1px solid rgba(122, 166, 194, 0.22);
  background: rgba(8, 19, 34, 0.85);
  overflow: hidden;
  display: grid;
  grid-template-rows: auto 1fr;
  transition: transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
}

.movie-card:hover {
  transform: translateY(-3px);
  border-color: rgba(124, 196, 214, 0.46);
  box-shadow: 0 12px 26px rgba(0, 0, 0, 0.38);
}

.movie-card-reveal {
  opacity: 0;
  animation: movie-card-rise 420ms ease-out both;
  animation-delay: calc(var(--movie-order, 0) * 40ms);
}

.movie-cover-shell {
  position: relative;
  aspect-ratio: 2 / 3;
  background: rgba(255, 255, 255, 0.04);
}

.movie-cover {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.movie-status-tag {
  position: absolute;
  top: 0.5rem;
  left: 0.5rem;
  border-radius: 999px;
  font-size: 0.72rem;
  padding: 0.2rem 0.55rem;
  border: 1px solid rgba(255, 255, 255, 0.3);
  background: rgba(5, 14, 30, 0.78);
}

.movie-status-tag.status-watched {
  border-color: rgba(143, 237, 146, 0.58);
  color: #b8ffbc;
}

.movie-status-tag.status-watching {
  border-color: rgba(255, 230, 151, 0.62);
  color: #ffe4a4;
}

.movie-status-tag.status-liked {
  border-color: rgba(255, 173, 200, 0.62);
  color: #ffc5dd;
}

.movie-status-tag.status-want {
  border-color: rgba(163, 206, 255, 0.62);
  color: #b8dcff;
}

.movie-card-body {
  padding: 0.68rem 0.72rem 0.78rem;
  display: grid;
  gap: 0.42rem;
}

.movie-card-body h3 {
  margin: 0;
  font-size: 1rem;
  line-height: 1.34;
}

.movie-meta {
  margin: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.4rem;
  font-size: 0.76rem;
  color: var(--theme-text-mute);
}

.movie-desc {
  margin: 0;
  color: var(--theme-text-soft);
  font-size: 0.82rem;
  line-height: 1.6;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
  overflow: hidden;
}

.movie-foot {
  margin-top: auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}

.movie-provider {
  margin: 0;
  font-size: 0.72rem;
  color: var(--theme-text-mute);
}

.movie-foot a {
  font-size: 0.78rem;
}

.movie-empty {
  grid-column: 1 / -1;
  border-radius: 1rem;
  border: 1px dashed rgba(128, 171, 198, 0.3);
  color: var(--theme-text-mute);
  background: rgba(8, 20, 35, 0.7);
  padding: 1rem;
  text-align: center;
}

@keyframes movie-card-rise {
  from {
    opacity: 0;
    transform: translateY(6px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes filter-fade-in {
  from {
    opacity: 0;
    transform: translateY(4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (max-width: 1200px) {
  .movie-grid {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}

@media (max-width: 960px) {
  .movie-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .movie-stats {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 640px) {
  .movie-page {
    padding-top: 6.7rem;
  }

  .movie-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .movie-stats {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .movie-hero {
    padding: 0.92rem 0.94rem;
  }
}

@media (max-width: 420px) {
  .movie-grid {
    grid-template-columns: 1fr;
  }
}
</style>
