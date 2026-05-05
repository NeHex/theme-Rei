<script setup lang="ts">
const { settings } = useSiteSettings();
const { articles } = useArticles();
const requestUrl = useRequestURL();
const DISPLAY_TIME_ZONE = "Asia/Shanghai";

const siteBaseUrl = computed(() => {
  const configured = String(settings.value.siteUrl || "").trim();
  if (configured) return configured.replace(/\/+$/, "");
  return `${requestUrl.protocol}//${requestUrl.host}`;
});
const canonicalUrl = computed(() => `${siteBaseUrl.value}/archive`);
const seoDescription = computed(() => `文章归档与时间线 - ${settings.value.siteDesc}`);
const ogImage = computed(() => {
  const input = String(settings.value.userHeadpic || "/images/head.jpg").trim();
  if (!input) return "";
  if (/^https?:\/\//i.test(input)) return input;
  return `${siteBaseUrl.value}${input.startsWith("/") ? input : `/${input}`}`;
});
const archiveSchema = computed(() => ({
  "@context": "https://schema.org",
  "@type": "CollectionPage",
  name: `归档 - ${settings.value.siteTitle}`,
  description: seoDescription.value,
  url: canonicalUrl.value,
}));

useHead(() => ({
  title: `归档 - ${settings.value.siteTitle}`,
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
      content: `归档 - ${settings.value.siteTitle}`,
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
      key: "archive-schema",
      children: JSON.stringify(archiveSchema.value),
    },
  ],
}));

const keyword = ref("");

const categoryMap: Record<string, string> = {
  default: "手记",
  tech: "技术",
  life: "生活",
  note: "笔记",
  journal: "手记",
  essay: "经历",
  coding: "编程",
};

function parseDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? new Date(0) : date;
}

function getDatePartsInDisplayZone(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: DISPLAY_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  return {
    year: Number(parts.find((part) => part.type === "year")?.value || "1970"),
    month: Number(parts.find((part) => part.type === "month")?.value || "1"),
    day: Number(parts.find((part) => part.type === "day")?.value || "1"),
  };
}

function getSecondsOfDayInDisplayZone(date: Date) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: DISPLAY_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);

  const hour = Number(parts.find((part) => part.type === "hour")?.value || "0");
  const minute = Number(parts.find((part) => part.type === "minute")?.value || "0");
  const second = Number(parts.find((part) => part.type === "second")?.value || "0");
  return hour * 3600 + minute * 60 + second;
}

function getDayOfYear(date: Date) {
  const { year, month, day } = getDatePartsInDisplayZone(date);
  const yearStart = Date.UTC(year, 0, 1);
  const current = Date.UTC(year, month - 1, day);
  const diff = current - yearStart;
  return Math.floor(diff / 86400000) + 1;
}

function getDaysInYear(year: number) {
  const leapYear = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
  return leapYear ? 366 : 365;
}

function formatMonthDay(date: Date) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    timeZone: DISPLAY_TIME_ZONE,
  }).format(date);
}

function normalizeCategory(value: string) {
  const key = (value || "").trim().toLowerCase();
  if (!key) return "未分类";
  return categoryMap[key] || value;
}

function getEntryMeta(article: ReturnType<typeof mappedArticles>[number]) {
  const parts: string[] = [];
  parts.push(normalizeCategory(article.category));

  if (article.tags.length > 0) {
    parts.push(...article.tags.slice(0, 2));
  }

  return parts.join(" / ");
}

const mappedArticles = computed(() => {
  return articles.value
    .map((article) => {
      const date = parseDate(article.publishedAt || article.updatedAt);
      return {
        ...article,
        date,
        year: getDatePartsInDisplayZone(date).year,
        monthDay: formatMonthDay(date),
      };
    })
    .sort((a, b) => b.date.getTime() - a.date.getTime());
});

const filteredArticles = computed(() => {
  const query = keyword.value.trim().toLowerCase();
  if (!query) return mappedArticles.value;

  return mappedArticles.value.filter((article) => {
    const bag = [
      article.title,
      article.category,
      article.tags.join(" "),
      getEntryMeta(article),
    ]
      .join(" ")
      .toLowerCase();

    return bag.includes(query);
  });
});

const groupedByYear = computed(() => {
  const groupMap = new Map<number, typeof filteredArticles.value>();

  for (const article of filteredArticles.value) {
    if (!groupMap.has(article.year)) {
      groupMap.set(article.year, []);
    }
    groupMap.get(article.year)?.push(article);
  }

  return Array.from(groupMap.entries())
    .sort((a, b) => b[0] - a[0])
    .map(([year, entries]) => ({
      year,
      entries,
    }));
});

const renderNowIso = useState("archive-render-now", () => new Date().toISOString());
const now = computed(() => parseDate(renderNowIso.value));

const totalCount = computed(() => filteredArticles.value.length);
const dayOfYear = computed(() => getDayOfYear(now.value));
const yearProgress = computed(() => {
  const currentYear = getDatePartsInDisplayZone(now.value).year;
  const days = getDaysInYear(currentYear);
  return Math.round((dayOfYear.value / days) * 100);
});
const todayProgress = computed(() => {
  const seconds = getSecondsOfDayInDisplayZone(now.value);
  return Math.round((seconds / 86400) * 100);
});

type MetricKey = "total" | "day" | "yearProgress" | "todayProgress";

const isClientReady = ref(false);
const animatedMetrics = reactive<Record<MetricKey, number>>({
  total: 0,
  day: 0,
  yearProgress: 0,
  todayProgress: 0,
});
const animatedYearMap = ref<Record<number, string>>({});

let metricFrameIds: Partial<Record<MetricKey, number>> = {};
const yearTimeoutIds: number[] = [];

function randomDigit() {
  return String(Math.floor(Math.random() * 10));
}

function clearMetricAnimation(metric: MetricKey) {
  const frameId = metricFrameIds[metric];
  if (frameId !== undefined) {
    window.cancelAnimationFrame(frameId);
    delete metricFrameIds[metric];
  }
}

function clearAllMetricAnimations() {
  const keys = Object.keys(animatedMetrics) as MetricKey[];
  for (const key of keys) clearMetricAnimation(key);
}

function queueYearTimeout(callback: () => void, delayMs: number) {
  const timeoutId = window.setTimeout(callback, delayMs);
  yearTimeoutIds.push(timeoutId);
}

function clearYearAnimations() {
  while (yearTimeoutIds.length) {
    const timeoutId = yearTimeoutIds.pop();
    if (timeoutId !== undefined) window.clearTimeout(timeoutId);
  }
}

function animateMetric(
  metric: MetricKey,
  target: number,
  durationMs = 920,
  delayMs = 0,
) {
  clearMetricAnimation(metric);
  const from = Number(animatedMetrics[metric]) || 0;

  const launchAt = performance.now() + delayMs;
  const tick = (nowMs: number) => {
    if (nowMs < launchAt) {
      metricFrameIds[metric] = window.requestAnimationFrame(tick);
      return;
    }

    const progress = Math.min((nowMs - launchAt) / durationMs, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    animatedMetrics[metric] = Math.round(from + (target - from) * eased);

    if (progress < 1) {
      metricFrameIds[metric] = window.requestAnimationFrame(tick);
      return;
    }

    animatedMetrics[metric] = target;
    clearMetricAnimation(metric);
  };

  metricFrameIds[metric] = window.requestAnimationFrame(tick);
}

function animateYear(year: number, baseDelayMs = 0) {
  const target = String(year);
  const makeScramble = () => target.split("").map(() => randomDigit()).join("");

  animatedYearMap.value = {
    ...animatedYearMap.value,
    [year]: makeScramble(),
  };

  for (let index = 0; index < target.length; index += 1) {
    queueYearTimeout(() => {
      const settled = target.slice(0, index + 1);
      const randomTail = target
        .slice(index + 1)
        .split("")
        .map(() => randomDigit())
        .join("");

      animatedYearMap.value = {
        ...animatedYearMap.value,
        [year]: `${settled}${randomTail}`,
      };

      if (index === target.length - 1) {
        queueYearTimeout(() => {
          animatedYearMap.value = {
            ...animatedYearMap.value,
            [year]: target,
          };
        }, 70);
      }
    }, baseDelayMs + index * 130);
  }
}

function runTopMetricAnimations() {
  animatedMetrics.total = 0;
  animatedMetrics.day = 0;
  animatedMetrics.yearProgress = 0;
  animatedMetrics.todayProgress = 0;

  animateMetric("total", totalCount.value, 980, 0);
  animateMetric("day", dayOfYear.value, 960, 110);
  animateMetric("yearProgress", yearProgress.value, 940, 210);
  animateMetric("todayProgress", todayProgress.value, 920, 300);
}

function runYearAnimations() {
  clearYearAnimations();
  groupedByYear.value.forEach((group, index) => {
    animateYear(group.year, index * 170);
  });
}

watch(
  groupedByYear,
  (groups) => {
    const nextYearMap: Record<number, string> = {};
    for (const group of groups) {
      nextYearMap[group.year] = animatedYearMap.value[group.year] || String(group.year);
    }
    animatedYearMap.value = nextYearMap;

    if (import.meta.client && isClientReady.value) {
      runYearAnimations();
    }
  },
  { immediate: true },
);

watch(
  [totalCount, dayOfYear, yearProgress, todayProgress],
  ([nextTotal, nextDay, nextYearProgress, nextTodayProgress]) => {
    if (!import.meta.client || !isClientReady.value) return;

    animateMetric("total", nextTotal, 760, 0);
    animateMetric("day", nextDay, 720, 80);
    animateMetric("yearProgress", nextYearProgress, 700, 150);
    animateMetric("todayProgress", nextTodayProgress, 680, 220);
  },
);

onMounted(() => {
  isClientReady.value = true;
  runTopMetricAnimations();
  runYearAnimations();
});

onBeforeUnmount(() => {
  clearAllMetricAnimations();
  clearYearAnimations();
});
</script>

<template>
  <div class="archive-page">
    <main class="archive-shell">
      <section class="archive-top">
        <div class="archive-top-left">
          <p class="archive-caption">时间线</p>
          <h1>
            <span>{{ isClientReady ? animatedMetrics.total : totalCount }}</span>
            <small>篇</small>
          </h1>

          <div class="archive-stats">
            <article>
              <strong>{{ isClientReady ? animatedMetrics.day : dayOfYear }}</strong>
              <span>今年第几天</span>
            </article>
            <article>
              <strong>{{ isClientReady ? `${animatedMetrics.yearProgress}%` : `${yearProgress}%` }}</strong>
              <span>今年进度</span>
            </article>
            <article>
              <strong>{{ isClientReady ? `${animatedMetrics.todayProgress}%` : `${todayProgress}%` }}</strong>
              <span>今日进度</span>
            </article>
          </div>

          <p class="archive-quote">Before was was,was was is</p>
        </div>

        <label class="archive-search" aria-label="搜索文章">
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle cx="11" cy="11" r="7" />
            <path d="M20 20L16.65 16.65" />
          </svg>
          <input v-model="keyword" type="text" placeholder="搜索" />
        </label>
      </section>

      <section class="archive-timeline">
        <article v-for="(group, groupIndex) in groupedByYear" :key="group.year" class="year-group">
          <header class="year-head">
            <h2>{{ isClientReady ? (animatedYearMap[group.year] || String(group.year)) : group.year }}</h2>
            <span>{{ group.entries.length }} 篇文章</span>
          </header>

          <div class="year-entries">
            <NuxtLink prefetch="false"
              v-for="(item, entryIndex) in group.entries"
              :key="item.id"
              :to="`/article/${item.id}`"
              class="timeline-item timeline-item-reveal"
              :style="{ '--entry-order': groupIndex * 14 + entryIndex }"
            >
              <time class="timeline-date" :datetime="item.publishedAt">{{ item.monthDay }}</time>
              <span class="timeline-title">
                {{ item.title }}
                <i v-if="item.top > 0" aria-hidden="true">🔖</i>
              </span>
              <span class="timeline-meta">{{ getEntryMeta(item) }}</span>
            </NuxtLink>
          </div>
        </article>

        <p v-if="!groupedByYear.length" class="archive-empty">暂无匹配内容</p>
      </section>
    </main>
  </div>
</template>

<style scoped>
.archive-page {
  min-height: 100vh;
  padding: 6.6rem 1rem 2.4rem;
}

.archive-shell {
  width: min(var(--site-max-width), 1560px);
  margin: 0 auto;
}

.archive-top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 2rem;
}

.archive-top-left {
  max-width: 44rem;
}

.archive-caption {
  margin: 0;
  color: var(--theme-text-mute);
  font-size: var(--fs-small);
  letter-spacing: 0.04em;
}

.archive-top-left h1 {
  margin: 0.45rem 0 0;
  display: flex;
  align-items: baseline;
  gap: 0.8rem;
}

.archive-top-left h1 span {
  font-size: clamp(3.4rem, 8.3vw, 5.4rem);
  line-height: 1;
  color: rgba(240, 248, 255, 0.82);
}

.archive-top-left h1 small {
  color: rgba(219, 231, 241, 0.88);
  font-size: clamp(1.3rem, 2.2vw, 2rem);
  font-weight: 600;
}

.archive-stats {
  margin-top: 1.35rem;
  display: flex;
  gap: clamp(1.2rem, 2vw, 2rem);
}

.archive-stats article {
  display: grid;
  gap: 0.25rem;
}

.archive-stats strong {
  font-size: clamp(2rem, 3.5vw, 3rem);
  color: #7cdce8;
  line-height: 1;
}

.archive-stats article:nth-child(2) strong,
.archive-stats article:nth-child(3) strong {
  color: rgba(226, 237, 245, 0.62);
}

.archive-stats span {
  color: var(--theme-text-mute);
  font-size: var(--fs-small);
}

.archive-quote {
  margin: 0.92rem 0 0;
  color: rgba(193, 212, 228, 0.75);
  font-size: 1.8rem;
}

.archive-search {
  display: inline-flex;
  align-items: center;
  gap: 0.48rem;
  margin-top: 0.15rem;
  color: var(--theme-text-mute);
  border-radius: 999px;
  padding: 0.46rem 0.7rem;
  border: 1px solid transparent;
  transition: border-color 0.2s ease, background 0.2s ease;
}

.archive-search:focus-within {
  border-color: var(--theme-border);
  background: rgba(10, 18, 32, 0.52);
}

.archive-search svg {
  width: 1.06rem;
  height: 1.06rem;
  flex: none;
}

.archive-search svg circle,
.archive-search svg path {
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
}

.archive-search input {
  width: clamp(7rem, 14vw, 12rem);
  border: 0;
  outline: none;
  background: transparent;
  color: var(--theme-text);
  font-size: var(--fs-body);
}

.archive-search input::placeholder {
  color: var(--theme-text-mute);
}

.archive-timeline {
  margin-top: 2.15rem;
  border-left: 1px solid rgba(131, 156, 182, 0.35);
  padding-left: 1.4rem;
}

.year-group + .year-group {
  margin-top: 1.4rem;
}

.year-head {
  display: flex;
  align-items: baseline;
  gap: 0.72rem;
}

.year-head h2 {
  margin: 0;
  font-size: clamp(2.1rem, 4vw, 3.65rem);
  line-height: 1.05;
  color: rgba(230, 239, 246, 0.72);
}

.year-head span {
  color: rgba(193, 212, 228, 0.66);
  font-size: 1.18rem;
}

.year-entries {
  margin-top: 0.6rem;
  display: grid;
}

.timeline-item {
  display: grid;
  grid-template-columns: 4.4rem minmax(0, 1fr) minmax(8rem, 16rem);
  gap: 0.95rem;
  align-items: baseline;
  padding: 0.66rem 0;
  color: var(--theme-text);
  background-image: none;
}

.timeline-item-reveal {
  opacity: 0;
  transform: translateY(0.95rem);
  animation: timeline-item-rise-in 620ms cubic-bezier(0.2, 0.86, 0.24, 1) both;
  animation-delay: calc(var(--entry-order, 0) * 52ms + 110ms);
}

.timeline-date {
  color: rgba(182, 202, 222, 0.72);
  font-size: 1.7rem;
  letter-spacing: 0.02em;
  font-variant-numeric: tabular-nums;
}

.timeline-title {
  color: rgba(235, 244, 255, 0.92);
  font-size: clamp(1.45rem, 2.05vw, 2.15rem);
  line-height: 1.26;
  transition: color 0.2s ease, transform 0.2s ease;
}

.timeline-title i {
  font-style: normal;
  font-size: 0.9em;
  margin-left: 0.35rem;
}

.timeline-meta {
  justify-self: end;
  color: rgba(175, 196, 216, 0.7);
  font-size: var(--fs-small);
  text-align: right;
}

.timeline-item:hover .timeline-title {
  color: #dff7ff;
  transform: translateX(2px);
}

.archive-empty {
  margin: 1.2rem 0 0;
  color: var(--theme-text-mute);
  font-size: 1rem;
}

@keyframes timeline-item-rise-in {
  from {
    opacity: 0;
    transform: translateY(0.95rem);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (max-width: 1080px) {
  .timeline-item {
    grid-template-columns: 4.2rem minmax(0, 1fr);
  }

  .timeline-meta {
    grid-column: 2;
    justify-self: start;
    text-align: left;
    margin-top: 0.15rem;
  }
}

@media (max-width: 760px) {
  .archive-page {
    margin-top:2em;
    padding: 6rem 0.62rem 2rem;
  }

  .archive-top {
    flex-direction: column;
    gap: 1rem;
  }

  .archive-search {
    margin-top: 0;
    width: 100%;
  }

  .archive-search input {
    width: 100%;
  }

  .archive-timeline {
    margin-top: 1.5rem;
    padding-left: 0.78rem;
  }

  .archive-top-left h1 {
    gap: 0.5rem;
  }

  .archive-top-left h1 small {
    font-size: 1.16rem;
  }

  .archive-stats {
    gap: 1rem;
    flex-wrap: wrap;
  }

  .archive-quote {
    font-size: 1.05rem;
  }

  .year-head span {
    font-size: 0.88rem;
  }

  .timeline-item {
    grid-template-columns: 1fr;
    gap: 0.2rem;
  }

  .timeline-date {
    font-size: 0.92rem;
  }

  .timeline-title {
    font-size: 1.18rem;
  }

  .timeline-meta {
    grid-column: auto;
    margin-top: 0;
    font-size: 0.84rem;
  }
}

@media (prefers-reduced-motion: reduce) {
  .timeline-item-reveal {
    opacity: 1;
    transform: none;
    animation: none !important;
  }
}
</style>
