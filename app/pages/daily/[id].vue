<script setup lang="ts">
import MarkdownIt from "markdown-it";

const route = useRoute();
const requestUrl = useRequestURL();
const { settings } = useSiteSettings();

const dailyId = computed(() => String(route.params.id ?? "").trim());
const { daily, pending, error } = useDailyDetail(dailyId);

watchEffect(() => {
  if (!error.value) return;
  throw createError({
    statusCode: Number((error.value as any).statusCode || 500),
    statusMessage: (error.value as any).statusMessage || "Daily Not Found",
  });
});

function compactText(raw: string) {
  return raw
    .replace(/\r\n/g, "\n")
    .replace(/\n{2,}/g, "\n")
    .replace(/\s+/g, " ")
    .trim();
}

function toDate(value: string) {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

function formatDate(value: string) {
  const date = toDate(value);
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatStamp(value: string) {
  const date = toDate(value);
  const year = String(date.getFullYear());
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}.${month}.${day}`;
}

function weatherLabel(raw: string) {
  const value = raw.trim().toLowerCase();
  if (!value) return "天气未记录";
  if (
    value.includes("sun")
    || value.includes("clear")
    || value.includes("晴")
  ) {
    return "晴天";
  }
  if (
    value.includes("rain")
    || value.includes("drizzle")
    || value.includes("storm")
    || value.includes("雨")
    || value.includes("雷")
  ) {
    return "雨天";
  }
  if (
    value.includes("wind")
    || value.includes("breeze")
    || value.includes("gust")
    || value.includes("风")
  ) {
    return "有风";
  }
  if (
    value.includes("snow")
    || value.includes("sleet")
    || value.includes("冰雹")
    || value.includes("雪")
  ) {
    return "雪天";
  }
  if (
    value.includes("cloud")
    || value.includes("overcast")
    || value.includes("阴")
    || value.includes("云")
  ) {
    return "多云";
  }
  return raw.trim();
}

const markdown = new MarkdownIt({
  html: false,
  linkify: true,
  typographer: true,
  breaks: true,
});

const renderedMarkdown = computed(() => markdown.render(daily.value?.content || "暂无内容"));
const lineCount = computed(() =>
  String(daily.value?.content || "")
    .split(/\r?\n/g)
    .filter((line) => line.trim())
    .length,
);
const textLength = computed(() => compactText(String(daily.value?.content || "")).length);

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

const canonicalUrl = computed(() => {
  const path = dailyId.value ? `/daily/${encodeURIComponent(dailyId.value)}` : "/daily";
  return `${siteBaseUrl.value}${path}`;
});

const seoDescription = computed(() => {
  const source = compactText(String(daily.value?.content || "")) || settings.value.siteDesc;
  return source.slice(0, 160) || settings.value.siteDesc;
});

const ogImage = computed(() => {
  const fallback = String(settings.value.userHeadpic || "/images/head.jpg").trim();
  return toAbsoluteUrl(fallback);
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
    mainEntityOfPage: canonicalUrl.value,
    image: ogImage.value ? [ogImage.value] : undefined,
    author: {
      "@type": "Person",
      name: settings.value.userName || settings.value.siteTitle,
    },
    publisher: {
      "@type": "Organization",
      name: settings.value.siteTitle,
    },
  };
});

useHead(() => ({
  title: `${daily.value?.title ?? "日常"} - ${settings.value.siteTitle}`,
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
      content: `${daily.value?.title ?? "日常"} - ${settings.value.siteTitle}`,
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
  script: dailySchema.value
    ? [
        {
          type: "application/ld+json",
          children: JSON.stringify(dailySchema.value),
        },
      ]
    : [],
}));
</script>

<template>
  <div class="daily-detail-page">
    <main class="daily-main">
      <header class="daily-head">
        <NuxtLink class="daily-back" to="/#journal" aria-label="返回首页日常区">
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M14.5 5.5L8 12l6.5 6.5" />
          </svg>
          <span>返回日常</span>
        </NuxtLink>

        <template v-if="daily">
          <p class="daily-kicker">DAILY LOG</p>
          <h1>{{ daily.title }}</h1>
          <div class="daily-meta">
            <time :datetime="daily.createdAt">{{ formatDate(daily.createdAt) }}</time>
            <span class="meta-dot" aria-hidden="true" />
            <span>{{ weatherLabel(daily.weather) }}</span>
            <span class="meta-dot" aria-hidden="true" />
            <span>#{{ daily.id }}</span>
          </div>
        </template>
      </header>

      <article v-if="daily" class="daily-entry">
        <aside class="entry-rail" aria-hidden="true">
          <span class="rail-dot" />
          <span class="rail-date">{{ formatStamp(daily.createdAt) }}</span>
        </aside>

        <section class="entry-paper">
          <header class="entry-paper-head">
            <p>日志正文</p>
            <div class="entry-paper-metrics">
              <span>{{ lineCount }} 行</span>
              <span>{{ textLength }} 字符</span>
            </div>
          </header>
          <div class="daily-markdown" v-html="renderedMarkdown" />
        </section>
      </article>

      <section v-else class="daily-loading">
        <p>{{ pending ? "日志加载中..." : "日志不存在或已被删除。" }}</p>
      </section>
    </main>
  </div>
</template>

<style scoped>
.daily-detail-page {
  min-height: 100vh;
  padding: 6.4rem 1rem 2.4rem;
}

.daily-main {
  width: min(var(--site-max-width), 1180px);
  margin: 0 auto;
}

.daily-head {
  position: relative;
  border-radius: 1rem;
  border: 1px solid rgba(118, 170, 194, 0.26);
  background:
    radial-gradient(circle at 15% 14%, rgba(68, 198, 214, 0.18) 0%, rgba(18, 35, 58, 0) 46%),
    linear-gradient(145deg, rgba(9, 18, 33, 0.94), rgba(7, 14, 28, 0.9));
  backdrop-filter: blur(8px);
  padding: 1.25rem 1.2rem;
}

.daily-back {
  width: fit-content;
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  border-radius: 999px;
  border: 1px solid rgba(152, 202, 227, 0.26);
  background: rgba(10, 22, 38, 0.7);
  color: rgba(225, 238, 249, 0.92);
  padding: 0.28rem 0.6rem;
  font-size: 0.88rem;
  text-decoration: none;
}

.daily-back:hover {
  border-color: rgba(188, 228, 247, 0.52);
  color: #ffffff;
}

.daily-back svg {
  width: 1rem;
  height: 1rem;
}

.daily-back path {
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.daily-kicker {
  margin: 0.86rem 0 0;
  font-size: 0.82rem;
  letter-spacing: 0.16em;
  color: #75e3ef;
  font-weight: 700;
}

.daily-head h1 {
  margin: 0.4rem 0 0;
  font-size: clamp(1.65rem, 3.2vw, 2.5rem);
  color: rgba(235, 246, 255, 0.96);
  line-height: 1.22;
}

.daily-meta {
  margin-top: 0.76rem;
  display: flex;
  flex-wrap: wrap;
  gap: 0.42rem 0.55rem;
  align-items: center;
  color: rgba(194, 214, 231, 0.78);
  font-size: 0.92rem;
}

.meta-dot {
  width: 0.28rem;
  height: 0.28rem;
  border-radius: 50%;
  background: rgba(156, 194, 219, 0.5);
}

.daily-entry {
  margin-top: 1rem;
  display: grid;
  grid-template-columns: minmax(5.2rem, 7rem) minmax(0, 1fr);
  gap: 0.95rem;
}

.entry-rail {
  border-radius: 0.92rem;
  border: 1px solid rgba(115, 165, 188, 0.26);
  background: linear-gradient(180deg, rgba(8, 17, 30, 0.82), rgba(6, 13, 24, 0.94));
  display: grid;
  place-items: center;
  align-content: center;
  gap: 0.45rem;
  padding: 0.8rem 0.45rem;
}

.rail-dot {
  width: 0.6rem;
  height: 0.6rem;
  border-radius: 50%;
  background: radial-gradient(circle at 35% 35%, #d6fcff 0%, #2ad4e1 56%, #1c93a4 100%);
  box-shadow: 0 0 0 0.18rem rgba(42, 212, 225, 0.22);
}

.rail-date {
  color: rgba(183, 206, 224, 0.86);
  writing-mode: vertical-rl;
  text-orientation: mixed;
  letter-spacing: 0.14em;
  font-size: 0.86rem;
}

.entry-paper {
  position: relative;
  border-radius: 1rem;
  border: 1px solid rgba(144, 186, 211, 0.26);
  padding: 1rem 1.05rem;
  background:
    linear-gradient(90deg, rgba(80, 165, 188, 0.14) 0 2px, rgba(8, 16, 30, 0.88) 2px),
    repeating-linear-gradient(
      180deg,
      rgba(178, 213, 230, 0.08) 0,
      rgba(178, 213, 230, 0.08) 1px,
      transparent 1px,
      transparent 2rem
    ),
    linear-gradient(180deg, rgba(10, 20, 35, 0.94), rgba(6, 12, 23, 0.94));
  backdrop-filter: blur(8px);
}

.entry-paper-head {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 0.42rem 0.8rem;
  align-items: center;
  margin-bottom: 0.8rem;
}

.entry-paper-head p {
  margin: 0;
  color: rgba(214, 236, 251, 0.94);
  letter-spacing: 0.06em;
  font-size: 0.95rem;
}

.entry-paper-metrics {
  display: inline-flex;
  gap: 0.42rem;
}

.entry-paper-metrics span {
  padding: 0.14rem 0.5rem;
  border-radius: 999px;
  border: 1px solid rgba(132, 175, 199, 0.26);
  background: rgba(12, 25, 44, 0.58);
  color: rgba(188, 214, 233, 0.84);
  font-size: 0.77rem;
}

.daily-markdown :deep(*) {
  box-sizing: border-box;
}

.daily-markdown :deep(h1),
.daily-markdown :deep(h2),
.daily-markdown :deep(h3),
.daily-markdown :deep(h4),
.daily-markdown :deep(h5),
.daily-markdown :deep(h6) {
  margin: 1.05em 0 0.54em;
  line-height: 1.32;
  color: rgba(229, 244, 255, 0.96);
}

.daily-markdown :deep(p),
.daily-markdown :deep(li),
.daily-markdown :deep(blockquote) {
  line-height: 2;
  color: rgba(204, 225, 241, 0.94);
}

.daily-markdown :deep(p) {
  margin: 0.58em 0;
}

.daily-markdown :deep(ul),
.daily-markdown :deep(ol) {
  margin: 0.66em 0;
  padding-left: 1.3rem;
}

.daily-markdown :deep(blockquote) {
  margin: 0.86em 0;
  border-left: 3px solid rgba(117, 227, 239, 0.84);
  background: rgba(255, 255, 255, 0.04);
  padding: 0.58rem 0.76rem;
  border-radius: 0.45rem;
}

.daily-markdown :deep(pre) {
  margin: 0.9em 0;
  overflow-x: auto;
  padding: 0.85rem;
  border-radius: 0.7rem;
  background: rgba(0, 0, 0, 0.36);
}

.daily-markdown :deep(code) {
  font-family: inherit;
}

.daily-markdown :deep(p code),
.daily-markdown :deep(li code) {
  padding: 0.06rem 0.32rem;
  border-radius: 0.3rem;
  background: rgba(255, 255, 255, 0.1);
}

.daily-markdown :deep(hr) {
  border: 0;
  border-top: 1px solid rgba(118, 170, 194, 0.3);
  margin: 1.1em 0;
}

.daily-markdown :deep(img) {
  max-width: 100%;
  border-radius: 0.72rem;
}

.daily-loading {
  margin-top: 1rem;
  min-height: 12rem;
  border-radius: 1rem;
  border: 1px solid rgba(118, 170, 194, 0.24);
  background: rgba(8, 16, 28, 0.88);
  display: grid;
  place-items: center;
}

.daily-loading p {
  color: rgba(188, 210, 228, 0.8);
}

@media (max-width: 840px) {
  .daily-entry {
    grid-template-columns: 1fr;
    gap: 0.72rem;
  }

  .entry-rail {
    padding: 0.65rem 0.8rem;
    grid-auto-flow: column;
    justify-content: flex-start;
  }

  .rail-date {
    writing-mode: horizontal-tb;
    letter-spacing: 0.08em;
  }
}

@media (max-width: 760px) {
  .daily-detail-page {
    margin-top: 2em;
    padding: 5.9rem 0.58rem 2rem;
  }

  .daily-head,
  .entry-paper {
    padding: 0.92rem;
  }
}
</style>
