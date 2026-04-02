<script setup lang="ts">
const { settings } = useSiteSettings();
const currentYear = new Date().getFullYear();

const startYear = computed(() => {
  const match = settings.value.siteCreateTime.match(/(19|20)\d{2}/);
  return match ? Number(match[0]) : currentYear;
});

const copyrightText = computed(() => {
  if (startYear.value >= currentYear) return `© ${currentYear} ${settings.value.siteTitle}`;
  return `© ${startYear.value}-${currentYear} ${settings.value.siteTitle}`;
});

const contactLinks = computed(() => {
  const links = settings.value.userSocialLink;
  return [
    { label: "GitHub", href: links.github || "" },
    { label: "Bilibili", href: links.bilibili || "" },
    { label: "Steam", href: links.steam || "" },
    { label: "邮箱", href: links.email || "" },
    { label: "RSS", href: links.feed || links.rss || "" },
  ].filter((item) => Boolean(item.href));
});

function isExternalLink(url: string) {
  return /^https?:\/\//.test(url) || url.startsWith("mailto:");
}
</script>

<template>
  <footer class="site-footer">
    <div class="footer-shell">
      <section class="footer-top">
        <div class="footer-brand">
          <h3 class="brand-title">{{ settings.siteTitle }}</h3>
          <p class="brand-motto">{{ settings.siteDesc }}</p>
          <p class="brand-copy">{{ copyrightText }} Powered By <a href="https://github.com/nehex" target="blank">NeHex</a>&<a href="https://github.com/NeHex/theme-nehex" target="blank">NeHex Theme</a></p>
        </div>

        <nav class="footer-col" aria-label="快捷导航">
          <h4>快捷导航</h4>
          <NuxtLink to="/">首页</NuxtLink>
          <NuxtLink to="/article">文章</NuxtLink>
          <NuxtLink to="/album">相册</NuxtLink>
          <NuxtLink to="/archive">归档</NuxtLink>
        </nav>

        <nav class="footer-col" aria-label="更多链接">
          <h4>更多</h4>
          <template v-for="item in settings.themeNav" :key="`${item.label}-${item.to}`">
            <a
              v-if="isExternalLink(item.to)"
              :href="item.to"
              target="_blank"
              rel="noopener noreferrer"
            >
              {{ item.label }}
            </a>
            <NuxtLink v-else :to="item.to">
              {{ item.label }}
            </NuxtLink>
          </template>
        </nav>

        <nav class="footer-col" aria-label="联系我">
          <h4>联系我</h4>
          <a
            v-for="item in contactLinks"
            :key="item.label"
            :href="item.href"
            :target="isExternalLink(item.href) ? '_blank' : undefined"
            :rel="isExternalLink(item.href) ? 'noopener noreferrer' : undefined"
          >
            {{ item.label }}
          </a>
        </nav>
      </section>

      <section class="footer-bottom">
        <p class="bottom-left">{{ settings.siteUrl }}</p>
        <p class="bottom-right">{{ settings.siteIcp }}</p>
      </section>
    </div>
  </footer>
</template>

<style scoped>
.site-footer {
  position: relative;
  padding: 0.5rem 0 max(0.35rem, env(safe-area-inset-bottom));
  background: #030714;
  overflow: hidden;
}

.footer-shell {
  width: var(--site-max-width);
  margin: 0 auto;
  padding: 0 1rem;
}

.footer-top {
  display: grid;
  grid-template-columns: 1.9fr 0.8fr 0.8fr 0.8fr;
  gap: 2.1rem;
  padding: 0.85rem 0 1rem;
}

.footer-brand {
  min-width: 0;
}

.brand-title {
  margin: 0;
  font-size: 1.42rem;
  color: rgba(236, 246, 255, 0.96);
}

.brand-motto {
  margin: 0.46rem 0 0;
  color: rgba(199, 216, 235, 0.9);
  font-size: 0.86rem;
  line-height: 1.7;
}

.brand-copy {
  margin: 0.56rem 0 0;
  color: rgba(155, 179, 203, 0.82);
  font-size: 0.82rem;
}

.footer-col {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
}

.footer-col h4 {
  margin: 0;
  font-size: 0.78rem;
  color: rgba(200, 219, 239, 0.66);
  font-weight: 600;
}

.footer-col a {
  width: fit-content;
  color: rgba(219, 233, 247, 0.92);
  text-decoration: none;
  font-size: 0.82rem;
}

.footer-col a:hover {
  color: #ffffff;
}

.footer-bottom {
  margin-top: 0.15rem;
  border-top: 1px solid rgba(118, 170, 194, 0.16);
  padding: 0.72rem 0 0.08rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.95rem;
}

.bottom-left,
.bottom-right {
  margin: 0;
  color: rgba(147, 172, 196, 0.72);
  font-size: 0.75rem;
}

.bottom-right {
  white-space: nowrap;
}

@media (max-width: 980px) {
  .footer-top {
    grid-template-columns: 1fr 1fr;
    gap: 1.3rem;
  }
}

@media (max-width: 760px) {
  .site-footer {
    padding-top: 0.5rem;
  }

  .footer-shell {
    width: min(96%, 1560px);
    padding: 0;
  }

  .footer-top {
    grid-template-columns: 1fr;
    gap: 1rem;
    padding-bottom: 0.85rem;
  }

  .footer-bottom {
    padding-top: 0.66rem;
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
