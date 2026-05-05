<script setup lang="ts">
import MarkdownIt from "markdown-it";
import { installMarkdownExternalLinkRule, resolveSiteHostname } from "~/utils/link";

const route = useRoute();
const requestUrl = useRequestURL();
const { settings } = useSiteSettings();
const DISPLAY_TIME_ZONE = "Asia/Shanghai";

const projectId = computed(() => String(route.params.id ?? "").trim());
const { project, pending, error } = useProjectDetail(projectId);
const siteHostname = computed(() =>
  resolveSiteHostname(settings.value.siteUrl, `${requestUrl.protocol}//${requestUrl.host}`),
);

watchEffect(() => {
  if (!error.value) return;
  throw createError({
    statusCode: Number((error.value as any).statusCode || 404),
    statusMessage: (error.value as any).statusMessage || "项目不存在",
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
    timeZone: DISPLAY_TIME_ZONE,
  }).format(date);
}

function isExternalUrl(value: string) {
  return /^https?:\/\//i.test(String(value || "").trim());
}

const canonicalUrl = computed(() => {
  const path = projectId.value ? `/project/${encodeURIComponent(projectId.value)}` : "/project";
  return `${siteBaseUrl.value}${path}`;
});
const seoDescription = computed(() => {
  const source = compactText(String(project.value?.content || project.value?.summary || ""));
  return source.slice(0, 160) || settings.value.siteDesc;
});
const ogImage = computed(() => {
  const cover = String(project.value?.icon || settings.value.userHeadpic || "").trim();
  return toAbsoluteUrl(cover);
});
const projectSchema = computed(() => {
  if (!project.value) return null;
  return {
    "@context": "https://schema.org",
    "@type": "CreativeWork",
    name: project.value.title,
    description: seoDescription.value,
    url: canonicalUrl.value,
    image: ogImage.value || undefined,
    dateModified: project.value.updatedAt,
    keywords: project.value.techStack.join(", "),
  };
});

useHead(() => ({
  title: `${project.value?.title || "项目"} - ${settings.value.siteTitle}`,
  link: [{ rel: "canonical", href: canonicalUrl.value }],
  meta: [
    { name: "description", content: seoDescription.value },
    { property: "og:type", content: "article" },
    { property: "og:title", content: `${project.value?.title || "项目"} - ${settings.value.siteTitle}` },
    { property: "og:description", content: seoDescription.value },
    { property: "og:url", content: canonicalUrl.value },
    { property: "og:image", content: ogImage.value },
  ],
  script: projectSchema.value
    ? [
        {
          type: "application/ld+json",
          key: "project-detail-schema",
          children: JSON.stringify(projectSchema.value),
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

const renderedContent = computed(() => markdown.render(project.value?.content || "暂无项目详情。"));
</script>

<template>
  <div class="project-detail-page">
    <main class="project-detail-shell">
      <section v-if="project" class="project-detail-card">
        <NuxtLink to="/project" class="project-back-link">
          返回项目列表
        </NuxtLink>

        <header class="project-detail-head">
          <img :src="project.icon" :alt="`${project.title} 封面`" class="project-detail-cover" />

          <div class="project-detail-meta">
            <span class="project-detail-category">{{ project.category || "未分类" }}</span>
            <h1>{{ project.title }}</h1>
            <p class="project-detail-summary">{{ project.summary }}</p>

            <div v-if="project.techStack.length" class="project-detail-tech">
              <span v-for="tech in project.techStack" :key="`${project.id}-${tech}`">{{ tech }}</span>
            </div>

            <div class="project-detail-info">
              <time :datetime="project.updatedAt">更新于 {{ formatDate(project.updatedAt) }}</time>
            </div>

            <div class="project-detail-actions">
              <a
                v-if="project.projectUrl"
                :href="project.projectUrl"
                class="project-action-link"
                :target="isExternalUrl(project.projectUrl) ? '_blank' : undefined"
                :rel="isExternalUrl(project.projectUrl) ? 'noopener noreferrer' : undefined"
              >
                项目链接
              </a>
              <a
                v-if="project.githubUrl"
                :href="project.githubUrl"
                class="project-action-link"
                :target="isExternalUrl(project.githubUrl) ? '_blank' : undefined"
                :rel="isExternalUrl(project.githubUrl) ? 'noopener noreferrer' : undefined"
              >
                GitHub
              </a>
            </div>
          </div>
        </header>

        <article class="project-detail-content" v-html="renderedContent" />

        <section class="project-detail-comments">
          <header class="project-comment-head">
            <h2>项目评论</h2>
            <p>可以在这里讨论实现、设计和使用体验。</p>
          </header>

          <CommentSection
            target-type="project"
            :target-id="Number(project.id)"
          />
        </section>
      </section>

      <section v-else class="project-detail-card">
        <p>{{ pending ? "项目加载中..." : "项目不存在或已下线。" }}</p>
      </section>
    </main>
  </div>
</template>

<style scoped>
.project-detail-page {
  min-height: 100vh;
  padding: 6.2rem 1rem 2.4rem;
  color: var(--theme-text);
}

.project-detail-shell {
  width: min(var(--site-content-width), 70rem);
  margin: 0 auto;
}

.project-detail-card {
  padding: 1.2rem;
  border-radius: 1.2rem;
  border: 1px solid rgba(153, 201, 225, 0.22);
  background:
    radial-gradient(circle at 88% 14%, rgba(80, 161, 201, 0.18), transparent 38%),
    linear-gradient(160deg, rgba(9, 18, 37, 0.94), rgba(10, 19, 35, 0.84));
}

.project-back-link {
  display: inline-flex;
  margin-bottom: 1rem;
  color: rgba(198, 221, 239, 0.88);
  text-decoration: none;
}

.project-detail-head {
  display: grid;
  grid-template-columns: minmax(15rem, 20rem) 1fr;
  gap: 1.2rem;
}

.project-detail-cover {
  width: 100%;
  border-radius: 1rem;
  aspect-ratio: 1.15 / 1;
  object-fit: cover;
}

.project-detail-meta {
  display: grid;
  gap: 0.85rem;
  min-width: 0;
}

.project-detail-category {
  width: fit-content;
  padding: 0.28rem 0.7rem;
  border-radius: 999px;
  background: rgba(147, 191, 216, 0.14);
  color: rgba(212, 231, 244, 0.9);
}

.project-detail-meta h1 {
  margin: 0;
  font-size: clamp(2rem, 4vw, 3rem);
  line-height: 1.02;
}

.project-detail-summary {
  margin: 0;
  color: rgba(203, 219, 233, 0.88);
  line-height: 1.8;
}

.project-detail-tech {
  display: flex;
  flex-wrap: wrap;
  gap: 0.6rem;
}

.project-detail-tech span {
  padding: 0.33rem 0.72rem;
  border-radius: 999px;
  border: 1px solid rgba(158, 205, 227, 0.22);
  background: rgba(255, 255, 255, 0.04);
}

.project-detail-info {
  color: rgba(173, 197, 217, 0.82);
  font-size: 0.92rem;
}

.project-detail-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.project-action-link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 2.6rem;
  padding: 0 1rem;
  border-radius: 0.9rem;
  text-decoration: none;
  color: rgba(239, 247, 255, 0.96);
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(157, 202, 225, 0.24);
}

.project-detail-content {
  margin-top: 1.2rem;
  color: rgba(223, 235, 245, 0.94);
  line-height: 1.9;
}

.project-detail-content :deep(*) {
  max-width: 100%;
}

.project-detail-content :deep(pre) {
  overflow-x: auto;
  padding: 0.95rem 1rem;
  border-radius: 0.95rem;
  background: rgba(0, 0, 0, 0.24);
}

.project-detail-content :deep(code) {
  font-family: "JetBrains Mono", "Fira Code", monospace;
}

.project-detail-comments {
  margin-top: 1.4rem;
}

.project-comment-head {
  margin-bottom: 0.8rem;
}

.project-comment-head h2 {
  margin: 0 0 0.35rem;
  font-size: 1.25rem;
}

.project-comment-head p {
  margin: 0;
  color: rgba(195, 214, 228, 0.76);
}

@media (max-width: 800px) {
  .project-detail-head {
    grid-template-columns: 1fr;
  }
}
</style>
