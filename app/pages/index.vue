<script setup lang="ts">
import { isExternalSiteLink, resolveSiteHostname } from "~/utils/link";

type OwnerSpotlightItem = {
  id: string;
  name: string;
  src: string;
  alt: string;
  likesText: string;
  to: string;
};

type BlogPost = {
  id: string;
  title: string;
  summary: string;
  cover: string;
  to: string;
};

type DailyRecord = {
  year: string;
  date: string;
  title: string;
  summary: string;
  weatherKey: DailyWeatherKey;
  to: string;
};

type PhotoItem = {
  title: string;
  date: string;
  image: string;
  alt: string;
  to: string;
};

type ProjectItem = {
  id: string;
  title: string;
  summary: string;
  icon: string;
  category: string;
  content: string;
  techStack: string[];
  projectUrl: string;
  githubUrl: string;
  updatedAt: string;
};

type SocialItem = {
  key: string;
  label: string;
  href: string;
  icon: "github" | "bilibili" | "steam" | "neteasemusic" | "email" | "feed";
};

type DailyWeatherKey = "sun" | "rain" | "wind" | "snow" | "cloud";

const { settings, pending: settingsPending } = useSiteSettings();
const requestUrl = useRequestURL();
const { articles: fetchedArticles } = useArticles();
const { albums: fetchedAlbums } = useAlbums();
const { dailies: fetchedDailies } = useDailies();
const { projects: fetchedProjects } = useProjects();
const DISPLAY_TIME_ZONE = "Asia/Shanghai";
const siteHostname = computed(() =>
  resolveSiteHostname(settings.value.siteUrl, `${requestUrl.protocol}//${requestUrl.host}`),
);
const siteBaseUrl = computed(() => {
  const configured = String(settings.value.siteUrl || "").trim();
  if (configured) return configured.replace(/\/+$/, "");
  return `${requestUrl.protocol}//${requestUrl.host}`;
});

function toAbsoluteUrl(pathOrUrl: string) {
  const input = String(pathOrUrl || "").trim();
  if (!input) return "";
  if (/^https?:\/\//i.test(input)) return input;
  return `${siteBaseUrl.value}${input.startsWith("/") ? input : `/${input}`}`;
}

const fallbackOwnerSpotlight: OwnerSpotlightItem = {
  id: "fallback",
  name: "今日份拍摄",
  src: "/images/pic.jpg",
  alt: "Card preview image",
  likesText: "0",
  to: "/album",
};

const ownerSpotlights = computed<OwnerSpotlightItem[]>(() => {
  const mapped = fetchedAlbums.value.map((album, index) => {
    const cover = album.cover || album.imageUrls[0] || "/images/pic.jpg";

    return {
      id: album.id,
      name: album.title || `相册 ${index + 1}`,
      src: cover,
      alt: `${album.title || "相册"}封面`,
      likesText: String(album.likes ?? 0),
      to: `/album?album=${encodeURIComponent(album.id)}`,
    };
  });

  return mapped.length ? mapped : [fallbackOwnerSpotlight];
});

const homePosts = computed<BlogPost[]>(() =>
  fetchedArticles.value.slice(0, 5).map((article) => ({
    id: article.id,
    title: article.title,
    summary: article.summary,
    cover: article.cover,
    to: `/article/${article.id}`,
  })),
);

const canonicalUrl = computed(() => siteBaseUrl.value);
const seoDescription = computed(() => {
  const featuredPost = homePosts.value[0];
  if (featuredPost?.summary) return featuredPost.summary.slice(0, 160);
  return settings.value.siteDesc;
});
const ogImage = computed(() => {
  const fallback = String(settings.value.userHeadpic || "/images/head.jpg").trim();
  return toAbsoluteUrl(fallback);
});
const homeSchema = computed(() => ({
  "@context": "https://schema.org",
  "@type": "WebPage",
  name: settings.value.siteTitle,
  description: seoDescription.value,
  url: canonicalUrl.value,
}));

useHead(() => ({
  title: settings.value.siteTitle,
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
      content: settings.value.siteTitle,
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
      key: "home-schema",
      children: JSON.stringify(homeSchema.value),
    },
  ],
}));

const fallbackDailyRecords: readonly DailyRecord[] = [
  {
    year: "2026",
    date: "03.04",
    title: "暂无日常哦",
    summary:
      "请前往后台更新你的日常",
    weatherKey: "sun",
    to: "/daily",
  }
];

function formatDailyYear(dateInput: string) {
  const date = new Date(dateInput);
  if (Number.isNaN(date.getTime())) return "----";
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    timeZone: DISPLAY_TIME_ZONE,
  }).format(date);
}

function formatDailyDate(dateInput: string) {
  const date = new Date(dateInput);
  if (Number.isNaN(date.getTime())) return "--.--";
  const parts = new Intl.DateTimeFormat("en-CA", {
    month: "2-digit",
    day: "2-digit",
    timeZone: DISPLAY_TIME_ZONE,
  }).formatToParts(date);
  const month = parts.find((part) => part.type === "month")?.value || "--";
  const day = parts.find((part) => part.type === "day")?.value || "--";
  return `${month}.${day}`;
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

  if (
    value.includes("cloud")
    || value.includes("overcast")
    || value.includes("阴")
    || value.includes("多云")
    || value.includes("云")
  ) {
    return "cloud";
  }

  return "cloud";
}

const dailyRecords = computed<DailyRecord[]>(() => {
  const items = fetchedDailies.value
    .slice()
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 4)
    .map((daily) => {
      return {
        year: formatDailyYear(daily.createdAt),
        date: formatDailyDate(daily.createdAt),
        title: daily.title,
        summary: daily.summary,
        weatherKey: mapDailyWeatherKey(daily.weather),
        to: `/daily#daily-${encodeURIComponent(daily.id)}`,
      };
    });

  return items.length ? items : [...fallbackDailyRecords];
});

const fallbackPhotos: readonly PhotoItem[] = [
  {
    title: "李元芳",
    date: "2026-03-22",
    image: "/images/pic.jpg",
    alt: "Recent capture 1",
    to: "/album",
  }
];

const photos = computed<PhotoItem[]>(() => {
  const items = fetchedAlbums.value.slice(0, 4).map((album, index) => ({
    title: album.title,
    date: album.createdAt.slice(0, 10),
    image: album.cover,
    alt: `${album.title}-${index + 1}`,
    to: `/album?album=${encodeURIComponent(album.id)}`,
  }));

  return items.length ? items : [...fallbackPhotos];
});

const fallbackProjects: readonly ProjectItem[] = [
  {
    id: "fallback-project",
    title: "CoseRoom",
    summary: "图文视频音乐分享平台",
    icon: "/images/coseroom-logo.png",
    category: "默认",
    content: "暂无更详细项目介绍。",
    techStack: [],
    projectUrl: "https://coseroom.com",
    githubUrl: "",
    updatedAt: new Date().toISOString(),
  },
];

const projects = computed<ProjectItem[]>(() => {
  if (!fetchedProjects.value.length) return [...fallbackProjects];
  return fetchedProjects.value.map((project) => ({
    id: project.id,
    title: project.title,
    summary: project.summary,
    icon: project.icon,
    category: project.category || "默认",
    content: project.content || "暂无更详细项目介绍。",
    techStack: project.techStack,
    projectUrl: project.projectUrl,
    githubUrl: project.githubUrl,
    updatedAt: project.updatedAt,
  }));
});

const projectLanguagePalette = [
  "#8b949e",
  "#f1e05a",
  "#3572a5",
  "#e34c26",
  "#89e051",
  "#563d7c",
  "#2b7489",
  "#00add8",
  "#f34b7d",
];

function getProjectLanguages(project: ProjectItem) {
  const unique = new Set(
    project.techStack
      .map((item) => item.trim())
      .filter(Boolean),
  );
  if (unique.size) return [...unique];

  const fallbackCategory = project.category.trim();
  if (fallbackCategory && fallbackCategory !== "默认") return [fallbackCategory];
  return ["未标注"];
}

function getProjectLanguageColor(language: string, index: number) {
  const key = `${language}-${index}`;
  let hash = 0;
  for (let i = 0; i < key.length; i += 1) {
    hash = (hash * 33 + key.charCodeAt(i)) >>> 0;
  }
  return projectLanguagePalette[hash % projectLanguagePalette.length];
}

function getProjectCategoryLabel(project: ProjectItem) {
  const value = project.category.trim();
  if (!value || value === "默认") return "未分类";
  return value;
}

const spotlightOrder = ref<number[]>([]);
const spotlightCursor = ref(0);
const isClientMounted = ref(false);
const blogShellRef = ref<HTMLElement | null>(null);
const blogCardsVisible = ref(false);
let blogObserver: IntersectionObserver | null = null;
const journalShellRef = ref<HTMLElement | null>(null);
const journalCardsVisible = ref(false);
let journalObserver: IntersectionObserver | null = null;
const photoShellRef = ref<HTMLElement | null>(null);
const photoCardsVisible = ref(false);
let photoObserver: IntersectionObserver | null = null;
const projectShellRef = ref<HTMLElement | null>(null);
const projectCardsVisible = ref(false);
let projectObserver: IntersectionObserver | null = null;

function createStableDelay(seed: string, min = 50, span = 260) {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 33 + seed.charCodeAt(i)) >>> 0;
  }
  return min + (hash % (span + 1));
}

const projectMaskDelayMs = computed(() =>
  projects.value.map((project, index) => createStableDelay(`${project.id}-${project.title}-${index}`)),
);

const activeProject = ref<ProjectItem | null>(null);
const projectModalVisible = computed(() => Boolean(activeProject.value));
const { lockScroll, unlockScroll } = useScrollLock();
const isProjectModalLocked = ref(false);

function openProjectDetail(project: ProjectItem) {
  activeProject.value = project;
  if (!isProjectModalLocked.value) {
    lockScroll();
    isProjectModalLocked.value = true;
  }
}

function closeProjectDetail() {
  activeProject.value = null;
  if (isProjectModalLocked.value) {
    unlockScroll();
    isProjectModalLocked.value = false;
  }
}

function formatProjectDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "未知时间";
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: DISPLAY_TIME_ZONE,
  }).format(date);
}

function handleProjectModalKeydown(event: KeyboardEvent) {
  if (event.key === "Escape" && projectModalVisible.value) {
    closeProjectDetail();
  }
}

const HOME_BACKGROUND_FALLBACK = "/images/background.png";
const homeBackgroundImage = ref("none");
const homeBackgroundVisible = ref(false);
let homeBackgroundLoadToken = 0;

function toCssUrl(value: string) {
  return `url("${value.replace(/"/g, '\\"')}")`;
}

function loadImageSource(src: string) {
  return new Promise<boolean>((resolve) => {
    const image = new Image();
    let settled = false;
    const finish = (ok: boolean) => {
      if (settled) return;
      settled = true;
      resolve(ok);
    };

    image.decoding = "async";
    image.onload = () => finish(true);
    image.onerror = () => finish(false);
    image.src = src;

    if (image.complete) {
      finish(image.naturalWidth > 0);
    }
  });
}

async function preloadHomeBackground(rawSrc: string) {
  if (!import.meta.client) return;

  const source = rawSrc.trim() || HOME_BACKGROUND_FALLBACK;
  const token = ++homeBackgroundLoadToken;
  homeBackgroundVisible.value = false;

  const candidates = source === HOME_BACKGROUND_FALLBACK
    ? [HOME_BACKGROUND_FALLBACK]
    : [source, HOME_BACKGROUND_FALLBACK];

  for (const candidate of candidates) {
    const loaded = await loadImageSource(candidate);
    if (token !== homeBackgroundLoadToken) return;

    if (loaded) {
      homeBackgroundImage.value = toCssUrl(candidate);
      homeBackgroundVisible.value = true;
      return;
    }
  }

  homeBackgroundImage.value = "none";
  homeBackgroundVisible.value = true;
}

const homeBackgroundSource = computed(() => settings.value.themeBackground || HOME_BACKGROUND_FALLBACK);

watch([homeBackgroundSource, settingsPending], ([source, pending]) => {
  if (!import.meta.client) return;
  if (pending && source === HOME_BACKGROUND_FALLBACK) return;
  void preloadHomeBackground(source);
}, { immediate: true });

const homeStyleVars = computed(() => ({
  "--home-background-image": homeBackgroundImage.value,
  "--home-background-opacity": homeBackgroundVisible.value ? "1" : "0",
}));

const ownerBioLines = computed(() =>
  settings.value.userDesc
    .split(/\r?\n/g)
    .map((line) => line.trim())
    .filter(Boolean),
);

const ownerSocialItems = computed<SocialItem[]>(() => {
  const links = settings.value.userSocialLink;
  const entries: SocialItem[] = [
    { key: "github", label: "GitHub", href: links.github || "", icon: "github" },
    { key: "bilibili", label: "哔哩哔哩", href: links.bilibili || "", icon: "bilibili" },
    { key: "steam", label: "Steam", href: links.steam || "", icon: "steam" },
    {
      key: "neteasemusic",
      label: "网易云音乐",
      href: links.neteasemusic || "",
      icon: "neteasemusic",
    },
    { key: "email", label: "邮箱", href: links.email || "", icon: "email" },
    { key: "feed", label: "RSS", href: links.feed || links.rss || "", icon: "feed" },
  ];
  return entries.filter((item) => Boolean(item.href));
});

const socialMaskIconMap: Record<"github" | "bilibili" | "steam" | "neteasemusic", string> = {
  github: "/images/social/github.svg",
  bilibili: "/images/social/bilibili.svg",
  steam: "/images/social/steam.svg",
  neteasemusic: "/images/social/neteasecloudmusic.svg",
};

function isExternalLink(url: string) {
  return isExternalSiteLink(url, siteHostname.value);
}

function getSocialMaskIcon(icon: SocialItem["icon"]) {
  if (icon === "email" || icon === "feed") return "";
  return socialMaskIconMap[icon];
}

function buildSpotlightOrder(length: number, previousIndex: number | null = null) {
  const indices = Array.from({ length }, (_, index) => index);
  for (let i = indices.length - 1; i > 0; i -= 1) {
    const randomIndex = Math.floor(Math.random() * (i + 1));
    [indices[i], indices[randomIndex]] = [indices[randomIndex], indices[i]];
  }

  if (previousIndex !== null && indices.length > 1 && indices[0] === previousIndex) {
    [indices[0], indices[1]] = [indices[1], indices[0]];
  }

  return indices;
}

function ensureSpotlightQueue(forceReset = false, randomize = false) {
  const total = ownerSpotlights.value.length;
  if (!total) {
    spotlightOrder.value = [0];
    spotlightCursor.value = 0;
    return;
  }

  const needReset = forceReset || spotlightOrder.value.length !== total;
  if (!needReset) return;

  if (randomize && import.meta.client && total > 1) {
    spotlightOrder.value = buildSpotlightOrder(total);
  } else {
    spotlightOrder.value = Array.from({ length: total }, (_, index) => index);
  }
  spotlightCursor.value = 0;
}

const currentImage = computed<OwnerSpotlightItem>(() => {
  const items = ownerSpotlights.value;
  if (!items.length) return fallbackOwnerSpotlight;

  const order = spotlightOrder.value;
  if (!order.length) return items[0] ?? fallbackOwnerSpotlight;

  const currentOrderIndex = order[spotlightCursor.value] ?? 0;
  return items[currentOrderIndex] ?? items[0] ?? fallbackOwnerSpotlight;
});

function randomScene() {
  const total = ownerSpotlights.value.length;
  if (total <= 1) return;

  if (!spotlightOrder.value.length) {
    ensureSpotlightQueue(true, true);
    return;
  }

  if (spotlightCursor.value < spotlightOrder.value.length - 1) {
    spotlightCursor.value += 1;
    return;
  }

  const previousIndex = spotlightOrder.value[spotlightCursor.value] ?? null;
  spotlightOrder.value = buildSpotlightOrder(total, previousIndex);
  spotlightCursor.value = 0;
}

watch(ownerSpotlights, () => {
  ensureSpotlightQueue(true, isClientMounted.value);
}, { immediate: true });

onMounted(() => {
  isClientMounted.value = true;
  ensureSpotlightQueue(true, true);
  window.addEventListener("keydown", handleProjectModalKeydown);

  if (!("IntersectionObserver" in window)) {
    blogCardsVisible.value = true;
    journalCardsVisible.value = true;
    photoCardsVisible.value = true;
    projectCardsVisible.value = true;
    return;
  }

  blogObserver = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        blogCardsVisible.value = true;
        blogObserver?.disconnect();
        blogObserver = null;
        break;
      }
    },
    {
      threshold: 0.22,
      rootMargin: "0px 0px -12% 0px",
    },
  );

  if (blogShellRef.value) {
    blogObserver.observe(blogShellRef.value);
  }

  journalObserver = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        journalCardsVisible.value = true;
        journalObserver?.disconnect();
        journalObserver = null;
        break;
      }
    },
    {
      threshold: 0.2,
      rootMargin: "0px 0px -10% 0px",
    },
  );

  if (journalShellRef.value) {
    journalObserver.observe(journalShellRef.value);
  }

  photoObserver = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        photoCardsVisible.value = true;
        photoObserver?.disconnect();
        photoObserver = null;
        break;
      }
    },
    {
      threshold: 0.2,
      rootMargin: "0px 0px -8% 0px",
    },
  );

  if (photoShellRef.value) {
    photoObserver.observe(photoShellRef.value);
  }

  projectObserver = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        projectCardsVisible.value = true;
        projectObserver?.disconnect();
        projectObserver = null;
        break;
      }
    },
    {
      threshold: 0.24,
      rootMargin: "0px 0px -8% 0px",
    },
  );

  if (projectShellRef.value) {
    projectObserver.observe(projectShellRef.value);
  }
});

onBeforeUnmount(() => {
  homeBackgroundLoadToken += 1;

  if (isProjectModalLocked.value) {
    unlockScroll();
    isProjectModalLocked.value = false;
  }

  if (import.meta.client) {
    window.removeEventListener("keydown", handleProjectModalKeydown);
  }

  blogObserver?.disconnect();
  blogObserver = null;
  journalObserver?.disconnect();
  journalObserver = null;
  photoObserver?.disconnect();
  photoObserver = null;
  projectObserver?.disconnect();
  projectObserver = null;
});
</script>

<template>
  <div class="page" :style="homeStyleVars">
    <section class="hero">
      <div class="hero-overlay" />
      <div class="hero-card-slot">
        <article class="owner-card">
          <div class="card-left">
            <div class="owner-avatar-wrap">
              <img class="owner-avatar" :src="settings.userHeadpic" :alt="`${settings.userName}头像`" />
              <span class="owner-avatar-bubble">{{ settings.themeHeadmsg || "✨" }}</span>
            </div>
            <h2 class="owner-name">{{ settings.userName }}</h2>
            <p class="owner-bio">
              <template v-for="(line, lineIndex) in ownerBioLines" :key="`${line}-${lineIndex}`">
                <span>{{ line }}</span>
                <br v-if="lineIndex < ownerBioLines.length - 1" />
              </template>
            </p>

            <div class="social-row">
              <a
                v-for="item in ownerSocialItems"
                :key="item.key"
                :href="item.href"
                class="icon-btn"
                :aria-label="item.label"
                :target="isExternalLink(item.href) ? '_blank' : undefined"
                :rel="isExternalLink(item.href) ? 'noopener noreferrer' : undefined"
              >
                <span
                  v-if="item.icon !== 'email' && item.icon !== 'feed'"
                  class="icon-mask"
                  :style="{ '--icon-url': `url(${getSocialMaskIcon(item.icon)})` }"
                  aria-hidden="true"
                />
                <svg v-else-if="item.icon === 'email'" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M5.2 6.1h13.6a1.2 1.2 0 0 1 1.2 1.2v9.4a1.2 1.2 0 0 1-1.2 1.2H5.2A1.2 1.2 0 0 1 4 16.7V7.3a1.2 1.2 0 0 1 1.2-1.2Z" />
                  <path d="m7.4 9.1l4.6 3.7l4.6-3.7" />
                </svg>
                <svg v-else viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <circle cx="4" cy="20" r="2" />
                  <path d="M4 10a10 10 0 0 1 10 10" />
                  <path d="M4 4a16 16 0 0 1 16 16" />
                </svg>
                <span class="icon-tooltip" aria-hidden="true">{{ item.label }}</span>
              </a>
            </div>
          </div>

          <div class="card-right">
            <div class="image-head">
              <h3 class="image-name">{{ currentImage.name }}</h3>
              <button
                class="dice-button"
                type="button"
                title="换一批相册"
                aria-label="换一批相册"
                @click="randomScene"
              >
                <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M20 6v4h-4" />
                  <path d="M4 18v-4h4" />
                  <path d="M6.4 10a6.2 6.2 0 0 1 10.25-2.18L20 10" />
                  <path d="M17.6 14a6.2 6.2 0 0 1-10.25 2.18L4 14" />
                </svg>
                <span>换一批</span>
              </button>
            </div>

            <NuxtLink prefetch="false" :to="currentImage.to" class="scene-link" aria-label="查看当前相册">
              <img class="scene-image" :src="currentImage.src" :alt="currentImage.alt" />
            </NuxtLink>
            <p class="image-caption">
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M12 20.7s-7-4.3-9.4-8.3C1 9.5 2.1 6 5.4 5.2 7.4 4.7 9.4 5.4 10.8 7c.2.2.3.4.5.6c.2-.2.3-.4.5-.6c1.4-1.6 3.4-2.3 5.4-1.8c3.3.8 4.4 4.3 2.8 7.2C19 16.4 12 20.7 12 20.7Z" />
              </svg>
              <span>{{ currentImage.likesText }}</span>
            </p>
          </div>
        </article>
      </div>
    </section>

    <section class="content-fade">
      <div ref="blogShellRef" id="blog" class="blog-shell section-shell">
        <div class="blog-heading">
          <h2 class="blog-title">
            <span>博客文章</span>
          </h2>
          <p class="blog-subtitle">
            Just For Interesting
          </p>
        </div>

        <div class="post-grid" :class="{ 'is-revealed': blogCardsVisible }">
          <NuxtLink prefetch="false"
            v-for="(post, index) in homePosts"
            :key="post.id"
            :to="post.to"
            class="post-card post-card-reveal"
            :style="{ '--card-order': index }"
          >
            <img class="post-cover" :src="post.cover" :alt="post.title" />
            <div class="post-mask" />
            <div class="post-content">
              <h3 class="post-title">{{ post.title }}</h3>
              <p class="post-summary">{{ post.summary }}</p>
            </div>
          </NuxtLink>

          <NuxtLink prefetch="false"
            to="/article"
            class="post-card post-card-more post-card-reveal"
            :style="{ '--card-order': homePosts.length }"
            aria-label="查看更多文章"
          >
            <div class="more-entry">
              <span>查看更多</span>
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M5 12h13" />
                <path d="m13 6l6 6l-6 6" />
              </svg>
            </div>
          </NuxtLink>
        </div>
      </div>

      <div ref="journalShellRef" id="journal" class="journal-shell section-shell">
        <div class="journal-heading">
          <h2 class="journal-title">
            <span>日常记录</span>
          </h2>
          <p class="journal-subtitle">
            我们所度过的每个平凡的日常，也许就是连续发生的奇迹
          </p>
        </div>

        <div class="journal-grid" :class="{ 'is-revealed': journalCardsVisible }">
          <NuxtLink prefetch="false"
            v-for="(record, index) in dailyRecords"
            :key="`${record.year}-${record.date}-${record.title}`"
            :to="record.to"
            class="journal-card journal-card-reveal"
            :style="{ '--journal-order': index, '--journal-flicker-ms': `${580 + index * 110}ms` }"
          >
            <div class="journal-date">
              <div class="journal-year">{{ record.year }}</div>
              <div class="journal-day">{{ record.date }}</div>
              <span class="journal-weather-bg" :data-weather="record.weatherKey" aria-hidden="true" />
            </div>
            <div class="journal-body">
              <h3 class="journal-card-title">{{ record.title }}</h3>
              <p class="journal-card-summary">{{ record.summary }}</p>
            </div>
          </NuxtLink>
        </div>
      </div>

      <div ref="photoShellRef" id="photo" class="photo-shell section-shell">
        <div class="photo-heading">
          <h2 class="photo-title">
            <span>美图相册</span>
          </h2>
          <p class="photo-subtitle">
            把所有的美丽分享给你
          </p>
        </div>

        <div class="photo-grid" :class="{ 'is-revealed': photoCardsVisible }">
          <NuxtLink prefetch="false"
            v-for="(photo, index) in photos"
            :key="`${photo.title}-${photo.date}-${photo.alt}`"
            :to="photo.to"
            class="photo-card photo-card-reveal"
            :style="{ '--photo-order': index }"
          >
            <div class="photo-media">
              <span class="photo-border-trace" aria-hidden="true">
                <svg viewBox="0 0 100 100" preserveAspectRatio="none">
                  <path class="trace-path" d="M50 1 H99 V99 H1 V1 H50" pathLength="100" />
                </svg>
              </span>
              <img class="photo-image" :src="photo.image" :alt="photo.alt" />
            </div>
            <h3 class="photo-name">{{ photo.title }}</h3>
            <p class="photo-date">{{ photo.date }}</p>
          </NuxtLink>
        </div>
      </div>

      <div ref="projectShellRef" id="projects" class="project-shell section-shell">
        <div class="project-heading">
          <h2 class="project-title">
            <span>我的项目</span>
          </h2>
          <p class="project-subtitle">
            近期实践与正在迭代的工具
          </p>
        </div>

        <div class="project-grid" :class="{ 'is-revealed': projectCardsVisible }">
          <button
            v-for="(project, index) in projects"
            :key="project.id"
            type="button"
            class="project-card project-card-reveal"
            :style="{ '--project-mask-delay': `${projectMaskDelayMs[index] ?? 0}ms` }"
            @click="openProjectDetail(project)"
          >
            <header class="project-card-head">
              <h3 class="project-card-title">{{ project.title }}</h3>
              <span class="project-visibility">{{ getProjectCategoryLabel(project) }}</span>
            </header>
            <p class="project-card-summary">{{ project.summary }}</p>
            <div class="project-card-meta">
              <div class="project-language-list">
                <span
                  v-for="(language, languageIndex) in getProjectLanguages(project)"
                  :key="`${project.id}-${language}`"
                  class="project-language-item"
                  :style="{ '--project-language-color': getProjectLanguageColor(language, languageIndex) }"
                >
                  {{ language }}
                </span>
              </div>
            </div>
          </button>
        </div>
      </div>

    </section>

    <Transition name="project-modal-fade">
      <div
        v-if="projectModalVisible && activeProject"
        class="project-modal-mask"
        role="dialog"
        aria-modal="true"
        :aria-label="`${activeProject.title} 项目详情`"
        @click.self="closeProjectDetail"
      >
        <article class="project-modal">
          <button type="button" class="project-modal-close" aria-label="关闭项目详情" @click="closeProjectDetail">
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M6 6L18 18" />
              <path d="M18 6L6 18" />
            </svg>
          </button>

          <header class="project-modal-head">
            <img class="project-modal-icon" :src="activeProject.icon" :alt="`${activeProject.title} logo`" />
            <div class="project-modal-head-meta">
              <h3>{{ activeProject.title }}</h3>
              <p>{{ activeProject.category }}</p>
            </div>
          </header>

          <p class="project-modal-summary">{{ activeProject.summary }}</p>
          <p class="project-modal-content">{{ activeProject.content }}</p>

          <div v-if="activeProject.techStack.length" class="project-modal-tags">
            技术栈：
            <span v-for="tech in activeProject.techStack" :key="`${activeProject.id}-${tech}`">
              {{ tech }}
            </span>
          </div>

          <footer class="project-modal-foot">
            <time :datetime="activeProject.updatedAt">
              更新于 {{ formatProjectDate(activeProject.updatedAt) }}
            </time>

            <div class="project-modal-actions">
              <a
                v-if="activeProject.projectUrl"
                :href="activeProject.projectUrl"
                :class="['project-modal-link', { 'external-link': isExternalLink(activeProject.projectUrl) }]"
                :target="isExternalLink(activeProject.projectUrl) ? '_blank' : undefined"
                :rel="isExternalLink(activeProject.projectUrl) ? 'noopener noreferrer' : undefined"
              >
                项目链接
              </a>
              <a
                v-if="activeProject.githubUrl"
                :href="activeProject.githubUrl"
                :class="['project-modal-link', { 'external-link': isExternalLink(activeProject.githubUrl) }]"
                :target="isExternalLink(activeProject.githubUrl) ? '_blank' : undefined"
                :rel="isExternalLink(activeProject.githubUrl) ? 'noopener noreferrer' : undefined"
              >
                GitHub
              </a>
            </div>
          </footer>
        </article>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
:global(*) {
  box-sizing: border-box;
}

:global(body) {
  margin: 0;
  font-family: "ChillRoundM", "PingFang SC", "Hiragino Sans GB", sans-serif;
  color: #eaf3ff;
  background: var(--theme-bg);
}

.page {
  position: relative;
  min-height: 100vh;
  overflow-x: clip;
  isolation: isolate;
}

.page::before {
  content: "";
  position: fixed;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  background: var(--home-background-image) center top / cover no-repeat;
  opacity: var(--home-background-opacity, 0);
  transition: opacity 0.36s ease;
  will-change: opacity;
}

.hero {
  position: relative;
  min-height: 100svh;
}

.hero-overlay {
  position: absolute;
  inset: 0;
  backdrop-filter: saturate(112%);
}

.hero-card-slot {
  position: absolute;
  left: 0;
  right: 0;
  bottom: clamp(2rem, 5vh, 5rem);
  z-index: 9;
  padding: 0 1rem;
}

.owner-card {
  width: min(92%, 1120px);
  margin: 0 auto;
  display: grid;
  grid-template-columns: 0.95fr 1.15fr;
  gap: 1.5rem;
  padding: 2.5rem;
  border-radius: 1.05rem;
  background: rgba(2, 10, 25, 0.72);
  backdrop-filter: blur(16px) saturate(128%);
  box-shadow: 0 24px 70px rgba(0, 0, 0, 0.42);
  transition: box-shadow 0.25s ease;
  animation: owner-card-rise-in 720ms cubic-bezier(0.2, 0.86, 0.24, 1) both;
  will-change: transform, opacity;
}

.owner-card:hover {
  box-shadow: 0 30px 86px rgba(0, 0, 0, 0.5);
}

@keyframes owner-card-rise-in {
  from {
    opacity: 0;
    transform: translateY(2rem);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.card-left {
  padding: 0.25rem 0.25rem 0.25rem 0.1rem;
}

.owner-avatar {
  width: 8rem;
  height: 8rem;
  border-radius: 999px;
  border: 5px solid rgb(255, 255, 255);
}

.owner-avatar-wrap {
  position: relative;
  display: inline-block;
}

.owner-avatar-bubble {
  position: absolute;
  right: -1.05rem;
  top: 0.85rem;
  min-width: 2rem;
  height: 1.72rem;
  padding: 0 0.58rem;
  border-radius: 0.95rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 1rem;
  background: rgba(32, 142, 255, 0.84);
  box-shadow: 0 8px 18px rgba(0, 0, 0, 0.32);
  backdrop-filter: blur(8px);
}

.owner-avatar-bubble::after {
  content: "";
  position: absolute;
  left: -0.2rem;
  bottom: 0.2rem;
  width: 0.56rem;
  height: 0.56rem;
  border-left: 1px solid rgba(214, 238, 255, 0.42);
  border-bottom: 1px solid rgba(214, 238, 255, 0.42);
  background: rgba(32, 142, 255, 0.84);
  transform: rotate(45deg);
  border-bottom-left-radius: 0.2rem;
}

.owner-name {
  margin: 0.76rem 0 0;
  font-size: 2rem;
  font-weight: 700;
}

.owner-bio {
  margin-top: 0.76rem;
  color: rgba(222, 236, 252, 0.86);
  line-height: 1.9;
  font-size: 0.93rem;
}

.social-row {
  margin-top: 1rem;
  display: flex;
  align-items: center;
  gap: 0.38rem;
  flex-wrap: wrap;
}

.icon-btn {
  position: relative;
  width: 2.24rem;
  height: 2.24rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 0.58rem;
  color: rgba(236, 245, 255, 0.92);
  border: 1px solid rgba(173, 216, 243, 0.12);
  background: linear-gradient(150deg, rgba(255, 255, 255, 0.03), rgba(255, 255, 255, 0.01));
  box-shadow: 0 6px 14px rgba(0, 0, 0, 0.15);
  background-image: none;
  background-size: 0 0;
  transition:
    border-color 0.24s cubic-bezier(0.2, 0.86, 0.24, 1),
    background-color 0.24s cubic-bezier(0.2, 0.86, 0.24, 1),
    box-shadow 0.24s cubic-bezier(0.2, 0.86, 0.24, 1),
    color 0.24s cubic-bezier(0.2, 0.86, 0.24, 1),
    transform 0.24s cubic-bezier(0.2, 0.86, 0.24, 1);
}

.icon-btn::before {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: linear-gradient(
    135deg,
    rgba(140, 221, 255, 0.2) 0%,
    rgba(66, 176, 232, 0.08) 45%,
    rgba(255, 255, 255, 0.03) 100%
  );
  opacity: 0;
  transition: opacity 0.26s cubic-bezier(0.2, 0.86, 0.24, 1);
  pointer-events: none;
}

.icon-btn:hover {
  border-color: rgba(214, 235, 255, 0.45);
  background: rgba(255, 255, 255, 0.09);
  color: rgba(255, 255, 255, 0.98);
  box-shadow: 0 10px 22px rgba(0, 0, 0, 0.26);
  transform: translateY(-1px);
}

.icon-btn:hover::before,
.icon-btn:focus-visible::before {
  opacity: 1;
}

.icon-btn:focus-visible {
  outline: none;
  border-color: rgba(214, 235, 255, 0.5);
}

.icon-mask {
  width: 1.24rem;
  height: 1.24rem;
  display: block;
  background-color: currentColor;
  mask: var(--icon-url) center / contain no-repeat;
  -webkit-mask: var(--icon-url) center / contain no-repeat;
  position: relative;
  z-index: 1;
}

.icon-btn svg {
  width: 1.26rem;
  height: 1.26rem;
  position: relative;
  z-index: 1;
}

.icon-btn circle {
  fill: currentColor;
}

.icon-btn path {
  stroke: currentColor;
  fill: none;
  stroke-width: 1.75;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.icon-tooltip {
  position: absolute;
  left: 50%;
  top: calc(100% + 0.44rem);
  transform: translate(-50%, -4px);
  min-width: 3.6rem;
  padding: 0.36rem 0.62rem;
  border-radius: 0.66rem;
  border: 1px solid rgba(156, 189, 214, 0.2);
  background: rgba(27, 31, 40, 0.96);
  box-shadow: 0 12px 24px rgba(0, 0, 0, 0.34);
  color: rgba(244, 247, 252, 0.95);
  font-size: 0.85rem;
  line-height: 1;
  white-space: nowrap;
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
  transition:
    opacity 0.2s cubic-bezier(0.2, 0.86, 0.24, 1),
    transform 0.2s cubic-bezier(0.2, 0.86, 0.24, 1),
    visibility 0.2s step-end;
  z-index: 16;
}

.icon-tooltip::before {
  content: "";
  position: absolute;
  left: 50%;
  top: -0.28rem;
  width: 0.56rem;
  height: 0.56rem;
  transform: translateX(-50%) rotate(45deg);
  border-left: 1px solid rgba(156, 189, 214, 0.2);
  border-top: 1px solid rgba(156, 189, 214, 0.2);
  background: rgba(27, 31, 40, 0.96);
}

.icon-btn:hover .icon-tooltip,
.icon-btn:focus-visible .icon-tooltip {
  opacity: 1;
  visibility: visible;
  transform: translate(-50%, 0);
}

.card-right {
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.image-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.65rem;
}

.image-name {
  margin: 0;
  font-size: 1.03rem;
  font-weight: 600;
  color: rgba(233, 244, 255, 0.97);
}

.dice-button {
  min-height: 1.96rem;
  padding: 0.25rem 0.65rem 0.25rem 0.5rem;
  border-radius: 999px;
  border: 1px solid rgba(207, 233, 255, 0.24);
  background: rgba(255, 255, 255, 0.06);
  color: rgba(238, 247, 255, 0.9);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.36rem;
  cursor: pointer;
  transition: border-color 0.22s ease, background-color 0.22s ease, transform 0.22s ease;
}

.dice-button:hover {
  border-color: rgba(176, 224, 248, 0.5);
  background: rgba(255, 255, 255, 0.12);
  transform: translateY(-1px);
}

.dice-button svg {
  width: 0.98rem;
  height: 0.98rem;
}

.dice-button span {
  font-size: 0.78rem;
  line-height: 1;
  white-space: nowrap;
}

.dice-button path {
  stroke: currentColor;
  stroke-width: 1.7;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.scene-link {
  margin-top: 0.72rem;
  display: block;
  border-radius: 0.72rem;
  color: inherit;
  text-decoration: none;
  background-image: none;
  background-size: 0 0;
}

.scene-link:visited,
.scene-link:hover,
.scene-link:focus-visible {
  color: inherit;
  text-decoration: none;
  background-image: none;
  background-size: 0 0;
}

.scene-image {
  width: 100%;
  aspect-ratio: 16 / 9;
  object-fit: cover;
  border-radius: 0.72rem;
}

.image-caption {
  margin: 0.58rem 0 0;
  color: rgba(224, 236, 248, 0.84);
  font-size: 0.83rem;
  display: inline-flex;
  align-items: center;
  gap: 0.36rem;
}

.image-caption svg {
  width: 0.96rem;
  height: 0.96rem;
}

.image-caption path {
  stroke: rgba(255, 154, 188, 0.95);
  fill: rgba(255, 131, 173, 0.3);
  stroke-width: 1.4;
}

.content-fade {
  position: relative;
  z-index: 6;
  isolation: isolate;
  --section-width: min(92%, 1560px);
  --fade-lead: clamp(9rem, 20vh, 16rem);
  --blog-shell-top-space: 5.6rem;
  margin-top: 0;
  padding-top: 0;
  min-height: 130vh;
  background: #030714;
}

.content-fade::before {
  content: "";
  position: absolute;
  left: 0;
  right: 0;
  top: 0;
  height: var(--fade-lead);
  transform: translateY(-100%);
  pointer-events: none;
  background: linear-gradient(
    180deg,
    rgba(3, 7, 20, 0) 0%,
    rgba(3, 7, 20, 1) 100%
  );
  z-index: 2;
}

.content-fade::after {
  content: "";
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  top: var(--blog-shell-top-space);
  pointer-events: none;
  background-image: url("/exported_image_sck.svg");
  background-position: center center;
  background-repeat: no-repeat;
  background-size: cover;
  opacity: 0.18;
  z-index: 1;
}

.section-shell {
  position: relative;
  z-index: 3;
  width: var(--section-width);
  margin: 0 auto;
}

.blog-shell {
  padding: var(--blog-shell-top-space) 1.2rem 7rem;
}

.blog-heading {
  display: flex;
  align-items: flex-end;
  gap: 1.35rem;
  margin-bottom: 2.15rem;
}

.blog-title {
  margin: 0;
}

.blog-title span {
  display: inline-block;
  position: relative;
  isolation: isolate;
  padding: 0.12rem 0.48rem 0.22rem;
  border-radius: 0.28rem;
  color: #0f9cb8;
  font-size: clamp(2.2rem, 5.2vw, 4.2rem);
  line-height: 1;
  font-weight: 900;
  letter-spacing: 0.01em;
}

.blog-title span::before {
  content: "";
  position: absolute;
  left: 50%;
  top: 50%;
  width: clamp(4.8rem, 8vw, 7.2rem);
  height: clamp(4.8rem, 8vw, 7.2rem);
  transform: translate(-50%, -50%);
  z-index: -1;
  opacity: 0.34;
  background: url("/images/book-icon.svg") center / contain no-repeat;
}

.blog-subtitle {
  margin: 0 0 0.48rem;
  color: rgba(177, 206, 220, 0.7);
  font-size: clamp(1.02rem, 1.2vw, 1.18rem);
}

.post-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 1.2rem;
}

.post-card {
  position: relative;
  display: block;
  border-radius: 0.95rem;
  overflow: hidden;
  text-decoration: none;
  color: #e9f3ff;
  aspect-ratio: 16 / 9;
  min-height: 12rem;
  background: #0c1320;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.28);
}

.post-card-reveal {
  opacity: 0;
  transform: translateY(1.4rem) scale(0.985);
  filter: saturate(0.9);
}

.post-grid.is-revealed .post-card-reveal {
  animation: post-card-stagger-in 620ms cubic-bezier(0.2, 0.86, 0.24, 1) both;
  animation-delay: calc(var(--card-order, 0) * 120ms);
}

.post-card-more {
  display: grid;
  place-items: center;
  background-image:
    linear-gradient(
      115deg,
      rgba(42, 212, 225, 0) 30%,
      rgba(42, 212, 225, 0.3) 46%,
      rgba(255, 252, 223, 0.34) 54%,
      rgba(42, 212, 225, 0) 72%
    ),
    radial-gradient(circle at 30% 24%, rgba(45, 177, 204, 0.22), transparent 52%),
    linear-gradient(145deg, rgba(9, 18, 34, 0.92), rgba(6, 12, 24, 0.96));
  background-repeat: no-repeat;
  background-size: 220% 100%, 100% 100%, 100% 100%;
  background-position: 140% 0, center, center;
  transition: border-color 0.24s ease, box-shadow 0.24s ease;
}

.more-entry {
  display: inline-flex;
  align-items: center;
  gap: 0.56rem;
  padding: 0.8rem 1rem;
  border-radius: 999px;
  color: rgba(229, 242, 255, 0.96);
  background: rgba(255, 255, 255, 0.03);
  font-size: clamp(1.1rem, 1.45vw, 1.5rem);
  font-weight: 700;
  transition: border-color 0.22s ease, background 0.22s ease, color 0.22s ease;
}

.more-entry svg {
  width: 1.15em;
  height: 1.15em;
}

.more-entry path {
  stroke: currentColor;
  stroke-width: 1.9;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.post-card-more:hover {
  border-color: rgba(168, 220, 246, 0.4);
  box-shadow: 0 16px 48px rgba(10, 25, 43, 0.56);
  animation: more-card-gradient-sweep 0.75s cubic-bezier(0.2, 0.78, 0.28, 1) both;
}

.post-card-more:hover .more-entry {
  border-color: rgba(168, 220, 246, 0.6);
  background: rgba(255, 255, 255, 0.07);
}

@keyframes more-card-gradient-sweep {
  from {
    background-position: 140% 0, center, center;
  }

  to {
    background-position: -50% 0, center, center;
  }
}

@keyframes post-card-stagger-in {
  from {
    opacity: 0;
    transform: translateY(1.4rem) scale(0.985);
    filter: saturate(0.9);
  }

  to {
    opacity: 1;
    transform: translateY(0) scale(1);
    filter: saturate(1);
  }
}

.post-cover {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  transform: scale(1.03);
  transition: transform 0.28s ease;
}

.post-mask {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    180deg,
    rgba(6, 10, 18, 0.06) 0%,
    rgba(6, 10, 18, 0.14) 46%,
    rgba(6, 10, 18, 0.86) 78%,
    rgba(6, 10, 18, 0.94) 100%
  );
}

.post-content {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  padding: 0.92rem 0.95rem 0.98rem;
}

.post-title {
  margin: 0;
  font-size: clamp(1rem, 1.1vw, 1.3rem);
  line-height: 1.3;
  font-weight: 700;
}

.post-summary {
  margin: 0.48rem 0 0;
  color: rgba(220, 233, 244, 0.7);
  font-size: 0.82rem;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
}

.post-card:hover .post-cover {
  transform: scale(1.07);
}

.post-card:hover .post-mask {
  background: linear-gradient(
    180deg,
    rgba(6, 10, 18, 0.1) 0%,
    rgba(6, 10, 18, 0.2) 44%,
    rgba(6, 10, 18, 0.89) 76%,
    rgba(6, 10, 18, 0.96) 100%
  );
}

@media (prefers-reduced-motion: reduce) {
  .post-card-reveal {
    opacity: 1;
    transform: none;
    filter: none;
    animation: none !important;
  }

  .journal-card-reveal {
    opacity: 1;
    transform: none;
    filter: none;
    animation: none !important;
  }

  .photo-card-reveal {
    opacity: 1;
    transform: none;
    animation: none !important;
  }

  .project-card-reveal::before {
    transform: translateX(-102%);
    animation: none !important;
  }
}

.journal-shell {
  padding: 1.8rem 1rem 7.5rem;
}

.journal-heading {
  display: flex;
  align-items: flex-end;
  gap: 1.35rem;
  margin-bottom: 1.9rem;
}

.journal-title {
  margin: 0;
}

.journal-title span {
  display: inline-block;
  position: relative;
  isolation: isolate;
  padding: 0.1rem 0.35rem 0.2rem;
  color: #0f9cb8;
  font-size: clamp(2.2rem, 5vw, 4rem);
  line-height: 1;
  font-weight: 900;
  letter-spacing: 0.01em;
}

.journal-title span::before {
  content: "";
  position: absolute;
  left: 50%;
  top: 50%;
  width: clamp(4.7rem, 7.6vw, 7rem);
  height: clamp(4.7rem, 7.6vw, 7rem);
  transform: translate(-50%, -50%);
  z-index: -1;
  opacity: 0.35;
  background: url("/images/note-icon.svg") center / contain no-repeat;
}

.journal-subtitle {
  margin: 0 0 0.48rem;
  color: rgba(177, 206, 220, 0.7);
  font-size: clamp(1.02rem, 1.2vw, 1.18rem);
}

.journal-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1.35rem;
}

.journal-card {
  display: grid;
  grid-template-columns: 9.1rem 1fr;
  gap: 1rem;
  padding: 1.7rem 1.55rem;
  border-radius: 0.85rem;
  text-decoration: none;
  color: inherit;
  background: rgba(27, 28, 33, 0.9);
  border: 1px solid rgba(118, 170, 194, 0.1);
}

.journal-card-reveal {
  opacity: 0;
  transform: translateY(0.9rem);
  filter: brightness(0.6);
}

.journal-grid.is-revealed .journal-card-reveal {
  animation: journal-card-flicker-in var(--journal-flicker-ms, 680ms) cubic-bezier(0.2, 0.86, 0.24, 1) both;
  animation-delay: 0ms;
}

@keyframes journal-card-flicker-in {
  0% {
    opacity: 0;
    transform: translateY(0.9rem);
    filter: brightness(0.45);
  }

  16% {
    opacity: 0.95;
    filter: brightness(1.26);
  }

  30% {
    opacity: 0.2;
    filter: brightness(0.62);
  }

  46% {
    opacity: 0.9;
    filter: brightness(1.18);
  }

  62% {
    opacity: 0.38;
    filter: brightness(0.82);
  }

  76% {
    opacity: 1;
    filter: brightness(1.05);
  }

  100% {
    opacity: 1;
    transform: translateY(0);
    filter: brightness(1);
  }
}

.journal-date {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: flex-start;
  color: #0f9cb8;
}

.journal-year {
  position: relative;
  z-index: 1;
  font-size: 2rem;
  line-height: 1;
  opacity: 0.86;
}

.journal-day {
  position: relative;
  z-index: 1;
  margin-top: 0.9rem;
  font-size: 3.2rem;
  line-height: 0.9;
  font-weight: 500;
}

.journal-weather-bg {
  position: absolute;
  left: -0.08rem;
  bottom: -0.66rem;
  z-index: 0;
  width: 4.7rem;
  height: 4.7rem;
  pointer-events: none;
  opacity: 0.22;
  background: linear-gradient(145deg, rgba(73, 183, 210, 0.85), rgba(22, 129, 173, 0.75));
  filter: drop-shadow(0 0 12px rgba(14, 164, 197, 0.2));
  mask-position: center;
  mask-size: contain;
  mask-repeat: no-repeat;
  -webkit-mask-position: center;
  -webkit-mask-size: contain;
  -webkit-mask-repeat: no-repeat;
}

.journal-weather-bg[data-weather="sun"] {
  mask-image: url("/images/weather/sun.svg");
  -webkit-mask-image: url("/images/weather/sun.svg");
}

.journal-weather-bg[data-weather="rain"] {
  mask-image: url("/images/weather/rain.svg");
  -webkit-mask-image: url("/images/weather/rain.svg");
}

.journal-weather-bg[data-weather="wind"] {
  mask-image: url("/images/weather/wind.svg");
  -webkit-mask-image: url("/images/weather/wind.svg");
}

.journal-weather-bg[data-weather="snow"] {
  mask-image: url("/images/weather/snow.svg");
  -webkit-mask-image: url("/images/weather/snow.svg");
}

.journal-weather-bg[data-weather="cloud"] {
  mask-image: url("/images/weather/cloud.svg");
  -webkit-mask-image: url("/images/weather/cloud.svg");
}

.journal-card-title {
  margin: 0;
  display: inline;
  font-size: clamp(1.55rem, 1.9vw, 2.08rem);
  line-height: 1.3;
  color: rgba(235, 245, 255, 0.96);
  box-decoration-break: clone;
  -webkit-box-decoration-break: clone;
  background-image: linear-gradient(
    100deg,
    rgba(255, 246, 148, 0.72) 0%,
    rgba(255, 240, 126, 0.54) 100%
  );
  background-repeat: no-repeat;
  background-position: 100% 88%;
  background-size: 0% 0.58em;
  transition: background-size 0.34s cubic-bezier(0.22, 0.9, 0.24, 1), color 0.22s ease;
}

.journal-card:hover .journal-card-title {
  color: rgba(252, 254, 238, 0.98);
  background-size: 100% 0.58em;
}

.journal-card-summary {
  margin: 0.9rem 0 0;
  color: rgba(196, 210, 225, 0.62);
  font-size: 0.95rem;
  line-height: 1.8;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 4;
  overflow: hidden;
}

.photo-shell {
  padding: 0.4rem 1rem 7.5rem;
}

.photo-heading {
  display: flex;
  align-items: flex-end;
  gap: 1.35rem;
  margin-bottom: 1.9rem;
}

.photo-title {
  margin: 0;
}

.photo-title span {
  display: inline-block;
  position: relative;
  isolation: isolate;
  padding: 0.1rem 0.35rem 0.2rem;
  color: #0f9cb8;
  font-size: clamp(2.2rem, 5vw, 4rem);
  line-height: 1;
  font-weight: 900;
  letter-spacing: 0.01em;
}

.photo-title span::before {
  content: "";
  position: absolute;
  left: 50%;
  top: 50%;
  width: clamp(4.7rem, 7.6vw, 7rem);
  height: clamp(4.7rem, 7.6vw, 7rem);
  transform: translate(-50%, -50%);
  z-index: -1;
  opacity: 0.34;
  background: url("/images/camera-icon.svg") center / contain no-repeat;
}

.photo-subtitle {
  margin: 0 0 0.48rem;
  color: rgba(177, 206, 220, 0.7);
  font-size: clamp(1.02rem, 1.2vw, 1.18rem);
}

.photo-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 1.35rem;
}

.photo-card {
  position: relative;
  display: block;
  text-decoration: none;
  color: inherit;
  border-radius: 0.86rem;
  transform: translateY(0) scale(1);
  transform-origin: center center;
  transition: transform 0.25s ease;
  background-image: none;
  background-size: 0 0;
}

.photo-card-reveal {
  opacity: 0;
  transform: translateX(2.6rem) translateY(0) scale(1);
}

.photo-grid.is-revealed .photo-card-reveal {
  animation: photo-card-slide-in 640ms cubic-bezier(0.16, 0.86, 0.22, 1) both;
  animation-delay: 0ms;
}

.photo-card:hover {
  transform: translateY(-0.18rem) scale(1.02);
  background-image: none;
  background-size: 0 0;
}

@keyframes photo-card-slide-in {
  from {
    opacity: 0;
    transform: translateX(2.6rem) translateY(0) scale(1);
  }

  to {
    opacity: 1;
    transform: translateX(0) translateY(0) scale(1);
  }
}

.photo-media {
  position: relative;
  aspect-ratio: 4 / 3;
  border-radius: 0.8rem;
  overflow: clip;
}

.photo-border-trace {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 3;
}

.photo-border-trace svg {
  width: 100%;
  height: 100%;
  display: block;
  overflow: visible;
}

.trace-path {
  fill: none;
  stroke: rgba(186, 233, 248, 0.92);
  stroke-width: 1.8;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-dasharray: 100;
  stroke-dashoffset: 100;
  opacity: 0;
  filter: drop-shadow(0 0 10px rgba(124, 203, 231, 0.36));
  transition:
    stroke-dashoffset 0.3s cubic-bezier(0.23, 0.84, 0.25, 1),
    opacity 0.26s cubic-bezier(0.2, 0.86, 0.24, 1);
}

.photo-card:hover .trace-path {
  opacity: 1;
  stroke-dashoffset: 0;
}

.photo-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  border-radius: 0.8rem;
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.25);
}

.photo-name {
  margin: 1rem 0 0;
  font-size: clamp(1.15rem, 1.4vw, 1.95rem);
  line-height: 1.25;
  color: rgba(237, 245, 255, 0.96);
}

.photo-date {
  margin: 0.6rem 0 0;
  font-size: 0.96rem;
  color: rgba(172, 194, 209, 0.72);
}

.project-shell {
  padding: 0.2rem 1rem 4.2rem;
}

.project-heading {
  display: flex;
  align-items: flex-end;
  gap: 1.35rem;
  margin-bottom: 1.45rem;
}

.project-title {
  margin: 0;
}

.project-title span {
  display: inline-block;
  position: relative;
  isolation: isolate;
  padding: 0.14rem 0.32rem 0.2rem;
  color: #0f9cb8;
  font-size: clamp(2.1rem, 4.8vw, 3.7rem);
  line-height: 1;
  font-weight: 900;
  letter-spacing: 0.01em;
}

.project-title span::before {
  content: "";
  position: absolute;
  left: 50%;
  top: 50%;
  width: clamp(4.2rem, 6.8vw, 6.3rem);
  height: clamp(4.2rem, 6.8vw, 6.3rem);
  transform: translate(-50%, -50%);
  z-index: -1;
  border-radius: 0.9rem;
  opacity: 0.28;
  background: linear-gradient(135deg, rgba(42, 212, 225, 0.55), rgba(12, 143, 178, 0.45));
}

.project-subtitle {
  margin: 0 0 0.46rem;
  color: rgba(177, 206, 220, 0.7);
  font-size: clamp(1rem, 1.18vw, 1.14rem);
}

.project-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.95rem;
}

.project-card {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.72rem;
  min-height: 7.2rem;
  padding: 0.82rem 0.95rem;
  border-radius: 0.46rem;
  overflow: hidden;
  border: 1px solid #30363d;
  color: inherit;
  background: #0d1117;
  text-align: left;
  cursor: pointer;
  font-family: inherit;
  transition: border-color 0.2s ease, background-color 0.2s ease;
}

.project-card:hover {
  border-color: #58a6ff;
  background: #111722;
}

.project-card > * {
  position: relative;
  z-index: 3;
}

.project-card-reveal::before {
  content: "";
  position: absolute;
  inset: 0;
  z-index: 2;
  pointer-events: none;
  background: rgba(7, 35, 60, 0.92);
  transform: translateX(0);
}

.project-grid.is-revealed .project-card-reveal::before {
  animation: project-mask-slide-out 760ms cubic-bezier(0.18, 0.84, 0.24, 1) both;
  animation-delay: var(--project-mask-delay, 0ms);
}

@keyframes project-mask-slide-out {
  from {
    transform: translateX(0);
  }

  to {
    transform: translateX(-102%);
  }
}

.project-card-head {
  width: 100%;
  min-width: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.62rem;
}

.project-card-title {
  margin: 0;
  min-width: 0;
  color: #58a6ff;
  font-size: 1rem;
  line-height: 1.3;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.project-visibility {
  flex-shrink: 0;
  border: 1px solid #30363d;
  border-radius: 999px;
  padding: 0.03rem 0.52rem;
  color: #8b949e;
  font-size: 0.72rem;
  line-height: 1.5;
  font-weight: 600;
}

.project-card-summary {
  margin: 0;
  color: #8b949e;
  font-size: 0.84rem;
  line-height: 1.45;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
}

.project-card-meta {
  margin-top: auto;
  width: 100%;
}

.project-language-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.42rem 0.82rem;
}

.project-language-item {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  color: #8b949e;
  font-size: 0.77rem;
  line-height: 1.2;
}

.project-language-item::before {
  content: "";
  width: 0.52rem;
  height: 0.52rem;
  border-radius: 50%;
  background: var(--project-language-color, #8b949e);
}

.project-modal-fade-enter-active,
.project-modal-fade-leave-active {
  transition: opacity 0.24s ease;
}

.project-modal-fade-enter-from,
.project-modal-fade-leave-to {
  opacity: 0;
}

.project-modal-mask {
  position: fixed;
  inset: 0;
  z-index: 95;
  display: grid;
  place-items: center;
  padding: 1rem;
  background: rgba(2, 10, 21, 0.66);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
}

.project-modal {
  position: relative;
  width: min(96vw, 40rem);
  border-radius: 1rem;
  border: 1px solid rgba(145, 198, 228, 0.24);
  background: rgba(10, 20, 34, 0.94);
  box-shadow: 0 20px 48px rgba(0, 0, 0, 0.46);
  padding: 1.15rem 1.2rem;
}

.project-modal-close {
  position: absolute;
  right: 0.68rem;
  top: 0.68rem;
  width: 2rem;
  height: 2rem;
  border-radius: 999px;
  border: 1px solid rgba(151, 204, 231, 0.28);
  background: rgba(255, 255, 255, 0.04);
  color: rgba(236, 246, 255, 0.9);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.project-modal-close svg {
  width: 1rem;
  height: 1rem;
}

.project-modal-close path {
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
}

.project-modal-head {
  display: grid;
  grid-template-columns: 3.8rem 1fr;
  gap: 0.82rem;
  align-items: center;
}

.project-modal-icon {
  width: 3.6rem;
  height: 3.6rem;
  border-radius: 0.7rem;
  object-fit: cover;
  background: rgba(255, 255, 255, 0.08);
}

.project-modal-head-meta h3 {
  margin: 0;
  font-size: 1.28rem;
  line-height: 1.2;
  color: rgba(238, 247, 255, 0.96);
}

.project-modal-head-meta p {
  margin: 0.32rem 0 0;
  font-size: 0.86rem;
  color: rgba(180, 203, 220, 0.78);
}

.project-modal-summary {
  margin: 0.95rem 0 0;
  font-size: 0.95rem;
  line-height: 1.72;
  color: rgba(210, 226, 239, 0.9);
}

.project-modal-content {
  margin: 0.7rem 0 0;
  font-size: 0.9rem;
  line-height: 1.78;
  color: rgba(185, 207, 224, 0.78);
  white-space: pre-wrap;
}

.project-modal-tags {
  margin-top: 0.86rem;
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
}

.project-modal-tags span {
  border-radius: 999px;
  border: 1px solid rgba(114, 176, 214, 0.28);
  padding: 0.16rem 0.5rem;
  font-size: 0.8rem;
  color: rgba(210, 231, 248, 0.86);
  background: rgba(18, 33, 51, 0.72);
}

.project-modal-foot {
  margin-top: 0.92rem;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.68rem;
}

.project-modal-foot time {
  color: rgba(170, 197, 216, 0.72);
  font-size: 0.82rem;
}

.project-modal-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.52rem;
}

.project-modal-link {
  border-radius: 999px;
  border: 1px solid rgba(133, 191, 224, 0.32);
  padding: 0.26rem 0.66rem;
  color: rgba(226, 242, 255, 0.96);
  background: rgba(24, 45, 67, 0.82);
  font-size: 0.82rem;
}

@media (max-width: 980px) {
  .owner-card {
    grid-template-columns: 1fr;
    gap: 1.1rem;
  }

  .hero-card-slot {
    bottom: 2.4vh;
  }

  .post-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .journal-grid {
    grid-template-columns: 1fr;
  }

  .photo-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .project-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 760px) {
  .hero {
    min-height: auto;
    padding-top: 30rem;
    padding-bottom: 1.25rem;
  }

  .hero-card-slot {
    position: relative;
    bottom: auto;
    margin-top: 1.1rem;
    padding: 0 0.75rem;
  }

  .owner-card {
    width: min(96%, 1120px);
    padding: 1.12rem;
  }

  .owner-name {
    font-size: 1.65rem;
  }

  .content-fade {
    --blog-shell-top-space: 4.2rem;
  }

  .blog-shell {
    padding: var(--blog-shell-top-space) 0.65rem 5rem;
  }

  .blog-heading {
    align-items: flex-start;
    flex-direction: column;
    gap: 0.5rem;
    margin-bottom: 1.5rem;
  }

  .post-grid {
    grid-template-columns: 1fr;
    gap: 1.05rem;
  }

  .post-card {
    aspect-ratio: 16 / 9;
    min-height: 10.5rem;
  }

  .post-content {
    padding: 0.95rem 0.95rem 1rem;
  }

  .journal-shell {
    padding: 1.4rem 0.55rem 4.8rem;
  }

  .journal-heading {
    align-items: flex-start;
    flex-direction: column;
    gap: 0.45rem;
    margin-bottom: 1.2rem;
  }

  .journal-card {
    grid-template-columns: 1fr;
    gap: 0.75rem;
    padding: 1.1rem;
  }

  .journal-year {
    font-size: 1.45rem;
  }

  .journal-day {
    margin-top: 0.5rem;
    font-size: 2.2rem;
  }

  .journal-card-title {
    font-size: 1.25rem;
  }

  .journal-card-summary {
    font-size: 0.9rem;
    line-height: 1.65;
    -webkit-line-clamp: 3;
  }

  .photo-shell {
    padding: 0.2rem 0.55rem 4.8rem;
  }

  .photo-heading {
    align-items: flex-start;
    flex-direction: column;
    gap: 0.45rem;
    margin-bottom: 1.2rem;
  }

  .photo-grid {
    grid-template-columns: 1fr;
    gap: 1rem;
  }

  .photo-name {
    margin-top: 0.75rem;
    font-size: 1.55rem;
  }

  .project-shell {
    padding: 0.1rem 0.55rem 3.2rem;
  }

  .project-heading {
    align-items: flex-start;
    flex-direction: column;
    gap: 0.42rem;
    margin-bottom: 1rem;
  }

  .project-card {
    min-height: 6.8rem;
    gap: 0.65rem;
    padding: 0.76rem 0.82rem;
  }

  .project-card-title {
    font-size: 0.95rem;
  }

  .project-card-summary {
    font-size: 0.8rem;
  }

  .project-language-item {
    font-size: 0.72rem;
  }

  .project-language-item::before {
    width: 0.46rem;
    height: 0.46rem;
  }

  .project-modal {
    width: min(96vw, 34rem);
    padding: 0.95rem;
  }

  .project-modal-head {
    grid-template-columns: 3.2rem 1fr;
  }

  .project-modal-icon {
    width: 3rem;
    height: 3rem;
  }

  .content-fade {
    min-height: 96vh;
  }
}
</style>
