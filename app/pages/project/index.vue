<script setup lang="ts">
const requestUrl = useRequestURL();
const { settings } = useSiteSettings();
const { projects, pending, error } = useProjects();
const DISPLAY_TIME_ZONE = "Asia/Shanghai";

const siteBaseUrl = computed(() => {
  const configured = String(settings.value.siteUrl || "").trim();
  if (configured) return configured.replace(/\/+$/, "");
  return `${requestUrl.protocol}//${requestUrl.host}`;
});
const canonicalUrl = computed(() => `${siteBaseUrl.value}/project`);
const seoDescription = computed(() => `项目列表与作品集 - ${settings.value.siteDesc}`);
const ogImage = computed(() => {
  const input = String(settings.value.userHeadpic || "/images/head.jpg").trim();
  if (!input) return "";
  if (/^https?:\/\//i.test(input)) return input;
  return `${siteBaseUrl.value}${input.startsWith("/") ? input : `/${input}`}`;
});
const pageSchema = computed(() => ({
  "@context": "https://schema.org",
  "@type": "CollectionPage",
  name: `项目 - ${settings.value.siteTitle}`,
  description: seoDescription.value,
  url: canonicalUrl.value,
}));

useHead(() => ({
  title: `项目 - ${settings.value.siteTitle}`,
  link: [{ rel: "canonical", href: canonicalUrl.value }],
  meta: [
    { name: "description", content: seoDescription.value },
    { property: "og:type", content: "website" },
    { property: "og:title", content: `项目 - ${settings.value.siteTitle}` },
    { property: "og:description", content: seoDescription.value },
    { property: "og:url", content: canonicalUrl.value },
    { property: "og:image", content: ogImage.value },
  ],
  script: [
    {
      type: "application/ld+json",
      key: "project-list-schema",
      children: JSON.stringify(pageSchema.value),
    },
  ],
}));

watchEffect(() => {
  if (!error.value) return;
  throw createError({
    statusCode: Number((error.value as any).statusCode || 500),
    statusMessage: (error.value as any).statusMessage || "Project Load Failed",
  });
});

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: DISPLAY_TIME_ZONE,
  }).format(date);
}

function isExternalUrl(value: string) {
  return /^https?:\/\//i.test(String(value || "").trim());
}
</script>

<template>
  <div class="project-page">
    <main class="project-shell">
      <header class="project-head">
        <p class="project-caption">PROJECT ARCHIVE</p>
        <h1>项目</h1>
        <p>这里收纳完整的项目条目、简介、技术栈和外部链接。</p>
      </header>

      <p v-if="pending" class="project-state">项目列表加载中…</p>

      <section v-else-if="projects.length" class="project-grid">
        <article v-for="item in projects" :key="item.id" class="project-card">
          <NuxtLink :to="`/project/${encodeURIComponent(item.id)}`" class="project-cover-link">
            <img :src="item.icon" :alt="item.title" class="project-cover" />
          </NuxtLink>

          <div class="project-card-body">
            <div class="project-card-top">
              <span class="project-category">{{ item.category || "未分类" }}</span>
              <time :datetime="item.updatedAt">{{ formatDate(item.updatedAt) }}</time>
            </div>

            <h2>
              <NuxtLink :to="`/project/${encodeURIComponent(item.id)}`" class="project-title-link">
                {{ item.title }}
              </NuxtLink>
            </h2>
            <p class="project-summary">{{ item.summary }}</p>

            <div v-if="item.techStack.length" class="project-tech-list">
              <span v-for="tech in item.techStack" :key="`${item.id}-${tech}`">{{ tech }}</span>
            </div>

            <div class="project-actions">
              <NuxtLink :to="`/project/${encodeURIComponent(item.id)}`" class="project-link project-link-primary">
                查看详情
              </NuxtLink>
              <a
                v-if="item.projectUrl"
                :href="item.projectUrl"
                class="project-link"
                :target="isExternalUrl(item.projectUrl) ? '_blank' : undefined"
                :rel="isExternalUrl(item.projectUrl) ? 'noopener noreferrer' : undefined"
              >
                项目链接
              </a>
              <a
                v-if="item.githubUrl"
                :href="item.githubUrl"
                class="project-link"
                :target="isExternalUrl(item.githubUrl) ? '_blank' : undefined"
                :rel="isExternalUrl(item.githubUrl) ? 'noopener noreferrer' : undefined"
              >
                GitHub
              </a>
            </div>
          </div>
        </article>
      </section>

      <section v-else class="project-empty">
        <p>暂时还没有项目内容。</p>
      </section>
    </main>
  </div>
</template>

<style scoped>
.project-page {
  min-height: 100vh;
  padding: 6.2rem 1rem 2.4rem;
  color: var(--theme-text);
}

.project-shell {
  width: min(var(--site-max-width), 76rem);
  margin: 0 auto;
  display: grid;
  gap: 1rem;
}

.project-head {
  padding: 1.25rem 1.35rem;
  border-radius: 1.2rem;
  border: 1px solid rgba(158, 208, 228, 0.24);
  background:
    radial-gradient(circle at 84% 18%, rgba(65, 160, 199, 0.24), transparent 42%),
    linear-gradient(160deg, rgba(9, 18, 37, 0.94), rgba(8, 15, 30, 0.82));
}

.project-caption {
  margin: 0 0 0.45rem;
  color: rgba(142, 189, 214, 0.88);
  font-size: 0.8rem;
  letter-spacing: 0.24em;
}

.project-head h1 {
  margin: 0;
  font-size: clamp(2rem, 4vw, 3.2rem);
  line-height: 1;
}

.project-head p:last-child {
  margin: 0.7rem 0 0;
  max-width: 38rem;
  color: rgba(198, 216, 229, 0.84);
  line-height: 1.8;
}

.project-state,
.project-empty {
  margin: 0;
  padding: 1.1rem 1.2rem;
  border-radius: 1rem;
  border: 1px solid var(--theme-border);
  background: var(--theme-surface);
}

.project-grid {
  display: grid;
  gap: 1rem;
}

.project-card {
  display: grid;
  grid-template-columns: minmax(13rem, 18rem) 1fr;
  gap: 1rem;
  padding: 1rem;
  border-radius: 1.2rem;
  border: 1px solid rgba(152, 197, 221, 0.22);
  background:
    linear-gradient(145deg, rgba(10, 18, 35, 0.94), rgba(12, 24, 43, 0.84));
  box-shadow: 0 18px 48px rgba(0, 0, 0, 0.2);
}

.project-cover-link {
  display: block;
  border-radius: 0.95rem;
  overflow: hidden;
}

.project-cover {
  display: block;
  width: 100%;
  aspect-ratio: 1.25 / 1;
  object-fit: cover;
}

.project-card-body {
  display: grid;
  gap: 0.8rem;
  min-width: 0;
}

.project-card-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.8rem;
  color: rgba(176, 199, 217, 0.8);
  font-size: 0.86rem;
}

.project-category {
  display: inline-flex;
  align-items: center;
  padding: 0.25rem 0.65rem;
  border-radius: 999px;
  background: rgba(126, 180, 215, 0.12);
}

.project-card-body h2 {
  margin: 0;
  font-size: 1.5rem;
}

.project-title-link {
  color: inherit;
  text-decoration: none;
}

.project-title-link:hover {
  text-decoration: underline;
}

.project-summary {
  margin: 0;
  color: rgba(208, 221, 235, 0.86);
  line-height: 1.8;
}

.project-tech-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.55rem;
}

.project-tech-list span {
  padding: 0.32rem 0.68rem;
  border-radius: 999px;
  border: 1px solid rgba(162, 207, 231, 0.22);
  color: rgba(213, 231, 244, 0.88);
  background: rgba(255, 255, 255, 0.04);
  font-size: 0.86rem;
}

.project-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.7rem;
}

.project-link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 2.55rem;
  padding: 0 1rem;
  border-radius: 0.85rem;
  border: 1px solid rgba(162, 207, 231, 0.24);
  color: rgba(235, 244, 255, 0.94);
  text-decoration: none;
  background: rgba(255, 255, 255, 0.04);
}

.project-link-primary {
  background: linear-gradient(135deg, rgba(76, 165, 209, 0.3), rgba(58, 106, 164, 0.22));
}

@media (max-width: 800px) {
  .project-card {
    grid-template-columns: 1fr;
  }
}
</style>
