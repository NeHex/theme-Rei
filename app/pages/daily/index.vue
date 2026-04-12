<script setup lang="ts">
import MarkdownIt from "markdown-it";
import { installMarkdownExternalLinkRule, resolveSiteHostname } from "~/utils/link";
import type { DailyViewItem } from "~/composables/useDailies";

type DailyWeatherKey = "sun" | "rain" | "wind" | "snow" | "cloud";

const { settings } = useSiteSettings();
const { dailies, pending, error } = useDailies();
const requestUrl = useRequestURL();
const siteHostname = computed(() =>
  resolveSiteHostname(settings.value.siteUrl, `${requestUrl.protocol}//${requestUrl.host}`),
);

watchEffect(() => {
  if (!error.value) return;
  throw createError({
    statusCode: Number((error.value as any).statusCode || 500),
    statusMessage: (error.value as any).statusMessage || "Daily Load Failed",
  });
});

function toDate(value: string) {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date(0) : parsed;
}

function compactText(raw: string) {
  return raw
    .replace(/\r\n/g, "\n")
    .replace(/\n{2,}/g, "\n")
    .replace(/\s+/g, " ")
    .trim();
}

function formatRelativeTime(value: string) {
  const target = toDate(value).getTime();
  const now = Date.now();
  const diff = Math.max(0, now - target);
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diff < minute) return "刚刚";
  if (diff < hour) return `${Math.floor(diff / minute)} 分钟前`;
  if (diff < day) return `${Math.floor(diff / hour)} 小时前`;
  if (diff < 30 * day) return `${Math.floor(diff / day)} 天前`;

  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(target));
}

function formatAbsoluteTime(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(toDate(value));
}

function getDailyAnchorId(id: string) {
  return `daily-${encodeURIComponent(String(id).trim())}`;
}

function mapDailyWeatherKey(rawWeather: string): DailyWeatherKey {
  const value = rawWeather.trim().toLowerCase();
  if (!value) return "cloud";

  if (
    value.includes("sun")
    || value.includes("clear")
    || value.includes("晴")
  ) {
    return "sun";
  }

  if (
    value.includes("rain")
    || value.includes("drizzle")
    || value.includes("shower")
    || value.includes("storm")
    || value.includes("雨")
    || value.includes("雷")
  ) {
    return "rain";
  }

  if (
    value.includes("wind")
    || value.includes("breeze")
    || value.includes("gust")
    || value.includes("风")
    || value.includes("台风")
  ) {
    return "wind";
  }

  if (
    value.includes("snow")
    || value.includes("sleet")
    || value.includes("冰雹")
    || value.includes("雪")
  ) {
    return "snow";
  }

  return "cloud";
}

const timelineEntries = computed(() =>
  dailies.value
    .map((item) => {
      const timestamp = toDate(item.createdAt).getTime();
      return {
        ...item,
        timestamp,
        anchorId: getDailyAnchorId(item.id),
        weatherKey: mapDailyWeatherKey(item.weather),
      };
    })
    .sort((a, b) => b.timestamp - a.timestamp),
);

const authorName = computed(() => settings.value.userName || settings.value.siteTitle || "站长");

const siteBaseUrl = computed(() => {
  const configured = String(settings.value.siteUrl || "").trim();
  if (configured) return configured.replace(/\/+$/, "");
  return `${requestUrl.protocol}//${requestUrl.host}`;
});
const authorAvatar = computed(() => {
  const input = String(settings.value.userHeadpic || "/images/head.jpg").trim();
  if (!input) return "";
  if (/^https?:\/\//i.test(input)) return input;
  return `${siteBaseUrl.value}${input.startsWith("/") ? input : `/${input}`}`;
});

const canonicalUrl = computed(() => `${siteBaseUrl.value}/daily`);
const seoDescription = computed(() => {
  const newest = timelineEntries.value[0];
  const source = compactText(String(newest?.content || "")) || settings.value.siteDesc;
  return source.slice(0, 160) || settings.value.siteDesc;
});

const dailySchema = computed(() => ({
  "@context": "https://schema.org",
  "@type": "CollectionPage",
  name: `日常 - ${settings.value.siteTitle}`,
  description: seoDescription.value,
  url: canonicalUrl.value,
  mainEntity: {
    "@type": "ItemList",
    itemListOrder: "https://schema.org/ItemListOrderDescending",
    itemListElement: timelineEntries.value.slice(0, 80).map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      url: `${canonicalUrl.value}#${item.anchorId}`,
      name: item.title,
      dateCreated: item.createdAt,
    })),
  },
}));

useHead(() => ({
  title: `日常 - ${settings.value.siteTitle}`,
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
      content: `日常 - ${settings.value.siteTitle}`,
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
      content: authorAvatar.value,
    },
    {
      name: "twitter:card",
      content: "summary_large_image",
    },
    {
      name: "twitter:title",
      content: `日常 - ${settings.value.siteTitle}`,
    },
    {
      name: "twitter:description",
      content: seoDescription.value,
    },
    {
      name: "twitter:image",
      content: authorAvatar.value,
    },
  ],
  script: [
    {
      type: "application/ld+json",
      key: "daily-schema",
      children: JSON.stringify(dailySchema.value),
    },
  ],
}));

const markdown = new MarkdownIt({
  html: false,
  linkify: true,
  typographer: true,
  breaks: true,
});
installMarkdownExternalLinkRule(markdown, () => siteHostname.value);

function renderDailyMarkdown(content: DailyViewItem["content"]) {
  return markdown.render(content || "暂无内容");
}
</script>

<template>
  <div class="daily-page">
    <main class="daily-shell">
      <header class="daily-head">
        <h1>日常记录</h1>
        <p>全部内容按时间线展示，从新到旧。</p>
      </header>

      <section v-if="timelineEntries.length" class="daily-list-wrap">
        <ol class="daily-timeline">
          <li
            v-for="daily in timelineEntries"
            :id="daily.anchorId"
            :key="daily.id"
            class="daily-item"
          >
            <span class="daily-node" aria-hidden="true" />
            <article class="daily-card">
              <span
                v-if="daily.weather"
                class="daily-card-weather-bg"
                :data-weather="daily.weatherKey"
                aria-hidden="true"
              />
              <header class="daily-card-head">
                <img class="daily-author-avatar" :src="authorAvatar" :alt="`${authorName}头像`">
                <div class="daily-author-meta">
                  <p class="daily-author-name">{{ authorName }}</p>
                  <time :datetime="daily.createdAt" :title="formatAbsoluteTime(daily.createdAt)">
                    {{ formatRelativeTime(daily.createdAt) }}
                  </time>
                </div>
              </header>

              <h2 class="daily-title">{{ daily.title }}</h2>
              <div class="daily-content" v-html="renderDailyMarkdown(daily.content)" />
            </article>
          </li>
        </ol>
      </section>

      <section v-else class="daily-empty">
        <p>{{ pending ? "日志加载中..." : "还没有日常记录。" }}</p>
      </section>
    </main>
  </div>
</template>

<style scoped>
.daily-page {
  min-height: 100vh;
  padding: 6.6rem 1rem 2.7rem;
}

.daily-shell {
  width: min(var(--site-content-width), 62rem);
  margin: 0 auto;
}

.daily-head {
  margin-bottom: 1rem;
}

.daily-head h1 {
  margin: 0;
  color: rgba(238, 247, 255, 0.97);
  font-size: 1.72rem;
  line-height: 1.2;
}

.daily-head p {
  margin: 0.38rem 0 0;
  color: rgba(188, 205, 224, 0.84);
  font-size: 0.95rem;
}

.daily-list-wrap {
  position: relative;
}

.daily-timeline {
  margin: 0;
  padding: 0;
  list-style: none;
  position: relative;
}

.daily-timeline::before {
  content: "";
  position: absolute;
  top: 0.65rem;
  bottom: 0.7rem;
  left: 1.2rem;
  width: 1px;
  background: linear-gradient(
    to bottom,
    rgba(175, 203, 229, 0.45),
    rgba(120, 150, 182, 0.25)
  );
}

.daily-item {
  position: relative;
  padding-left: 3rem;
  padding-bottom: 1.12rem;
  scroll-margin-top: 10.6rem;
}

.daily-item:last-child {
  padding-bottom: 0;
}

.daily-node {
  position: absolute;
  left: 1.2rem;
  top: 1.05rem;
  width: 0.62rem;
  height: 0.62rem;
  border-radius: 50%;
  transform: translate(-50%, -50%);
  border: 1px solid rgba(208, 224, 242, 0.75);
  background: rgba(123, 175, 232, 0.84);
  box-shadow: 0 0 0 0.18rem rgba(67, 104, 145, 0.26);
}

.daily-card {
  position: relative;
  overflow: hidden;
  border: 1px solid rgba(104, 122, 146, 0.34);
  border-radius: 0.88rem;
  padding: 0.82rem 0.96rem 0.86rem;
  background: linear-gradient(
    135deg,
    rgba(21, 24, 30, 0.92),
    rgba(17, 19, 24, 0.9)
  );
  box-shadow: 0 14px 28px rgba(0, 0, 0, 0.24);
}

.daily-card > * {
  position: relative;
  z-index: 1;
}

.daily-card-weather-bg {
  position: absolute;
  right: -0.8rem;
  top: 50%;
  z-index: 0;
  width: 8.2rem;
  height: 8.2rem;
  transform: translateY(-50%);
  pointer-events: none;
  opacity: 0.14;
  background: linear-gradient(145deg, rgba(159, 218, 255, 0.92), rgba(82, 157, 226, 0.8));
  filter: drop-shadow(0 0 18px rgba(62, 131, 198, 0.22));
  mask-position: center;
  mask-size: contain;
  mask-repeat: no-repeat;
  -webkit-mask-position: center;
  -webkit-mask-size: contain;
  -webkit-mask-repeat: no-repeat;
}

.daily-card-weather-bg[data-weather="sun"] {
  mask-image: url("/images/weather/sun.svg");
  -webkit-mask-image: url("/images/weather/sun.svg");
}

.daily-card-weather-bg[data-weather="rain"] {
  mask-image: url("/images/weather/rain.svg");
  -webkit-mask-image: url("/images/weather/rain.svg");
}

.daily-card-weather-bg[data-weather="wind"] {
  mask-image: url("/images/weather/wind.svg");
  -webkit-mask-image: url("/images/weather/wind.svg");
}

.daily-card-weather-bg[data-weather="snow"] {
  mask-image: url("/images/weather/snow.svg");
  -webkit-mask-image: url("/images/weather/snow.svg");
}

.daily-card-weather-bg[data-weather="cloud"] {
  mask-image: url("/images/weather/cloud.svg");
  -webkit-mask-image: url("/images/weather/cloud.svg");
}

.daily-card-head {
  display: flex;
  align-items: center;
  gap: 0.62rem;
}

.daily-author-avatar {
  width: 2.45rem;
  height: 2.45rem;
  border-radius: 50%;
  border: 1px solid rgba(205, 224, 244, 0.56);
  object-fit: cover;
  flex-shrink: 0;
}

.daily-author-meta {
  min-width: 0;
}

.daily-author-name {
  margin: 0;
  color: rgba(241, 248, 255, 0.96);
  font-size: 1.07rem;
  line-height: 1.1;
}

.daily-author-meta time {
  display: inline-block;
  margin-top: 0.14rem;
  color: rgba(178, 194, 210, 0.86);
  font-size: 0.83rem;
}

.daily-title {
  margin: 0.66rem 0 0;
  color: rgba(239, 246, 255, 0.96);
  font-size: 1.08rem;
  line-height: 1.34;
}

.daily-content {
  margin-top: 0.35rem;
}

.daily-content :deep(*) {
  box-sizing: border-box;
  max-width: 100%;
}

.daily-content :deep(p),
.daily-content :deep(li),
.daily-content :deep(blockquote) {
  margin: 0.46rem 0;
  color: rgba(230, 238, 248, 0.95);
  font-size: 1.02rem;
  line-height: 1.68;
}

.daily-content :deep(ul),
.daily-content :deep(ol) {
  margin: 0.46rem 0;
  padding-left: 1.2rem;
}

.daily-content :deep(h2),
.daily-content :deep(h3),
.daily-content :deep(h4) {
  margin: 0.66rem 0 0.24rem;
  color: rgba(244, 251, 255, 0.96);
}

.daily-content :deep(pre) {
  margin: 0.56rem 0;
  border-radius: 0.44rem;
  border: 1px solid rgba(145, 162, 182, 0.24);
  background: rgba(18, 23, 31, 0.74);
  padding: 0.62rem 0.72rem;
  overflow: auto;
}

.daily-content :deep(code) {
  border-radius: 0.22rem;
  background: rgba(255, 255, 255, 0.08);
  padding: 0.05rem 0.26rem;
}

.daily-content :deep(pre code) {
  background: transparent;
  padding: 0;
}

.daily-content :deep(blockquote) {
  border-left: 3px solid rgba(195, 214, 236, 0.6);
  padding-left: 0.6rem;
}

.daily-empty {
  min-height: 10rem;
  border-radius: 0.84rem;
  border: 1px solid rgba(102, 143, 182, 0.3);
  background: rgba(8, 16, 27, 0.8);
  display: grid;
  place-items: center;
}

.daily-empty p {
  margin: 0;
  color: rgba(186, 203, 224, 0.82);
}

@media (max-width: 760px) {
  .daily-page {
    margin-top: 2em;
    padding: 5.9rem 0.58rem 2rem;
  }

  .daily-head h1 {
    font-size: 1.4rem;
  }

  .daily-timeline::before {
    left: 0.94rem;
  }

  .daily-item {
    padding-left: 2.4rem;
    padding-bottom: 0.9rem;
    scroll-margin-top: 11.6rem;
  }

  .daily-node {
    left: 0.94rem;
  }

  .daily-card {
    border-radius: 0.74rem;
    padding: 0.72rem 0.68rem 0.76rem;
  }

  .daily-card-weather-bg {
    right: -0.72rem;
    width: 6.2rem;
    height: 6.2rem;
    opacity: 0.13;
  }

  .daily-author-avatar {
    width: 2.2rem;
    height: 2.2rem;
  }

  .daily-author-name {
    font-size: 0.98rem;
  }

  .daily-author-meta time {
    font-size: 0.77rem;
  }

  .daily-title {
    font-size: 1rem;
  }

  .daily-content :deep(p),
  .daily-content :deep(li),
  .daily-content :deep(blockquote) {
    font-size: 0.95rem;
  }
}
</style>
