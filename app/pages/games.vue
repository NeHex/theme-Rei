<script setup lang="ts">
const { settings } = useSiteSettings();
const requestUrl = useRequestURL();

const siteBaseUrl = computed(() => {
  const configured = String(settings.value.siteUrl || "").trim();
  if (configured) return configured.replace(/\/+$/, "");
  return `${requestUrl.protocol}//${requestUrl.host}`;
});
const canonicalUrl = computed(() => `${siteBaseUrl.value}/games`);
const seoDescription = computed(() => `游戏相关内容与记录 - ${settings.value.siteDesc}`);
const ogImage = computed(() => {
  const input = String(settings.value.userHeadpic || "/images/head.jpg").trim();
  if (!input) return "";
  if (/^https?:\/\//i.test(input)) return input;
  return `${siteBaseUrl.value}${input.startsWith("/") ? input : `/${input}`}`;
});
const gamesSchema = computed(() => ({
  "@context": "https://schema.org",
  "@type": "WebPage",
  name: `游戏室 - ${settings.value.siteTitle}`,
  description: seoDescription.value,
  url: canonicalUrl.value,
}));

useHead(() => ({
  title: `游戏室 - ${settings.value.siteTitle}`,
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
      content: `游戏室 - ${settings.value.siteTitle}`,
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
      key: "games-schema",
      children: JSON.stringify(gamesSchema.value),
    },
  ],
}));
</script>

<template>
  <div class="simple-page">
    <main class="simple-main">
      <section class="simple-card">
        <h1>游戏室</h1>
        <p>这里是游戏相关内容模块，页面已预留，后续可以接入你的数据。</p>
      </section>
    </main>
  </div>
</template>

<style scoped>
.simple-page {
  min-height: 100vh;
  padding: 6.3rem 1rem 2.2rem;
  color: var(--theme-text);
}

.simple-main {
  width: var(--site-content-width);
  margin: 0 auto;
}

.simple-card {
  padding: 1.25rem 1.3rem;
  border-radius: 1rem;
  border: 1px solid var(--theme-border);
  background: var(--theme-surface);
  backdrop-filter: blur(8px);
}

h1 {
  margin: 0 0 0.7rem;
  font-size: var(--fs-h1);
  line-height: 1.1;
}

p {
  margin: 0;
  line-height: 1.75;
  color: var(--theme-text-soft);
}
</style>
