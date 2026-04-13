<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import "maplibre-gl/dist/maplibre-gl.css";

const { settings } = useSiteSettings();
const requestUrl = useRequestURL();

const siteBaseUrl = computed(() => {
  const configured = String(settings.value.siteUrl || "").trim();
  if (configured) return configured.replace(/\/+$/, "");
  return `${requestUrl.protocol}//${requestUrl.host}`;
});

const canonicalUrl = computed(() => `${siteBaseUrl.value}/about`);
const seoDescription = computed(() => settings.value.userDesc || settings.value.siteDesc);
const ogImage = computed(() => {
  const input = String(settings.value.userHeadpic || "/images/head.jpg").trim();
  if (!input) return "";
  if (/^https?:\/\//i.test(input)) return input;
  return `${siteBaseUrl.value}${input.startsWith("/") ? input : `/${input}`}`;
});
const aboutSchema = computed(() => ({
  "@context": "https://schema.org",
  "@type": "AboutPage",
  name: `关于本站 - ${settings.value.siteTitle}`,
  description: seoDescription.value,
  url: canonicalUrl.value,
}));

useHead(() => ({
  title: `关于本站 - ${settings.value.siteTitle}`,
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
      content: `关于本站 - ${settings.value.siteTitle}`,
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
      key: "about-schema",
      children: JSON.stringify(aboutSchema.value),
    },
  ],
}));

const mapCard = ref<HTMLElement | null>(null);
const mapContainer = ref<HTMLElement | null>(null);
const isMapLoaded = ref(false);
const mapLoadError = ref("");

let map: import("maplibre-gl").Map | null = null;
let maplibreglModule: typeof import("maplibre-gl") | null = null;
let mapMarkers: import("maplibre-gl").Marker[] = [];

type SkillCardItem = {
  id: string;
  label: string;
  icon: string;
  bg: string;
};

type WifeCard = {
  id: string;
  cnName: string;
  otherName: string;
  image: string;
};

type EducationCard = {
  text: string;
  university: string;
  start: string;
  end: string;
};

type VisitorDataCard = {
  title: string;
  tips: string;
};

type LifeTargetCard = {
  text: string;
  finish: string[];
  notYet: string[];
};

const DEFAULT_SKILL_LANGUAGES = [
  "python",
  "vue",
  "nuxt",
  "docker",
  "ubuntu",
  "linux mint",
  "mysql",
  "redis",
];

const SKILL_META: Record<string, { icon: string; bg: string }> = {
  python: { icon: "python-svgrepo-com", bg: "linear-gradient(140deg, #3b77be 0%, #ffd43b 100%)" },
  vue: { icon: "vue-svgrepo-com", bg: "linear-gradient(140deg, #42b883 0%, #2c3e50 100%)" },
  nuxt: { icon: "nuxt-svgrepo-com", bg: "linear-gradient(140deg, #00dc82 0%, #1b6f4e 100%)" },
  docker: { icon: "docker-svgrepo-com", bg: "linear-gradient(140deg, #2496ed 0%, #0a4d8c 100%)" },
  ubuntu: { icon: "lin-ubuntu-svgrepo-com", bg: "linear-gradient(140deg, #e95420 0%, #7f1d0b 100%)" },
  "linux mint": { icon: "linux-mint-svgrepo-com", bg: "linear-gradient(140deg, #86be43 0%, #2f5e2e 100%)" },
  mysql: { icon: "mysql-svgrepo-com", bg: "linear-gradient(140deg, #4479a1 0%, #1f3952 100%)" },
  redis: { icon: "redis-svgrepo-com", bg: "linear-gradient(140deg, #dc382d 0%, #7d1e17 100%)" },
};

const SKILL_ALIAS: Record<string, string> = {
  linuxmint: "linux mint",
  "linux-mint": "linux mint",
};

const DEFAULT_WIFE: WifeCard = {
  id: "wife-default",
  cnName: "暂无",
  otherName: "None",
  image: "/images/loading.gif",
};

const DEFAULT_EDUCATION: EducationCard = {
  text: "好好学习，天天向上",
  university: "未知学校",
  start: "开始",
  end: "结束",
};

const DEFAULT_VISITOR_DATA: VisitorDataCard = {
  title: "访问数据",
  tips: "本站自主统计",
};

const DEFAULT_HOBBIES = ["jk", "computer", "hardware", "linux"];

const DEFAULT_LIFE_TARGET: LifeTargetCard = {
  text: "人生目标",
  finish: ["建造属于自己的HomeLab"],
  notYet: ["拥有一辆自己的汽车", "有一份稳定的工作"],
};

function splitEducationTimeRange(value: string) {
  const normalized = value
    .replace(/[~～—–]/g, "-")
    .replace(/\s*至\s*/g, "-")
    .replace(/\s*\/\s*/g, "-")
    .trim();

  if (!normalized) {
    return { start: DEFAULT_EDUCATION.start, end: DEFAULT_EDUCATION.end };
  }

  const parts = normalized
    .split("-")
    .map((item) => item.trim())
    .filter((item) => Boolean(item));

  if (parts.length >= 2) {
    return { start: parts[0], end: parts[1] };
  }

  if (parts.length === 1) {
    return { start: parts[0], end: "至今" };
  }

  return { start: DEFAULT_EDUCATION.start, end: DEFAULT_EDUCATION.end };
}

const footprintPoints = computed(() => settings.value.themeAboutMapPoints);
const mapStatusText = computed(() => {
  if (mapLoadError.value) return mapLoadError.value;
  return isMapLoaded.value ? "鼠标移入卡片后可拖拽地图和滚轮缩放" : "地图加载中...";
});
const aboutWelcome = computed(() => {
  const aboutPages = settings.value.themeAboutPages;
  const aboutRecord =
    aboutPages && typeof aboutPages === "object" && !Array.isArray(aboutPages)
      ? (aboutPages as Record<string, unknown>)
      : {};
  const welcomeRaw = aboutRecord.welcome;
  const welcomeRecord =
    welcomeRaw && typeof welcomeRaw === "object" && !Array.isArray(welcomeRaw)
      ? (welcomeRaw as Record<string, unknown>)
      : {};

  const text =
    typeof welcomeRecord.text === "string" && welcomeRecord.text.trim()
      ? welcomeRecord.text.trim()
      : "你好！我是";
  const name =
    typeof welcomeRecord.name === "string" && welcomeRecord.name.trim()
      ? welcomeRecord.name.trim()
      : settings.value.userName;
  const desc =
    typeof welcomeRecord.desc === "string" && welcomeRecord.desc.trim()
      ? welcomeRecord.desc.trim()
      : settings.value.userDesc;

  return { text, name, desc };
});
const aboutSlogan = computed(() => {
  const aboutPages = settings.value.themeAboutPages;
  const aboutRecord =
    aboutPages && typeof aboutPages === "object" && !Array.isArray(aboutPages)
      ? (aboutPages as Record<string, unknown>)
      : {};
  const sloganRaw = aboutRecord.slogan;
  const sloganRecord =
    sloganRaw && typeof sloganRaw === "object" && !Array.isArray(sloganRaw)
      ? (sloganRaw as Record<string, unknown>)
      : {};

  const text =
    typeof sloganRecord.text === "string" && sloganRecord.text.trim()
      ? sloganRecord.text.trim()
      : "希望";
  const main =
    typeof sloganRecord.main === "string" && sloganRecord.main.trim()
      ? sloganRecord.main.trim()
      : "我的人生可以早点";
  const moreRaw = sloganRecord.more;
  const more = Array.isArray(moreRaw)
    ? moreRaw
        .map((item) => (typeof item === "string" ? item.trim() : ""))
        .filter((item) => Boolean(item))
    : [];

  return { text, main, more };
});
const aboutSkills = computed(() => {
  const aboutPages = settings.value.themeAboutPages;
  const aboutRecord =
    aboutPages && typeof aboutPages === "object" && !Array.isArray(aboutPages)
      ? (aboutPages as Record<string, unknown>)
      : {};
  const skillsRaw = aboutRecord.skills;
  const skillsRecord =
    skillsRaw && typeof skillsRaw === "object" && !Array.isArray(skillsRaw)
      ? (skillsRaw as Record<string, unknown>)
      : {};

  const title =
    typeof skillsRecord.title === "string" && skillsRecord.title.trim()
      ? skillsRecord.title.trim()
      : "创造,源于热爱";

  const rawLanguages = Array.isArray(skillsRecord.programlanguage)
    ? skillsRecord.programlanguage
        .map((item) => (typeof item === "string" ? item.trim() : ""))
        .filter((item) => Boolean(item))
    : [];
  const programlanguage = rawLanguages.length ? rawLanguages : DEFAULT_SKILL_LANGUAGES;

  const items = programlanguage.map((label, index) => {
    const key = normalizeSkillKey(label);
    const canonicalKey = SKILL_ALIAS[key] || key;
    const meta = SKILL_META[canonicalKey];

    return {
      id: `${canonicalKey}-${index}`,
      label,
      icon: `/images/skills/${meta?.icon || "code-svgrepo-com"}.svg`,
      bg: meta?.bg || "linear-gradient(140deg, #4b5f7f 0%, #1f2635 100%)",
    } satisfies SkillCardItem;
  });

  return { title, items };
});
const aboutEducation = computed(() => {
  const aboutPages = settings.value.themeAboutPages;
  const aboutRecord =
    aboutPages && typeof aboutPages === "object" && !Array.isArray(aboutPages)
      ? (aboutPages as Record<string, unknown>)
      : {};
  const educationRaw = aboutRecord.education;
  const educationRecord =
    educationRaw && typeof educationRaw === "object" && !Array.isArray(educationRaw)
      ? (educationRaw as Record<string, unknown>)
      : {};

  const text =
    typeof educationRecord.text === "string" && educationRecord.text.trim()
      ? educationRecord.text.trim()
      : DEFAULT_EDUCATION.text;
  const university =
    typeof educationRecord.university === "string" && educationRecord.university.trim()
      ? educationRecord.university.trim()
      : DEFAULT_EDUCATION.university;
  const timeRaw =
    typeof educationRecord.time === "string" && educationRecord.time.trim()
      ? educationRecord.time.trim()
      : `${DEFAULT_EDUCATION.start}/${DEFAULT_EDUCATION.end}`;
  const { start, end } = splitEducationTimeRange(timeRaw);

  return { text, university, start, end } satisfies EducationCard;
});
const aboutVisitorData = computed(() => {
  const aboutPages = settings.value.themeAboutPages;
  const aboutRecord =
    aboutPages && typeof aboutPages === "object" && !Array.isArray(aboutPages)
      ? (aboutPages as Record<string, unknown>)
      : {};
  const visitorRaw = aboutRecord.visitor_data;
  const visitorRecord =
    visitorRaw && typeof visitorRaw === "object" && !Array.isArray(visitorRaw)
      ? (visitorRaw as Record<string, unknown>)
      : {};

  const title =
    typeof visitorRecord.title === "string" && visitorRecord.title.trim()
      ? visitorRecord.title.trim()
      : DEFAULT_VISITOR_DATA.title;
  const tips =
    typeof visitorRecord.tips === "string" && visitorRecord.tips.trim()
      ? visitorRecord.tips.trim()
      : DEFAULT_VISITOR_DATA.tips;

  return { title, tips } satisfies VisitorDataCard;
});
const aboutHobbies = computed(() => {
  const aboutPages = settings.value.themeAboutPages;
  const aboutRecord =
    aboutPages && typeof aboutPages === "object" && !Array.isArray(aboutPages)
      ? (aboutPages as Record<string, unknown>)
      : {};

  const hobbyRaw = aboutRecord.hobby;
  const parsed = Array.isArray(hobbyRaw)
    ? hobbyRaw
        .map((item) => (typeof item === "string" ? item.trim() : ""))
        .filter((item) => Boolean(item))
    : [];

  if (parsed.length) return parsed;
  return DEFAULT_HOBBIES;
});
const aboutLifeTarget = computed(() => {
  const aboutPages = settings.value.themeAboutPages;
  const aboutRecord =
    aboutPages && typeof aboutPages === "object" && !Array.isArray(aboutPages)
      ? (aboutPages as Record<string, unknown>)
      : {};
  const lifeTargetRaw = aboutRecord.life_target;
  const lifeTargetRecord =
    lifeTargetRaw && typeof lifeTargetRaw === "object" && !Array.isArray(lifeTargetRaw)
      ? (lifeTargetRaw as Record<string, unknown>)
      : {};
  const targetRaw = lifeTargetRecord.target;
  const targetRecord =
    targetRaw && typeof targetRaw === "object" && !Array.isArray(targetRaw)
      ? (targetRaw as Record<string, unknown>)
      : {};

  const text =
    typeof lifeTargetRecord.text === "string" && lifeTargetRecord.text.trim()
      ? lifeTargetRecord.text.trim()
      : DEFAULT_LIFE_TARGET.text;
  const finish = Array.isArray(targetRecord.finish)
    ? targetRecord.finish
        .map((item) => (typeof item === "string" ? item.trim() : ""))
        .filter((item) => Boolean(item))
    : [];
  const notYet = Array.isArray(targetRecord.not_yet)
    ? targetRecord.not_yet
        .map((item) => (typeof item === "string" ? item.trim() : ""))
        .filter((item) => Boolean(item))
    : [];

  return {
    text,
    finish: finish.length ? finish : DEFAULT_LIFE_TARGET.finish,
    notYet: notYet.length ? notYet : DEFAULT_LIFE_TARGET.notYet,
  } satisfies LifeTargetCard;
});
const wifeCards = computed(() => {
  const source = settings.value.themeWifes.length ? settings.value.themeWifes : [DEFAULT_WIFE];

  return source.map((item, index) => ({
    id: `wife-card-${index + 1}`,
    cnName: item?.cnName || DEFAULT_WIFE.cnName,
    otherName: item?.otherName || DEFAULT_WIFE.otherName,
    image: item?.image || DEFAULT_WIFE.image,
  }));
});
const wifeRows = computed(() => {
  const rows: WifeCard[][] = [];
  for (let index = 0; index < wifeCards.value.length; index += 4) {
    rows.push(wifeCards.value.slice(index, index + 4));
  }
  return rows;
});
const activeWifeCard = ref<WifeCard | null>(null);
const sloganWords = computed(() => aboutSlogan.value.more);
const sloganWordDisplay = ref(sloganWords.value[0] || "");
const skillBlinkStates = ref<Record<string, boolean>>({});
const isClientMounted = ref(false);

let sloganCurrentIndex = 0;
let sloganHoldTimer: ReturnType<typeof setTimeout> | null = null;
let sloganScrambleTimer: ReturnType<typeof setInterval> | null = null;
let skillsHoldTimer: ReturnType<typeof setTimeout> | null = null;
let skillsCycleTimer: ReturnType<typeof setTimeout> | null = null;
let skillsFlashTimers: ReturnType<typeof setTimeout>[] = [];

const RANDOM_CHARS = "星河风云山海晨暮春秋花叶雪月光明安静温柔清雅澈灵逸曦朗心梦知远思念归";

function randomHanChar() {
  const index = Math.floor(Math.random() * RANDOM_CHARS.length);
  return RANDOM_CHARS[index] || "字";
}

function normalizeSkillKey(value: string) {
  return value.trim().toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ");
}

function clearSloganTimers() {
  if (sloganHoldTimer) {
    clearTimeout(sloganHoldTimer);
    sloganHoldTimer = null;
  }
  if (sloganScrambleTimer) {
    clearInterval(sloganScrambleTimer);
    sloganScrambleTimer = null;
  }
}

function scrambleToWord(target: string, onDone: () => void) {
  if (!target) {
    sloganWordDisplay.value = "";
    onDone();
    return;
  }

  const totalSteps = 8;
  let step = 0;

  clearSloganTimers();
  sloganScrambleTimer = setInterval(() => {
    step += 1;
    const revealCount = Math.floor((step / totalSteps) * target.length);
    sloganWordDisplay.value = target
      .split("")
      .map((char, index) => (index < revealCount ? char : randomHanChar()))
      .join("");

    if (step >= totalSteps) {
      if (sloganScrambleTimer) {
        clearInterval(sloganScrambleTimer);
        sloganScrambleTimer = null;
      }
      sloganWordDisplay.value = target;
      onDone();
    }
  }, 45);
}

function scheduleNextSloganWord() {
  const words = sloganWords.value;
  if (!words.length || words.length === 1 || import.meta.server) return;

  sloganHoldTimer = setTimeout(() => {
    const nextIndex = (sloganCurrentIndex + 1) % words.length;
    scrambleToWord(words[nextIndex], () => {
      sloganCurrentIndex = nextIndex;
      scheduleNextSloganWord();
    });
  }, 1000);
}

function startSloganLoop() {
  if (import.meta.server) return;
  clearSloganTimers();

  const words = sloganWords.value;
  if (!words.length) {
    sloganWordDisplay.value = "";
    return;
  }

  sloganCurrentIndex = 0;
  sloganWordDisplay.value = words[0];

  if (words.length > 1) {
    scheduleNextSloganWord();
  }
}

function clearSkillsTimers() {
  if (skillsHoldTimer) {
    clearTimeout(skillsHoldTimer);
    skillsHoldTimer = null;
  }
  if (skillsCycleTimer) {
    clearTimeout(skillsCycleTimer);
    skillsCycleTimer = null;
  }
  skillsFlashTimers.forEach((timer) => clearTimeout(timer));
  skillsFlashTimers = [];
}

function runSkillsBlinkCycle() {
  if (import.meta.server) return;
  const items = aboutSkills.value.items;
  if (!items.length) return;

  skillsHoldTimer = setTimeout(() => {
    items.forEach((item) => {
      const startDelay = Math.floor(Math.random() * 900);
      const startTimer = setTimeout(() => {
        skillBlinkStates.value[item.id] = true;
        const endTimer = setTimeout(() => {
          skillBlinkStates.value[item.id] = false;
        }, 320 + Math.floor(Math.random() * 220));
        skillsFlashTimers.push(endTimer);
      }, startDelay);
      skillsFlashTimers.push(startTimer);
    });

    skillsCycleTimer = setTimeout(() => {
      runSkillsBlinkCycle();
    }, 1300);
  }, 2000);
}

function startSkillsBlinkLoop() {
  if (import.meta.server) return;
  clearSkillsTimers();

  const items = aboutSkills.value.items;
  skillBlinkStates.value = Object.fromEntries(items.map((item) => [item.id, false]));

  if (!items.length) return;
  runSkillsBlinkCycle();
}

function openWifeCard(card: WifeCard) {
  activeWifeCard.value = card;
}

function closeWifeCard() {
  activeWifeCard.value = null;
}

function onWindowKeydown(event: KeyboardEvent) {
  if (event.key === "Escape" && activeWifeCard.value) {
    closeWifeCard();
  }
}

function setMapInteractive(enabled: boolean) {
  if (!map) return;

  if (enabled) {
    map.dragPan.enable();
    map.scrollZoom.enable();
    map.doubleClickZoom.enable();
    map.touchZoomRotate.enable();
  } else {
    map.dragPan.disable();
    map.scrollZoom.disable();
    map.doubleClickZoom.disable();
    map.touchZoomRotate.disable();
  }
}

function handleCardEnter() {
  setMapInteractive(true);
}

function handleCardLeave() {
  setMapInteractive(false);
}

function handleMapResize() {
  map?.resize();
}

function clearMapMarkers() {
  mapMarkers.forEach((marker) => marker.remove());
  mapMarkers = [];
}

function supportsWebGL() {
  try {
    const canvas = document.createElement("canvas");
    return Boolean(canvas.getContext("webgl2") || canvas.getContext("webgl"));
  } catch {
    return false;
  }
}

function renderFootprintPoints(points: { label: string; coords: [number, number] }[]) {
  if (!map || !maplibreglModule || !points.length) return;
  clearMapMarkers();

  points.forEach((point) => {
    const popup = new maplibreglModule.Popup({ offset: 18, closeButton: false }).setText(point.label);
    const marker = new maplibreglModule.Marker({ color: "#2ad4e1", scale: 0.9 })
      .setLngLat(point.coords)
      .setPopup(popup)
      .addTo(map);
    mapMarkers.push(marker);
  });

  if (points.length === 1) {
    map.setCenter(points[0].coords);
    map.setZoom(5.4);
    return;
  }

  const bounds = points.reduce(
    (acc, point) => acc.extend(point.coords),
    new maplibreglModule.LngLatBounds(points[0].coords, points[0].coords),
  );
  map.fitBounds(bounds, { padding: 52, maxZoom: 6.3, duration: 0 });
}

onMounted(async () => {
  isClientMounted.value = true;
  startSloganLoop();
  startSkillsBlinkLoop();
  window.addEventListener("keydown", onWindowKeydown);

  if (!mapContainer.value) return;

  if (!supportsWebGL()) {
    mapLoadError.value = "当前环境禁用了 WebGL，已自动关闭地图展示";
    return;
  }

  try {
    maplibreglModule = await import("maplibre-gl");
  } catch (error) {
    console.warn("[about] failed to import maplibre-gl", error);
    mapLoadError.value = "地图模块加载失败，已自动关闭地图展示";
    return;
  }

  try {
    map = new maplibreglModule.Map({
      container: mapContainer.value,
      style: {
        version: 8,
        sources: {
          osm: {
            type: "raster",
            tiles: [
              "https://a.tile.openstreetmap.org/{z}/{x}/{y}.png",
              "https://b.tile.openstreetmap.org/{z}/{x}/{y}.png",
              "https://c.tile.openstreetmap.org/{z}/{x}/{y}.png",
            ],
            tileSize: 256,
            attribution: "© OpenStreetMap contributors",
          },
        },
        layers: [
          {
            id: "osm-base",
            type: "raster",
            source: "osm",
          },
        ],
      },
      center: [105.0, 34.0],
      zoom: 3.1,
      attributionControl: false,
      dragRotate: false,
      pitchWithRotate: false,
    });
  } catch (error) {
    console.warn("[about] failed to initialize maplibre map", error);
    mapLoadError.value = "当前环境无法创建 WebGL 上下文，已自动关闭地图展示";
    map = null;
    return;
  }

  setMapInteractive(false);

  map.on("load", () => {
    renderFootprintPoints(footprintPoints.value);
    map?.resize();
    isMapLoaded.value = true;
    mapLoadError.value = "";
  });

  map.on("mouseenter", () => {
    const canvas = map?.getCanvas();
    if (canvas) canvas.style.cursor = "grab";
  });

  map.on("mousedown", () => {
    const canvas = map?.getCanvas();
    if (canvas) canvas.style.cursor = "grabbing";
  });

  map.on("mouseup", () => {
    const canvas = map?.getCanvas();
    if (canvas) canvas.style.cursor = "grab";
  });

  mapCard.value?.addEventListener("mouseenter", handleCardEnter);
  mapCard.value?.addEventListener("mouseleave", handleCardLeave);
  window.addEventListener("resize", handleMapResize, { passive: true });
});

watch(
  footprintPoints,
  (points) => {
    if (!isMapLoaded.value) return;
    renderFootprintPoints(points);
  },
  { deep: true },
);
watch(
  sloganWords,
  (words) => {
    if (!isClientMounted.value) {
      sloganWordDisplay.value = words[0] || "";
      return;
    }
    startSloganLoop();
  },
  { immediate: true },
);
watch(
  () => aboutSkills.value.items.map((item) => item.id).join("|"),
  () => {
    if (!isClientMounted.value) return;
    startSkillsBlinkLoop();
  },
);

onBeforeUnmount(() => {
  window.removeEventListener("keydown", onWindowKeydown);
  mapCard.value?.removeEventListener("mouseenter", handleCardEnter);
  mapCard.value?.removeEventListener("mouseleave", handleCardLeave);
  window.removeEventListener("resize", handleMapResize);
  clearMapMarkers();
  map?.remove();
  map = null;
  maplibreglModule = null;
  clearSloganTimers();
  clearSkillsTimers();
});
</script>

<template>
  <div class="about-page">
    <main class="about-main">
      <section class="about-hero">
        <div class="avatar-column">
          <div class="avatar-shell">
            <img class="about-avatar" :src="settings.userHeadpic" :alt="`${settings.userName} 头像`" />
            <img class="avatar-frame" src="/images/headborder.webp" alt="" aria-hidden="true" />
          </div>
        </div>

        <h1 class="about-title">关于</h1>
      </section>

      <section class="about-modules">
        <article class="module-card welcome-card">
          <p class="welcome-kicker">{{ aboutWelcome.text }}</p>
          <h2 class="welcome-name">我叫 <span>{{ aboutWelcome.name }}</span></h2>
          <p class="welcome-desc">{{ aboutWelcome.desc }}</p>
        </article>

        <article class="module-card slogan-card">
          <p class="slogan-kicker">{{ aboutSlogan.text }}</p>
          <h2 class="slogan-main">{{ aboutSlogan.main }}</h2>
          <p class="slogan-more">{{ sloganWordDisplay }}</p>
        </article>

        <article class="module-card skills-card">
          <h2 class="skills-title">{{ aboutSkills.title }}</h2>
          <div class="skills-grid">
            <div
              v-for="skill in aboutSkills.items"
              :key="skill.id"
              class="skill-item"
              :class="{ 'is-blink': skillBlinkStates[skill.id] }"
              :style="{ '--skill-bg': skill.bg }"
              :title="skill.label"
            >
              <img class="skill-icon" :src="skill.icon" :alt="skill.label" />
            </div>
          </div>
        </article>

        <article ref="mapCard" class="module-card footprint-card">
          <h2 class="footprint-title">足迹</h2>
          <div ref="mapContainer" class="footprint-map">
            <div v-if="mapLoadError" class="footprint-fallback">
              {{ mapLoadError }}
            </div>
          </div>
          <p class="footprint-hint">
            {{ mapStatusText }}
          </p>
        </article>

        <article class="module-card wives-wall-card">
          <div class="wives-viewport">
            <div class="wives-drag-layer">
              <div class="wives-grid">
                <div
                  v-for="(row, rowIndex) in wifeRows"
                  :key="`wives-row-${rowIndex}`"
                  class="wives-row"
                  :class="{ 'is-offset': rowIndex % 2 === 1 }"
                >
                  <button
                    v-for="card in row"
                    :key="card.id"
                    type="button"
                    class="wives-hex-card"
                    :aria-label="`查看 ${card.cnName || card.otherName || '爱妻'}`"
                    @click="openWifeCard(card)"
                  >
                    <span class="wives-hex-media">
                      <img :src="card.image" alt="爱妻墙卡片" draggable="false" />
                    </span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </article>

        <article class="module-card education-card">
          <p class="education-kicker">教育历程</p>
          <div class="education-body">
            <div class="education-timeline" aria-label="教育时间线">
              <div class="education-point">
                <span class="education-dot" aria-hidden="true" />
                <span class="education-time">{{ aboutEducation.start }}</span>
              </div>
              <span class="education-track" aria-hidden="true" />
              <div class="education-point">
                <span class="education-dot" aria-hidden="true" />
                <span class="education-time">{{ aboutEducation.end }}</span>
              </div>
            </div>
            <div class="education-content">
              <h2 class="education-text">{{ aboutEducation.text }}</h2>
              <p class="education-university">{{ aboutEducation.university }}</p>
            </div>
          </div>
        </article>

        <article class="module-card visitor-card">
          <p class="visitor-kicker">Visitor Data</p>
          <div class="visitor-body">
            <h2 class="visitor-title">{{ aboutVisitorData.title }}</h2>
            <p class="visitor-tips">{{ aboutVisitorData.tips }}</p>
          </div>
        </article>

        <article class="module-card hobby-card">
          <p class="hobby-kicker">兴趣爱好</p>
          <div class="hobby-notes" aria-label="爱好列表">
            <span
              v-for="(hobby, index) in aboutHobbies"
              :key="`${hobby}-${index}`"
              class="hobby-note"
            >
              {{ hobby }}
            </span>
          </div>
        </article>

        <article class="module-card life-target-card">
          <p class="target-kicker">Life Target</p>
          <h2 class="target-title">{{ aboutLifeTarget.text }}</h2>

          <section class="target-group" aria-label="已完成目标">
            <p class="target-group-title">已完成</p>
            <ul class="target-list">
              <li
                v-for="(item, index) in aboutLifeTarget.finish"
                :key="`finish-${index}-${item}`"
                class="target-item is-finished"
              >
                <span class="target-checkbox" aria-hidden="true" />
                <span class="target-text">{{ item }}</span>
              </li>
            </ul>
          </section>

          <section class="target-group" aria-label="未完成目标">
            <p class="target-group-title">未完成</p>
            <ul class="target-list">
              <li
                v-for="(item, index) in aboutLifeTarget.notYet"
                :key="`pending-${index}-${item}`"
                class="target-item is-pending"
              >
                <span class="target-checkbox" aria-hidden="true" />
                <span class="target-text">{{ item }}</span>
              </li>
            </ul>
          </section>
        </article>
      </section>
    </main>

    <Teleport to="body">
      <Transition name="wife-modal">
        <div v-if="activeWifeCard" class="wife-modal" @click.self="closeWifeCard">
          <article class="wife-modal-card" role="dialog" aria-modal="true" aria-label="爱妻详情">
            <button type="button" class="wife-modal-close" aria-label="关闭弹窗" @click="closeWifeCard">
              ×
            </button>

            <div class="wife-modal-image-wrap">
              <img :src="activeWifeCard.image" :alt="activeWifeCard.cnName || '爱妻图片'" />
            </div>

            <div class="wife-modal-content">
              <h2>{{ activeWifeCard.cnName || "未命名" }}</h2>
              <p>{{ activeWifeCard.otherName || "暂无别名" }}</p>
            </div>
          </article>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.about-page {
  position: relative;
  isolation: isolate;
  min-height: 100vh;
  padding: 6.3rem 1rem 2.8rem;
  color: var(--theme-text);
  overflow-x: clip;
}

.about-page::before {
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

.about-main {
  position: relative;
  z-index: 1;
  width: var(--site-max-width);
  margin: 0 auto;
}

.about-hero {
  padding: 1.3rem 0.5rem 0.5rem;
  display: grid;
  justify-items: center;
}

.avatar-column {
  display: grid;
  place-items: center;
}

.avatar-shell {
  position: relative;
  width: clamp(12rem, 22vw, 17rem);
  aspect-ratio: 1 / 1;
  display: grid;
  place-items: center;
}

.about-avatar {
  width: 82%;
  height: 82%;
  object-fit: cover;
  border-radius: 50%;
  border: 3px solid rgba(233, 240, 251, 0.9);
  box-shadow: 0 16px 36px rgba(0, 0, 0, 0.4);
}

.avatar-frame {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: contain;
  pointer-events: none;
  filter: drop-shadow(0 12px 22px rgba(0, 0, 0, 0.32));
}

.about-title {
  margin: 1rem 0 0;
  text-align: center;
  font-size: clamp(2.4rem, 5.1vw, 4.2rem);
  line-height: 1;
  letter-spacing: 0.015em;
  color: rgba(244, 249, 255, 0.97);
  text-shadow: 0 10px 26px rgba(0, 0, 0, 0.28);
}

.about-modules {
  margin-top: 2rem;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1rem;
}

.module-card {
  position: relative;
  border-radius: 1rem;
  border: 1px solid rgba(118, 170, 194, 0.26);
  background:
    linear-gradient(155deg, rgba(17, 29, 48, 0.86) 0%, rgba(7, 14, 25, 0.92) 100%),
    rgba(8, 16, 29, 0.82);
  backdrop-filter: blur(10px) saturate(112%);
  -webkit-backdrop-filter: blur(10px) saturate(112%);
  overflow: hidden;
}

.welcome-card {
  grid-column: 1 / 2;
  grid-row: 1;
  min-height: 13.8rem;
  display: grid;
  align-content: center;
  gap: 0;
  padding: clamp(0.9rem, 1.8vw, 1.35rem) clamp(1.2rem, 2.5vw, 1.8rem) clamp(0.9rem, 1.8vw, 1.35rem) clamp(1.55rem, 3.2vw, 2.4rem);
  background: linear-gradient(120deg, #0058A0 0%, #010B21 100%) 0 0 / 200% 200%;
  animation: welcome-gradient 15s ease-in-out infinite;
  box-shadow: 0 18px 30px rgba(0, 0, 0, 0.2);
}

.welcome-kicker {
  margin: 0;
  font-size: 0.9rem;
  letter-spacing: 0.14em;
  color: rgba(171, 206, 230, 0.84);
}

.welcome-name {
  margin: 0;
  font-size: clamp(1.9rem, 4vw, 3rem);
  line-height: 1.15;
  color: rgba(241, 248, 255, 0.98);
  text-shadow: 0 6px 20px rgba(1, 6, 14, 0.36);
}

.welcome-name span {
  color: #7ce8f5;
}

.welcome-desc {
  margin: 0;
  font-size: 1.03rem;
  line-height: 1.72;
  color: rgba(218, 233, 246, 0.92);
  white-space: pre-line;
}

@keyframes welcome-gradient {
  0% {
    background-position: 0% 50%;
  }
  50% {
    background-position: 100% 50%;
  }
  100% {
    background-position: 0% 50%;
  }
}

.slogan-card {
  grid-column: 2 / 3;
  grid-row: 1;
  min-height: 13.8rem;
  display: grid;
  align-content: center;
  gap: 0;
  padding: clamp(0.9rem, 1.8vw, 1.35rem) clamp(1.2rem, 2.5vw, 1.8rem) clamp(0.9rem, 1.8vw, 1.35rem) clamp(1.55rem, 3.2vw, 2.4rem);
  box-shadow: 0 18px 30px rgba(0, 0, 0, 0.2);
}

.slogan-kicker {
  margin: 0;
  font-size: 0.72rem;
  letter-spacing: 0.18em;
  color: rgba(171, 206, 230, 0.82);
}

.slogan-main {
  margin: 0;
  font-size: clamp(1.65rem, 3.3vw, 2.5rem);
  line-height: 1.2;
  color: rgba(243, 249, 255, 0.97);
  text-shadow: 0 6px 20px rgba(1, 6, 14, 0.34);
}

.slogan-more {
  margin: 0;
  min-height: 1.5em;
  font-size: clamp(1.2rem, 2.4vw, 1.65rem);
  line-height: 1.4;
  color: #7ce8f5;
  letter-spacing: 0.04em;
  text-shadow: 0 8px 20px rgba(19, 133, 150, 0.22);
}

.skills-card {
  grid-column: 1 / 2;
  grid-row: 2;
  min-height: 26rem;
  padding: 0.9rem;
  display: grid;
  grid-template-rows: auto 1fr;
  gap: 0.8rem;
  box-shadow: 0 18px 30px rgba(0, 0, 0, 0.2);
}

.skills-title {
  margin: 0;
  font-size: 1.12rem;
  line-height: 1.1;
  color: rgba(241, 248, 255, 0.96);
  text-shadow: 0 4px 14px rgba(1, 5, 12, 0.45);
}

.skills-grid {
  min-height: 0;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  grid-auto-rows: minmax(0, 1fr);
  gap: 0.62rem;
}

.skill-item {
  min-width: 0;
  min-height: 0;
  border-radius: 0.86rem;
  background: var(--skill-bg, linear-gradient(140deg, #43536f 0%, #1f2b3b 100%));
  display: grid;
  place-items: center;
  padding: 0.55rem;
  border: 1px solid rgba(215, 233, 249, 0.23);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.18),
    0 8px 18px rgba(0, 0, 0, 0.26);
  transition: transform 0.25s ease, filter 0.25s ease;
}

.skill-icon {
  width: 68%;
  max-width: 4rem;
  aspect-ratio: 1 / 1;
  object-fit: contain;
  filter: drop-shadow(0 4px 10px rgba(0, 0, 0, 0.28));
}

.skill-item.is-blink {
  animation: skill-blink 0.52s ease-in-out;
}

@keyframes skill-blink {
  0% {
    filter: brightness(1);
    transform: translateY(0);
  }
  22% {
    filter: brightness(2.05);
    transform: translateY(-2px);
  }
  48% {
    filter: brightness(0.76);
    transform: translateY(0);
  }
  72% {
    filter: brightness(1.7);
    transform: translateY(-1px);
  }
  100% {
    filter: brightness(1);
    transform: translateY(0);
  }
}

.footprint-card {
  grid-column: 2 / 3;
  grid-row: 2;
  min-height: 26rem;
  box-shadow: 0 18px 30px rgba(0, 0, 0, 0.24);
}

.footprint-title {
  position: absolute;
  top: 0.95rem;
  left: 1rem;
  margin: 0;
  z-index: 2;
  font-size: 1.28rem;
  font-weight: 700;
  color: rgba(238, 247, 255, 0.95);
  text-shadow: 0 3px 16px rgba(1, 5, 12, 0.56);
  pointer-events: none;
}

.footprint-map {
  width: 100%;
  min-height: 23.8rem;
  height: 100%;
}

.footprint-fallback {
  width: 100%;
  height: 100%;
  min-height: 23.8rem;
  display: grid;
  place-items: center;
  padding: 1rem;
  text-align: center;
  font-size: 0.94rem;
  color: rgba(210, 229, 245, 0.92);
  background:
    radial-gradient(circle at 20% 20%, rgba(60, 123, 171, 0.22), transparent 55%),
    radial-gradient(circle at 80% 75%, rgba(42, 212, 225, 0.14), transparent 52%),
    linear-gradient(180deg, rgba(5, 14, 24, 0.72) 0%, rgba(3, 9, 17, 0.82) 100%);
}

.footprint-hint {
  margin: 0;
  position: absolute;
  left: 1rem;
  bottom: 0.85rem;
  z-index: 2;
  font-size: 0.84rem;
  color: rgba(212, 230, 245, 0.88);
  background: rgba(4, 12, 23, 0.48);
  padding: 0.3rem 0.65rem;
  border-radius: 0.55rem;
  backdrop-filter: blur(3px);
  -webkit-backdrop-filter: blur(3px);
  pointer-events: none;
}

.footprint-card::after {
  content: "";
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: linear-gradient(180deg, rgba(2, 6, 14, 0.08) 0%, rgba(3, 8, 16, 0.32) 100%);
}

.footprint-card :deep(.maplibregl-ctrl-bottom-right) {
  margin: 0 0.48rem 0.52rem 0;
}

.footprint-card :deep(.maplibregl-ctrl-group) {
  background: rgba(6, 15, 27, 0.72);
  border: 1px solid rgba(96, 145, 172, 0.34);
  box-shadow: 0 5px 16px rgba(0, 0, 0, 0.24);
}

.footprint-card :deep(.maplibregl-ctrl-group button) {
  filter: brightness(1.08);
}

.footprint-card :deep(.maplibregl-popup-content) {
  border-radius: 0.58rem;
  padding: 0.36rem 0.52rem;
  color: #eaf4ff;
  background: rgba(5, 16, 29, 0.95);
  border: 1px solid rgba(88, 149, 182, 0.38);
  box-shadow: 0 9px 18px rgba(0, 0, 0, 0.35);
  font-size: 0.82rem;
}

.footprint-card :deep(.maplibregl-popup-tip) {
  border-top-color: rgba(5, 16, 29, 0.95);
}

.wives-wall-card {
  grid-column: 1 / 3;
  grid-row: 3;
  min-height: 34.5rem;
  padding: 1.05rem;
  position: relative;
  isolation: isolate;
  display: grid;
  grid-template-rows: minmax(0, 1fr);
  background: #030714;
}

.wives-wall-card::before {
  content: "";
  position: absolute;
  inset: -25%;
  z-index: 0;
  pointer-events: none;
  background-image:
    linear-gradient(135deg, rgba(7, 28, 54, 0.28), rgba(4, 19, 40, 0.34)),
    url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath fill='%230f9cb8' fill-opacity='0.08' d='M12 21s-6.7-4.35-9.33-7.56C.8 11.2 1.05 7.8 3.74 5.98c2.2-1.48 5.03-1.03 6.93 1.11 1.9-2.14 4.74-2.59 6.93-1.11 2.69 1.82 2.94 5.22 1.07 7.46C18.7 16.65 12 21 12 21z'/%3E%3C/svg%3E");
  background-size:
    100% 100%,
    180px 180px;
  background-position:
    0 0,
    0 0;
  background-repeat: repeat;
  transform: rotate(-14deg) scale(1.04);
  transform-origin: center;
  opacity: 0.9;
  animation: wives-heart-drift-solid 12s linear infinite;
}

.wives-wall-card::after {
  content: "";
  position: absolute;
  inset: -25%;
  z-index: 0;
  pointer-events: none;
  background-image:
    url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath fill='none' stroke='%23a8d8e8' stroke-opacity='0.2' stroke-width='1.55' d='M12 21s-6.7-4.35-9.33-7.56C.8 11.2 1.05 7.8 3.74 5.98c2.2-1.48 5.03-1.03 6.93 1.11 1.9-2.14 4.74-2.59 6.93-1.11 2.69 1.82 2.94 5.22 1.07 7.46C18.7 16.65 12 21 12 21z'/%3E%3C/svg%3E");
  background-size: 260px 260px;
  background-position: 120px 90px;
  background-repeat: repeat;
  transform: rotate(-14deg) scale(1.04);
  transform-origin: center;
  animation: wives-heart-drift-outline 16s linear infinite;
}

.education-card {
  grid-column: 1 / 2;
  grid-row: 4;
  min-height: 13.8rem;
  padding: 1rem 1.05rem 1.05rem;
  display: grid;
  grid-template-rows: auto 1fr;
  gap: 0.8rem;
  box-shadow: 0 18px 30px rgba(0, 0, 0, 0.22);
}

.education-kicker {
  margin: 0;
  font-size: 0.78rem;
  letter-spacing: 0.12em;
  color: rgba(170, 206, 230, 0.82);
}

.education-body {
  display: grid;
  grid-template-columns: minmax(0, 7rem) minmax(0, 1fr);
  gap: 1rem;
  min-height: 0;
}

.education-timeline {
  min-height: 100%;
  display: grid;
  grid-template-rows: auto minmax(1.8rem, 1fr) auto;
  align-items: center;
}

.education-point {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
}

.education-dot {
  width: 0.56rem;
  height: 0.56rem;
  border-radius: 999px;
  background: #7ce8f5;
  box-shadow:
    0 0 0 1px rgba(178, 241, 255, 0.8),
    0 0 12px rgba(111, 224, 244, 0.6);
}

.education-time {
  font-size: 0.8rem;
  color: rgba(220, 236, 248, 0.9);
  line-height: 1;
}

.education-track {
  width: 2px;
  height: 100%;
  margin-left: 0.24rem;
  border-radius: 999px;
  background: linear-gradient(180deg, rgba(124, 232, 245, 0.9) 0%, rgba(124, 232, 245, 0.18) 100%);
}

.education-content {
  min-width: 0;
  display: grid;
  align-content: center;
  gap: 0.62rem;
}

.education-text {
  margin: 0;
  font-size: clamp(1.22rem, 2.24vw, 1.78rem);
  line-height: 1.42;
  color: rgba(240, 248, 255, 0.98);
  text-shadow: 0 5px 16px rgba(1, 6, 14, 0.34);
}

.education-university {
  margin: 0;
  font-size: 0.95rem;
  line-height: 1.5;
  color: rgba(200, 220, 236, 0.9);
}

.visitor-card {
  grid-column: 2 / 3;
  grid-row: 4;
  min-height: 13.8rem;
  padding: 1rem 1.05rem 1.05rem;
  display: grid;
  grid-template-rows: auto 1fr;
  gap: 0.8rem;
  box-shadow: 0 18px 30px rgba(0, 0, 0, 0.22);
}

.visitor-kicker {
  margin: 0;
  font-size: 0.78rem;
  letter-spacing: 0.12em;
  color: rgba(170, 206, 230, 0.82);
}

.visitor-body {
  min-width: 0;
  min-height: 0;
  border-radius: 0.78rem;
  border: 1px solid rgba(121, 177, 207, 0.28);
  background: linear-gradient(145deg, rgba(10, 23, 38, 0.68) 0%, rgba(5, 14, 26, 0.88) 100%);
  padding: 0.95rem 1rem;
  display: grid;
  align-content: center;
  gap: 0.58rem;
}

.visitor-title {
  margin: 0;
  font-size: clamp(1.42rem, 2.58vw, 2.15rem);
  line-height: 1.1;
  color: rgba(240, 248, 255, 0.98);
  text-shadow: 0 5px 16px rgba(1, 6, 14, 0.34);
}

.visitor-tips {
  margin: 0;
  font-size: 0.95rem;
  line-height: 1.5;
  color: rgba(200, 220, 236, 0.9);
}

.hobby-card {
  grid-column: 1 / 2;
  grid-row: 5;
  min-height: 13.8rem;
  padding: 1rem 1.05rem 1.05rem;
  display: grid;
  grid-template-rows: auto 1fr;
  gap: 0.8rem;
  box-shadow: 0 18px 30px rgba(0, 0, 0, 0.22);
}

.hobby-kicker {
  margin: 0;
  font-size: 0.78rem;
  letter-spacing: 0.12em;
  color: rgba(170, 206, 230, 0.82);
}

.hobby-notes {
  min-height: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 0.62rem;
  align-content: start;
}

.hobby-note {
  position: relative;
  display: inline-flex;
  align-items: center;
  min-height: 2rem;
  max-width: 100%;
  padding: 0.44rem 0.78rem 0.44rem 0.72rem;
  border-radius: 999px;
  border: 1px solid rgba(228, 236, 247, 0.42);
  background:
    linear-gradient(180deg, rgba(249, 252, 255, 0.97) 0%, rgba(232, 241, 250, 0.94) 100%),
    linear-gradient(140deg, rgba(255, 255, 255, 0.52), rgba(206, 224, 240, 0.3));
  color: rgba(25, 44, 63, 0.96);
  font-size: 0.86rem;
  font-weight: 500;
  letter-spacing: 0.02em;
  box-shadow:
    0 6px 14px rgba(1, 8, 16, 0.2),
    inset 0 1px 0 rgba(255, 255, 255, 0.88);
  white-space: nowrap;
}

.hobby-note::before {
  content: "";
  width: 0.38rem;
  height: 0.38rem;
  margin-right: 0.44rem;
  border-radius: 999px;
  background: rgba(79, 143, 195, 0.74);
  box-shadow: 0 0 0 1px rgba(230, 243, 255, 0.9);
}

.life-target-card {
  grid-column: 2 / 3;
  grid-row: 5 / span 2;
  min-height: 28.6rem;
  padding: 1rem 1.05rem 1.05rem;
  display: grid;
  grid-template-rows: auto auto auto 1fr;
  gap: 0.72rem;
  box-shadow: 0 18px 30px rgba(0, 0, 0, 0.22);
}

.target-kicker {
  margin: 0;
  font-size: 0.78rem;
  letter-spacing: 0.12em;
  color: rgba(170, 206, 230, 0.82);
}

.target-title {
  margin: 0;
  font-size: clamp(1.24rem, 2.06vw, 1.62rem);
  line-height: 1.2;
  color: rgba(240, 248, 255, 0.98);
}

.target-group {
  min-width: 0;
}

.target-group-title {
  margin: 0;
  font-size: 0.8rem;
  letter-spacing: 0.06em;
  color: rgba(190, 215, 236, 0.84);
}

.target-list {
  margin: 0.56rem 0 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 0.48rem;
}

.target-item {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  min-width: 0;
}

.target-checkbox {
  width: 1rem;
  height: 1rem;
  border-radius: 0.28rem;
  flex: none;
  position: relative;
}

.target-text {
  min-width: 0;
  font-size: 0.9rem;
  line-height: 1.45;
}

.target-item.is-finished .target-checkbox {
  border: 1px solid rgba(120, 233, 189, 0.8);
  background: linear-gradient(150deg, rgba(71, 217, 133, 0.95) 0%, rgba(50, 168, 110, 0.95) 100%);
  box-shadow:
    0 0 0 1px rgba(33, 109, 75, 0.26),
    0 3px 8px rgba(8, 44, 28, 0.34);
}

.target-item.is-finished .target-checkbox::after {
  content: "";
  position: absolute;
  left: 0.31rem;
  top: 0.15rem;
  width: 0.22rem;
  height: 0.45rem;
  border: solid rgba(244, 255, 249, 0.98);
  border-width: 0 2px 2px 0;
  transform: rotate(45deg);
}

.target-item.is-finished .target-text {
  color: rgba(224, 248, 236, 0.95);
}

.target-item.is-pending .target-checkbox {
  border: 1px solid rgba(159, 182, 203, 0.55);
  background: linear-gradient(180deg, rgba(120, 141, 160, 0.36) 0%, rgba(88, 107, 124, 0.32) 100%);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.18);
}

.target-item.is-pending .target-text {
  color: rgba(172, 194, 214, 0.84);
}

.wives-viewport {
  position: relative;
  z-index: 1;
  min-height: 0;
  height: 100%;
  overflow: auto;
  user-select: none;
  border-radius: 0.78rem;
}

.wives-drag-layer {
  position: relative;
  width: fit-content;
  margin: 0 auto;
  padding-top: 0.65rem;
  padding-bottom: 0.45rem;
}

.wives-grid {
  --wives-hex-width: clamp(8.2rem, 11.8vw, 11.2rem);
  --wives-hex-height: calc(var(--wives-hex-width) * 1.147);
  --wives-hex-gap: clamp(0.2rem, 0.36vw, 0.34rem);
  --wives-hex-clip: polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%);
  width: fit-content;
}

.wives-row {
  display: grid;
  grid-template-columns: repeat(4, var(--wives-hex-width));
  gap: var(--wives-hex-gap);
}

.wives-row + .wives-row {
  margin-top: calc(var(--wives-hex-height) * -0.23);
}

.wives-row.is-offset {
  margin-left: calc(var(--wives-hex-width) * 0.5 + var(--wives-hex-gap) * 0.5);
}

.wives-hex-card {
  width: var(--wives-hex-width);
  height: var(--wives-hex-height);
  position: relative;
  border: 0;
  padding: 0;
  cursor: pointer;
  background: linear-gradient(
    145deg,
    rgba(162, 238, 255, 0.95) 0%,
    rgba(88, 172, 255, 0.86) 58%,
    rgba(32, 108, 196, 0.9) 100%
  );
  clip-path: var(--wives-hex-clip);
  box-shadow:
    0 0 0 1px rgba(184, 244, 255, 0.74),
    0 0 22px rgba(87, 184, 255, 0.78),
    0 12px 28px rgba(0, 0, 0, 0.35);
  transition: box-shadow 0.26s cubic-bezier(0.2, 0.86, 0.2, 1);
  isolation: isolate;
}

.wives-hex-card::before {
  content: "";
  position: absolute;
  inset: -7px;
  clip-path: var(--wives-hex-clip);
  background: radial-gradient(circle, rgba(126, 226, 255, 0.64) 0%, rgba(21, 98, 172, 0) 70%);
  filter: blur(9px);
  opacity: 0.92;
  pointer-events: none;
  z-index: 0;
}

.wives-hex-media {
  position: absolute;
  inset: 2px;
  clip-path: var(--wives-hex-clip);
  overflow: hidden;
  z-index: 1;
  background: #061326;
}

.wives-hex-media::after {
  content: "";
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.14) 0%, rgba(0, 0, 0, 0.08) 100%);
  pointer-events: none;
}

.wives-hex-media img {
  width: 100%;
  height: 100%;
  display: block;
  object-fit: cover;
  transform: scale(1.01);
  transition: transform 0.26s cubic-bezier(0.2, 0.86, 0.2, 1);
}

.wives-hex-card:hover {
  box-shadow:
    0 0 0 1px rgba(201, 248, 255, 0.9),
    0 0 30px rgba(109, 208, 255, 0.92),
    0 16px 34px rgba(0, 0, 0, 0.38);
}

.wives-hex-card:hover .wives-hex-media img {
  transform: scale(1.06);
}

.wives-hex-card:focus-visible {
  outline: 2px solid #8de7ff;
  outline-offset: 4px;
}

.wife-modal {
  position: fixed;
  inset: 0;
  z-index: 120;
  display: grid;
  place-items: center;
  padding: 1.2rem;
  background: rgba(2, 10, 24, 0.7);
  backdrop-filter: blur(6px);
}

.wife-modal-card {
  position: relative;
  width: min(25rem, 94vw);
  border-radius: 0.9rem;
  border: 1px solid rgba(120, 201, 255, 0.45);
  background: #081529;
  box-shadow:
    0 0 0 1px rgba(96, 196, 255, 0.2),
    0 22px 48px rgba(0, 0, 0, 0.44);
  overflow: hidden;
}

.wife-modal-close {
  position: absolute;
  top: 0.55rem;
  left: 0.55rem;
  width: 2rem;
  height: 2rem;
  border-radius: 0.5rem;
  border: 1px solid rgba(160, 218, 255, 0.45);
  background: rgba(4, 22, 43, 0.9);
  color: #eaf6ff;
  font-size: 1.18rem;
  line-height: 1;
  cursor: pointer;
  z-index: 2;
}

.wife-modal-close:hover {
  background: rgba(11, 37, 68, 0.95);
}

.wife-modal-image-wrap {
  aspect-ratio: 1 / 1;
  background: #050f1f;
}

.wife-modal-image-wrap img {
  width: 100%;
  height: 100%;
  display: block;
  object-fit: cover;
}

.wife-modal-content {
  padding: 0.9rem 1rem 1rem;
}

.wife-modal-content h2 {
  margin: 0;
  color: #f3f9ff;
  font-size: 1.22rem;
  line-height: 1.2;
}

.wife-modal-content p {
  margin: 0.45rem 0 0;
  color: rgba(227, 241, 255, 0.82);
  font-size: 0.96rem;
}

.wife-modal-enter-active,
.wife-modal-leave-active {
  transition: opacity 0.22s ease;
}

.wife-modal-enter-active .wife-modal-card,
.wife-modal-leave-active .wife-modal-card {
  transition: transform 0.24s cubic-bezier(0.2, 0.86, 0.24, 1);
}

.wife-modal-enter-from,
.wife-modal-leave-to {
  opacity: 0;
}

.wife-modal-enter-from .wife-modal-card,
.wife-modal-leave-to .wife-modal-card {
  transform: translateY(0.6rem) scale(0.98);
}

@keyframes wives-heart-drift-solid {
  0% {
    background-position:
      0 0,
      0 0;
  }

  100% {
    background-position:
      0 0,
      120px 0;
  }
}

@keyframes wives-heart-drift-outline {
  0% {
    background-position: 120px 90px;
  }

  100% {
    background-position: 260px 90px;
  }
}

@media (max-width: 1180px) {
  .wives-grid {
    --wives-hex-width: clamp(7.6rem, 16.3vw, 10rem);
    --wives-hex-gap: 0.28rem;
  }
}

@media (max-width: 1080px) {
  .about-modules {
    grid-template-columns: 1fr;
  }

  .welcome-card,
  .slogan-card,
  .skills-card,
  .footprint-card,
  .wives-wall-card,
  .education-card,
  .visitor-card,
  .hobby-card,
  .life-target-card {
    grid-column: 1;
    grid-row: auto;
  }
}

@media (max-width: 900px) {
  .about-page {
    padding-top: 6rem;
  }

  .avatar-shell {
    width: clamp(11.2rem, 44vw, 15rem);
  }

  .about-title {
    margin-top: 0.9rem;
  }
}

@media (max-width: 560px) {
  .about-page {
    padding-inline: 0.65rem;
  }

  .about-hero {
    padding-inline: 0;
  }

  .avatar-shell {
    width: clamp(10.2rem, 58vw, 13.5rem);
  }

  .footprint-card {
    min-height: 22.6rem;
  }

  .welcome-card {
    min-height: 0;
  }

  .skills-grid {
    gap: 0.5rem;
  }

  .wives-wall-card {
    min-height: 29.5rem;
    padding: 0.7rem;
  }

  .education-card {
    min-height: 0;
  }

  .education-body {
    grid-template-columns: minmax(0, 5.8rem) minmax(0, 1fr);
    gap: 0.75rem;
  }

  .visitor-card {
    min-height: 0;
  }

  .hobby-card {
    min-height: 0;
  }

  .hobby-notes {
    gap: 0.52rem;
    justify-content: flex-start;
  }

  .hobby-note {
    max-width: calc(100vw - 4.6rem);
  }

  .life-target-card {
    min-height: 0;
    grid-template-rows: auto auto auto auto;
  }

  .wives-grid {
    --wives-hex-width: clamp(6.5rem, 22vw, 8rem);
    --wives-hex-gap: 0.2rem;
  }

  .wives-row + .wives-row {
    margin-top: calc(var(--wives-hex-height) * -0.21);
  }

  .wife-modal-content h2 {
    font-size: 1.08rem;
  }

  .footprint-map {
    min-height: 20.7rem;
  }
}
</style>
