<script setup lang="ts">
import MarkdownIt from "markdown-it";
import { installMarkdownExternalLinkRule, resolveSiteHostname } from "~/utils/link";

const route = useRoute();
const requestUrl = useRequestURL();
const { settings } = useSiteSettings();
const DISPLAY_TIME_ZONE = "Asia/Shanghai";

const dailyId = computed(() => String(route.params.id ?? "").trim());
const { daily, pending, error } = useDailyDetail(dailyId);
const siteHostname = computed(() =>
  resolveSiteHostname(settings.value.siteUrl, `${requestUrl.protocol}//${requestUrl.host}`),
);

watchEffect(() => {
  if (!error.value) return;
  throw createError({
    statusCode: Number((error.value as any).statusCode || 404),
    statusMessage: (error.value as any).statusMessage || "日常不存在",
  });
});

const siteBaseUrl = computed(() => {
  const configured = String(settings.value.siteUrl || "").trim();
  if (configured) return configured.replace(/\/+$/, "");
  return `${requestUrl.protocol}//${requestUrl.host}`;
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

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: DISPLAY_TIME_ZONE,
  }).format(date);
}

const canonicalUrl = computed(() => {
  const path = dailyId.value ? `/daily/${encodeURIComponent(dailyId.value)}` : "/daily";
  return `${siteBaseUrl.value}${path}`;
});
const seoDescription = computed(() => {
  const source = compactText(String(daily.value?.content || daily.value?.summary || ""));
  return source.slice(0, 160) || settings.value.siteDesc;
});
const ogImage = computed(() => {
  const source = String(daily.value?.movie?.cover || settings.value.userHeadpic || "").trim();
  return toAbsoluteUrl(source);
});
const dailySchema = computed(() => {
  if (!daily.value) return null;
  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: daily.value.title,
    description: seoDescription.value,
    datePublished: daily.value.createdAt,
    dateModified: daily.value.createdAt,
    url: canonicalUrl.value,
    image: ogImage.value || undefined,
  };
});

useHead(() => ({
  title: `${daily.value?.title || "日常"} - ${settings.value.siteTitle}`,
  link: [{ rel: "canonical", href: canonicalUrl.value }],
  meta: [
    { name: "description", content: seoDescription.value },
    { property: "og:type", content: "article" },
    { property: "og:title", content: `${daily.value?.title || "日常"} - ${settings.value.siteTitle}` },
    { property: "og:description", content: seoDescription.value },
    { property: "og:url", content: canonicalUrl.value },
    { property: "og:image", content: ogImage.value },
  ],
  script: dailySchema.value
    ? [
        {
          type: "application/ld+json",
          key: "daily-detail-schema",
          children: JSON.stringify(dailySchema.value),
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

const renderedContent = computed(() => markdown.render(daily.value?.content || "暂无内容"));
const reviewMovieTitle = computed(() => {
  const movie = daily.value?.movie;
  if (!movie) return "";
  const year = String(movie.years || "").trim();
  return year ? `${movie.title} (${year})` : movie.title;
});
</script>

<template>
  <div class="daily-detail-page">
    <main class="daily-detail-shell">
      <section v-if="daily" class="daily-detail-card">
        <NuxtLink to="/daily" class="daily-back-link">
          返回日常时间线
        </NuxtLink>

        <header class="daily-detail-head">
          <p class="daily-detail-time">{{ formatDate(daily.createdAt) }}</p>
          <h1>{{ daily.title }}</h1>
          <p class="daily-detail-type">{{ daily.dailyType === "review" ? "影评 / 观影记录" : "日常记录" }}</p>
        </header>

        <div v-if="daily.movie" class="daily-movie-block">
          <img :src="daily.movie.cover" :alt="reviewMovieTitle || daily.movie.title" class="daily-movie-cover" />
          <div class="daily-movie-meta">
            <p class="daily-movie-label">关联电影</p>
            <h2>{{ reviewMovieTitle || daily.movie.title }}</h2>
            <p v-if="daily.movie.score !== null" class="daily-movie-score">评分 {{ daily.movie.score }}</p>
            <a
              v-if="daily.movie.url"
              :href="daily.movie.url"
              class="daily-movie-link"
              target="_blank"
              rel="noopener noreferrer"
            >
              查看电影详情
            </a>
          </div>
        </div>

        <article class="daily-detail-content" v-html="renderedContent" />

        <section class="daily-detail-comments">
          <header class="daily-comment-head">
            <h2>留言评论</h2>
            <p>可以在这条日常下继续交流。</p>
          </header>

          <CommentSection
            target-type="daily"
            :target-id="Number(daily.id)"
          />
        </section>
      </section>

      <section v-else class="daily-detail-card">
        <p>{{ pending ? "日常加载中..." : "日常不存在或已下线。" }}</p>
      </section>
    </main>
  </div>
</template>

<style scoped>
.daily-detail-page {
  min-height: 100vh;
  padding: 6.2rem 1rem 2.4rem;
  color: var(--theme-text);
}

.daily-detail-shell {
  width: min(var(--site-content-width), 62rem);
  margin: 0 auto;
}

.daily-detail-card {
  padding: 1.2rem;
  border-radius: 1.2rem;
  border: 1px solid rgba(153, 201, 225, 0.22);
  background:
    radial-gradient(circle at 88% 14%, rgba(80, 161, 201, 0.16), transparent 36%),
    linear-gradient(160deg, rgba(9, 18, 37, 0.94), rgba(10, 19, 35, 0.84));
}

.daily-back-link {
  display: inline-flex;
  margin-bottom: 1rem;
  color: rgba(198, 221, 239, 0.88);
  text-decoration: none;
}

.daily-detail-head {
  display: grid;
  gap: 0.45rem;
}

.daily-detail-time,
.daily-detail-type {
  margin: 0;
  color: rgba(176, 201, 221, 0.82);
}

.daily-detail-head h1 {
  margin: 0;
  font-size: clamp(2rem, 4vw, 3rem);
  line-height: 1.04;
}

.daily-movie-block {
  display: grid;
  grid-template-columns: minmax(12rem, 15rem) 1fr;
  gap: 1rem;
  margin-top: 1.15rem;
  padding: 1rem;
  border-radius: 1rem;
  background: rgba(255, 255, 255, 0.04);
}

.daily-movie-cover {
  width: 100%;
  border-radius: 0.9rem;
  aspect-ratio: 0.72 / 1;
  object-fit: cover;
}

.daily-movie-meta {
  display: grid;
  align-content: start;
  gap: 0.6rem;
}

.daily-movie-label,
.daily-movie-score {
  margin: 0;
  color: rgba(176, 201, 221, 0.82);
}

.daily-movie-meta h2 {
  margin: 0;
  font-size: 1.6rem;
}

.daily-movie-link {
  width: fit-content;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 2.55rem;
  padding: 0 1rem;
  border-radius: 0.85rem;
  text-decoration: none;
  color: rgba(239, 247, 255, 0.96);
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(157, 202, 225, 0.24);
}

.daily-detail-content {
  margin-top: 1.2rem;
  color: rgba(223, 235, 245, 0.94);
  line-height: 1.9;
}

.daily-detail-content :deep(*) {
  max-width: 100%;
}

.daily-detail-content :deep(pre) {
  overflow-x: auto;
  padding: 0.95rem 1rem;
  border-radius: 0.95rem;
  background: rgba(0, 0, 0, 0.24);
}

.daily-detail-content :deep(code) {
  font-family: "JetBrains Mono", "Fira Code", monospace;
}

.daily-detail-comments {
  margin-top: 1.4rem;
}

.daily-comment-head {
  margin-bottom: 0.8rem;
}

.daily-comment-head h2 {
  margin: 0 0 0.35rem;
  font-size: 1.25rem;
}

.daily-comment-head p {
  margin: 0;
  color: rgba(195, 214, 228, 0.76);
}

@media (max-width: 720px) {
  .daily-movie-block {
    grid-template-columns: 1fr;
  }
}
</style>
