<script setup lang="ts">
type GalleryItem = {
  name: string;
  src: string;
  alt: string;
  caption: string;
};

type BlogPost = {
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
  title: string;
  summary: string;
  icon: string;
  to: string;
};

const gallery: readonly [GalleryItem, ...GalleryItem[]] = [
  {
    name: "今日份拍摄",
    src: "/images/pic.jpg",
    alt: "Card preview image",
    caption:
      "喜欢角色扮演和摄影，把每次出行都记录成片段。",
  }
];

const posts: readonly BlogPost[] = [
  {
    title: "测试文章1",
    summary:
      "测试文章",
    cover: "/images/pic.jpg",
    to: "/article/ai-fatigue-real",
  },
  {
    title: "测试文章2",
    summary:
      "测试文章2",
    cover: "/images/background.png",
    to: "/article/ai-rebuild-rfc-plan",
  },
  {
    title: "测试文章3",
    summary:
      "测试文章3",
    cover: "/images/scene-shore.svg",
    to: "/article/lobehub-performance-dx",
  },
];

const dailyRecords: readonly DailyRecord[] = [
  {
    year: "2026",
    date: "03.04",
    title: "首页 Nuxt 3 升级至 4 版本 / 小窝多个服务更新",
    summary:
      "更新首页 Nuxt 3 -> 4 版本主要调整了文件目录结构为主，多个文件夹放在了 /app 里面，顺带把命名统一成中划线。",
    to: "/article/tailwind-v4-color-system",
  },
  {
    year: "2026",
    date: "02.23",
    title: "春节假期总结",
    summary:
      "第一天：在家休息继续修图返图、第二天：休息的同时把测试进度合并到记录里，整体节奏很舒服。",
    to: "/article/after-leaving-folo",
  },
  {
    year: "2026",
    date: "01.12",
    title: "因一位招聘人选引发的思考 / 精力与热情的较量",
    summary:
      "下班后聊到一位设计招聘人选，回头对照了自己的学习结构。她最突出的点就是快速学习能力和执行力。",
    to: "/article/better-auth-multi-tenant",
  },
  {
    year: "2026",
    date: "01.03",
    title: "帮外婆换的新手机导数据",
    summary:
      "上午外婆来我家做客，换新手机后数据迁移还没完成。后来把通讯录和照片分批迁移，预留了后续备份计划。",
    to: "/article/context-engineering-intro",
  },
];

const photos: readonly PhotoItem[] = [
  {
    title: "李元芳",
    date: "2026-03-22",
    image: "/images/pic.jpg",
    alt: "Recent capture 1",
    to: "/album",
  },
  {
    title: "李元芳",
    date: "2026-03-22",
    image: "/images/pic.jpg",
    alt: "Recent capture 2",
    to: "/album",
  },
  {
    title: "李元芳",
    date: "2026-03-22",
    image: "/images/pic.jpg",
    alt: "Recent capture 3",
    to: "/album",
  },
  {
    title: "李元芳",
    date: "2026-03-22",
    image: "/images/pic.jpg",
    alt: "Recent capture 4",
    to: "/album",
  },
];

const projects: readonly ProjectItem[] = [
  {
    title: "CoseRoom",
    summary:
      "面向 Cos 与社区活动的记录空间，支持图文发布与主题展示。",
    icon: "/images/coseroom-logo.png",
    to: "/article",
  },
  {
    title: "NeHex Theme Kit",
    summary:
      "博客主题的快速模板和组件集，视觉风格与布局支持一键复用。",
    icon: "/images/coseroom-logo.png",
    to: "/article",
  },
  {
    title: "Shot Archive",
    summary:
      "照片整理工具，给日常拍摄内容做标签、归档和分享输出。",
    icon: "/images/coseroom-logo.png",
    to: "/article",
  },
  {
    title: "Sprint Notes",
    summary:
      "轻量的项目迭代记录页，把周报、问题追踪和复盘合并在一处。",
    icon: "/images/coseroom-logo.png",
    to: "/article",
  },
];

const currentIndex = ref(0);
const currentImage = computed<GalleryItem>(
  () => gallery[currentIndex.value] ?? gallery[0],
);

function randomScene() {
  if (gallery.length <= 1) return;
  let next = currentIndex.value;
  while (next === currentIndex.value) {
    next = Math.floor(Math.random() * gallery.length);
  }
  currentIndex.value = next;
}
</script>

<template>
  <div class="page">
    <section class="hero">
      <div class="hero-overlay" />
      <div class="hero-card-slot">
        <article class="owner-card">
          <div class="card-left">
            <div class="owner-avatar-wrap">
              <img class="owner-avatar" src="/images/head.jpg" alt="Owner avatar" />
              <span class="owner-avatar-bubble">✨</span>
            </div>
            <h2 class="owner-name">uegee</h2>
            <p class="owner-bio">
              一个死宅<br/>
              一个无业游民</br>
              一个穷孩子生活在有钱人的城市<br/>
              一个沉沦于自由意志的牢笼中的鸟
            </p>

            <div class="social-row">
              <a href="#" class="icon-btn" aria-label="GitHub">
                <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path
                    d="M12 3.4a8.6 8.6 0 0 0-2.72 16.76c.43.08.57-.19.57-.42v-1.5c-2.33.51-2.82-1.12-2.82-1.12c-.38-.97-.93-1.23-.93-1.23c-.77-.52.06-.51.06-.51c.84.06 1.28.86 1.28.86c.76 1.29 1.97.92 2.45.7c.07-.54.29-.92.52-1.14c-1.86-.22-3.81-.93-3.81-4.15c0-.92.33-1.66.87-2.25c-.08-.22-.38-1.1.09-2.3c0 0 .71-.23 2.33.86a8.08 8.08 0 0 1 4.23 0c1.62-1.09 2.33-.86 2.33-.86c.47 1.2.18 2.08.1 2.3c.54.59.87 1.33.87 2.25c0 3.23-1.96 3.93-3.83 4.14c.3.26.56.76.56 1.53v2.26c0 .23.14.5.58.42A8.6 8.6 0 0 0 12 3.4Z"
                  />
                </svg>
              </a>
              <a href="#" class="icon-btn" aria-label="X">
                <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M4 4h4.5l3.6 5.1L16.5 4H20l-6.2 7.1L20 20h-4.5l-4-5.6L6.6 20H3l6.6-7.5L4 4Z" />
                </svg>
              </a>
              <a href="#" class="icon-btn" aria-label="Video">
                <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M4 8.4a2 2 0 0 1 2-2h8.8a2 2 0 0 1 2 2v7.2a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8.4Z" />
                  <path d="M10.2 10.1l4.1 2.2l-4.1 2.2v-4.4Z" />
                </svg>
              </a>
              <a href="#" class="icon-btn" aria-label="Message">
                <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M5.2 6.1h13.6a1.2 1.2 0 0 1 1.2 1.2v9.4a1.2 1.2 0 0 1-1.2 1.2H5.2A1.2 1.2 0 0 1 4 16.7V7.3a1.2 1.2 0 0 1 1.2-1.2Z" />
                  <path d="m7.4 9.1l4.6 3.7l4.6-3.7" />
                </svg>
              </a>
            </div>
          </div>

          <div class="card-right">
            <div class="image-head">
              <h3 class="image-name">{{ currentImage.name }}</h3>
              <button
                class="dice-button"
                type="button"
                title="Switch image"
                aria-label="Switch image"
                @click="randomScene"
              >
                <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M20 6v4h-4" />
                  <path d="M4 18v-4h4" />
                  <path d="M6.4 10a6.2 6.2 0 0 1 10.25-2.18L20 10" />
                  <path d="M17.6 14a6.2 6.2 0 0 1-10.25 2.18L4 14" />
                </svg>
              </button>
            </div>

            <img class="scene-image" :src="currentImage.src" :alt="currentImage.alt" />
            <p class="image-caption">{{ currentImage.caption }}</p>
          </div>
        </article>
      </div>
    </section>

    <section class="content-fade">
      <div id="blog" class="blog-shell section-shell">
        <div class="blog-heading">
          <h2 class="blog-title">
            <span>博客文章</span>
          </h2>
          <p class="blog-subtitle">
            分享技术积累与人生感悟，文字版“正片”
          </p>
        </div>

        <div class="post-grid">
          <NuxtLink v-for="post in posts" :key="post.title" :to="post.to" class="post-card">
            <img class="post-cover" :src="post.cover" :alt="post.title" />
            <div class="post-mask" />
            <div class="post-content">
              <h3 class="post-title">{{ post.title }}</h3>
              <p class="post-summary">{{ post.summary }}</p>
            </div>
          </NuxtLink>
        </div>
      </div>

      <div id="journal" class="journal-shell section-shell">
        <div class="journal-heading">
          <h2 class="journal-title">
            <span>日常记录</span>
          </h2>
          <p class="journal-subtitle">
            分享工作、生活、编程、摄影日常
          </p>
        </div>

        <div class="journal-grid">
          <NuxtLink
            v-for="record in dailyRecords"
            :key="`${record.year}-${record.date}-${record.title}`"
            :to="record.to"
            class="journal-card"
          >
            <div class="journal-date">
              <div class="journal-year">{{ record.year }}</div>
              <div class="journal-day">{{ record.date }}</div>
            </div>
            <div class="journal-body">
              <h3 class="journal-card-title">{{ record.title }}</h3>
              <p class="journal-card-summary">{{ record.summary }}</p>
            </div>
          </NuxtLink>
        </div>
      </div>

      <div id="photo" class="photo-shell section-shell">
        <div class="photo-heading">
          <h2 class="photo-title">
            <span>近期捕获</span>
          </h2>
          <p class="photo-subtitle">
            捕捉人生中的每一份精彩时刻与温暖
          </p>
        </div>

        <div class="photo-grid">
          <NuxtLink
            v-for="photo in photos"
            :key="`${photo.title}-${photo.date}-${photo.alt}`"
            :to="photo.to"
            class="photo-card"
          >
            <img class="photo-image" :src="photo.image" :alt="photo.alt" />
            <h3 class="photo-name">{{ photo.title }}</h3>
            <p class="photo-date">{{ photo.date }}</p>
          </NuxtLink>
        </div>
      </div>

      <div id="projects" class="project-shell section-shell">
        <div class="project-heading">
          <h2 class="project-title">
            <span>我的项目</span>
          </h2>
          <p class="project-subtitle">
            近期实践与正在迭代的工具
          </p>
        </div>

        <div class="project-grid">
          <NuxtLink v-for="project in projects" :key="project.title" :to="project.to" class="project-card">
            <img class="project-icon" :src="project.icon" :alt="`${project.title} logo`" />
            <div class="project-info">
              <h3 class="project-card-title">{{ project.title }}</h3>
              <p class="project-card-summary">{{ project.summary }}</p>
            </div>
          </NuxtLink>
        </div>
      </div>

    </section>
  </div>
</template>

<style scoped>
:global(*) {
  box-sizing: border-box;
}

:global(body) {
  margin: 0;
  font-family: "Segoe UI", "PingFang SC", "Hiragino Sans GB", sans-serif;
  color: #eaf3ff;
  background: #030815;
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
  z-index: -1;
  background-image: url("/images/background.png");
  background-position: center top;
  background-size: cover;
  background-repeat: no-repeat;
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
  z-index: 3;
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
}

.icon-btn {
  width: 1.7rem;
  height: 1.7rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 0.45rem;
  color: rgba(236, 245, 255, 0.92);
  border: 1px solid transparent;
  background: transparent;
}

.icon-btn:hover {
  border-color: rgba(214, 235, 255, 0.28);
  background: rgba(255, 255, 255, 0.06);
}

.icon-btn svg {
  width: 1rem;
  height: 1rem;
}

.icon-btn path {
  stroke: currentColor;
  fill: currentColor;
  stroke-width: 1.35;
  stroke-linecap: round;
  stroke-linejoin: round;
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
  width: 1.88rem;
  height: 1.88rem;
  border-radius: 0.44rem;
  border: 1px solid rgba(207, 233, 255, 0.18);
  background: rgba(255, 255, 255, 0.04);
  color: rgba(238, 247, 255, 0.9);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.dice-button svg {
  width: 1rem;
  height: 1rem;
}

.dice-button path {
  stroke: currentColor;
  stroke-width: 1.7;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.scene-image {
  margin-top: 0.72rem;
  width: 100%;
  aspect-ratio: 16 / 9;
  object-fit: cover;
  border-radius: 0.72rem;
  border: 1px solid rgba(221, 238, 255, 0.12);
  filter: grayscale(0.85) contrast(1.06) brightness(0.9);
}

.image-caption {
  margin: 0.58rem 0 0;
  color: rgba(195, 215, 238, 0.76);
  font-size: 0.75rem;
}

.content-fade {
  position: relative;
  z-index: 6;
  --section-width: min(92%, 1560px);
  --fade-lead: clamp(3.8rem, 9vh, 8rem);
  margin-top: calc(-1 * var(--fade-lead));
  padding-top: var(--fade-lead);
  min-height: 130vh;
  background: linear-gradient(
    180deg,
    rgba(3, 8, 21, 0) 0%,
    rgba(3, 8, 21, 0.84) 18%,
    rgba(3, 8, 21, 0.98) 36%,
    rgba(3, 8, 21, 1) 100%
  );
}

.section-shell {
  width: var(--section-width);
  margin: 0 auto;
}

.blog-shell {
  padding: 5.6rem 1.2rem 7rem;
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
  min-height: 30rem;
  background: #0c1320;
  box-shadow: 0 12px 42px rgba(0, 0, 0, 0.32);
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
  padding: 1.15rem 1.1rem 1.2rem;
}

.post-title {
  margin: 0;
  font-size: clamp(1.28rem, 1.35vw, 1.74rem);
  line-height: 1.3;
  font-weight: 800;
}

.post-summary {
  margin: 0.72rem 0 0;
  color: rgba(220, 233, 244, 0.7);
  font-size: 0.9rem;
  line-height: 1.65;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
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

.journal-date {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: flex-start;
  color: #0f9cb8;
}

.journal-year {
  font-size: 2rem;
  line-height: 1;
  opacity: 0.86;
}

.journal-day {
  margin-top: 0.9rem;
  font-size: 3.2rem;
  line-height: 0.9;
  font-weight: 500;
}

.journal-card-title {
  margin: 0;
  font-size: clamp(1.55rem, 1.9vw, 2.08rem);
  line-height: 1.3;
  color: rgba(235, 245, 255, 0.96);
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
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 1.35rem;
}

.photo-card {
  display: block;
  text-decoration: none;
  color: inherit;
}

.photo-image {
  width: 100%;
  aspect-ratio: 3 / 4;
  object-fit: cover;
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
  padding: 0.2rem 1rem 8rem;
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
  display: grid;
  grid-template-columns: 3.6rem 1fr;
  align-items: center;
  gap: 0.85rem;
  padding: 0.95rem 1rem;
  border-radius: 0.82rem;
  text-decoration: none;
  color: inherit;
  background: rgba(27, 28, 33, 0.84);
}

.project-icon {
  width: 3.1rem;
  height: 3.1rem;
  object-fit: cover;
  border-radius: 0.62rem;
  background: rgba(255, 255, 255, 0.08);
}

.project-info {
  min-width: 0;
}

.project-card-title {
  margin: 0;
  color: rgba(236, 246, 255, 0.96);
  font-size: 1.06rem;
  line-height: 1.25;
  font-weight: 700;
}

.project-card-summary {
  margin: 0.38rem 0 0;
  color: rgba(192, 210, 225, 0.65);
  font-size: 0.86rem;
  line-height: 1.55;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
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
    padding-top: 4.1rem;
    padding-bottom: 1.25rem;
  }

  .hero-card-slot {
    position: relative;
    bottom: auto;
    padding: 0 0.75rem;
  }

  .owner-card {
    width: min(96%, 1120px);
    padding: 1.12rem;
  }

  .owner-name {
    font-size: 1.65rem;
  }

  .blog-shell {
    padding: 4.2rem 0.65rem 5rem;
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
    min-height: 22.5rem;
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
    padding: 0.1rem 0.55rem 4.8rem;
  }

  .project-heading {
    align-items: flex-start;
    flex-direction: column;
    gap: 0.42rem;
    margin-bottom: 1rem;
  }

  .project-card {
    grid-template-columns: 3.2rem 1fr;
    gap: 0.72rem;
    padding: 0.85rem 0.9rem;
  }

  .project-icon {
    width: 2.7rem;
    height: 2.7rem;
  }

  .project-card-title {
    font-size: 1rem;
  }

  .content-fade {
    min-height: 96vh;
  }
}
</style>
