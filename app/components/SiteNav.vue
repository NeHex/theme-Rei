<script setup lang="ts">
const route = useRoute();
const { settings } = useSiteSettings();

const isHome = computed(() => route.path === "/");
const isArticle = computed(() => route.path.startsWith("/article"));
const isAlbum = computed(() => route.path.startsWith("/album"));
const isArchive = computed(() => route.path.startsWith("/archive"));

const avatarSrc = computed(() => settings.value.userHeadpic || "/images/head.jpg");
const avatarAlt = computed(() => `${settings.value.userName || "站长"}头像`);
const feedHref = computed(
  () => settings.value.userSocialLink.feed || settings.value.userSocialLink.rss || "/feed.xml",
);
const dropdownLinks = computed(() => settings.value.themeNav);

function isExternalLink(url: string) {
  return /^https?:\/\//.test(url) || url.startsWith("mailto:");
}
</script>

<template>
  <header :key="route.fullPath" class="floating-nav-wrap">
    <nav class="floating-nav">
      <div class="nav-main">
        <NuxtLink to="/" class="nav-avatar-link" aria-label="返回首页">
          <img class="nav-avatar" :src="avatarSrc" :alt="avatarAlt" />
        </NuxtLink>

        <NuxtLink to="/" class="nav-link" :class="{ active: isHome }">首页</NuxtLink>
        <NuxtLink to="/article" class="nav-link" :class="{ active: isArticle }">文章</NuxtLink>
        <NuxtLink to="/album" class="nav-link" :class="{ active: isAlbum }">相册</NuxtLink>
        <NuxtLink to="/archive" class="nav-link" :class="{ active: isArchive }">归档</NuxtLink>

        <div class="nav-dropdown">
          <button type="button" class="nav-link nav-link-more" aria-haspopup="true">
            更多
            <svg class="nav-caret" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M6.5 9.5L12 15L17.5 9.5" />
            </svg>
          </button>
          <div class="dropdown-menu">
            <template v-for="item in dropdownLinks" :key="`${item.label}-${item.to}`">
              <a
                v-if="isExternalLink(item.to)"
                :href="item.to"
                class="dropdown-link"
                target="_blank"
                rel="noopener noreferrer"
              >
                {{ item.label }}
              </a>
              <NuxtLink v-else :to="item.to" class="dropdown-link">
                {{ item.label }}
              </NuxtLink>
            </template>
          </div>
        </div>
      </div>

      <a
        :href="feedHref"
        class="feed-link"
        aria-label="Feed RSS"
        :target="isExternalLink(feedHref) ? '_blank' : undefined"
        :rel="isExternalLink(feedHref) ? 'noopener noreferrer' : undefined"
      >
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M4 18a2 2 0 1 0 0 4a2 2 0 0 0 0-4Z" />
          <path d="M4 10a10 10 0 0 1 10 10" />
          <path d="M4 4a16 16 0 0 1 16 16" />
        </svg>
      </a>
    </nav>
  </header>
</template>

<style scoped>
.floating-nav-wrap {
  position: fixed;
  top: 1.65rem;
  left: 50%;
  transform: translateX(-50%);
  z-index: 90;
  animation: nav-rise-in 720ms cubic-bezier(0.2, 0.86, 0.24, 1) both;
}

.floating-nav {
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  padding: 0.62rem 1rem 0.62rem 0.72rem;
  background: rgba(4, 36, 70, 0.8);
  backdrop-filter: blur(14px);
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.45);
  transition: box-shadow 0.22s ease, background 0.22s ease;
}

.floating-nav:hover {
  background: rgba(6, 46, 86, 0.84);
  box-shadow: 0 14px 42px rgba(0, 0, 0, 0.56);
}

.nav-main {
  display: inline-flex;
  align-items: center;
  gap: 0.24rem;
}

.nav-avatar-link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-right: 0.52rem;
}

.nav-avatar {
  width: 2.74rem;
  height: 2.74rem;
  display: block;
  border-radius: 999px;
}

.nav-link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 3.4rem;
  border-radius: 999px;
  padding: 0.62rem 0.98rem;
  color: var(--theme-text);
  text-decoration: none;
  font-size: 1rem;
  line-height: 1;
  font-weight: 600;
  letter-spacing: 0.01em;
  transition: all 0.18s ease;
}

.nav-link:hover {
  background: rgba(255, 255, 255, 0.14);
  color: #ffffff;
}

.nav-link.active {
  background: rgba(255, 255, 255, 0.2);
  color: #ffffff;
}

.nav-dropdown {
  position: relative;
  --dropdown-gap: 0.4rem;
}

.nav-dropdown::after {
  content: "";
  position: absolute;
  left: 50%;
  top: 100%;
  transform: translateX(-50%);
  width: max(100%, 8.6rem);
  height: calc(var(--dropdown-gap) + 0.2rem);
}

.nav-link-more {
  border: 0;
  cursor: pointer;
  font-family: inherit;
  background: transparent;
}

.nav-caret {
  width: 0.86rem;
  height: 0.86rem;
  margin-left: 0.28rem;
  transition: transform 0.2s ease;
}

.nav-caret path {
  stroke: currentColor;
  stroke-width: 1.8;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.dropdown-menu {
  position: absolute;
  left: 50%;
  top: calc(100% + var(--dropdown-gap));
  transform: translateX(-50%) translateY(-0.35rem);
  min-width: 7.2rem;
  padding: 0.38rem;
  border-radius: 0.62rem;
  border: 1px solid rgba(166, 215, 255, 0.24);
  background: rgba(4, 36, 70, 0.94);
  box-shadow: 0 14px 34px rgba(0, 0, 0, 0.45);
  backdrop-filter: blur(12px);
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
  transition: all 0.2s ease;
}

.dropdown-link {
  display: block;
  border-radius: 0.42rem;
  padding: 0.46rem 0.58rem;
  text-decoration: none;
  white-space: nowrap;
  color: var(--theme-text);
  font-size: var(--fs-small);
  font-weight: 600;
}

.dropdown-link:hover {
  background: rgba(255, 255, 255, 0.14);
  color: #ffffff;
}

.nav-dropdown:hover .dropdown-menu,
.nav-dropdown:focus-within .dropdown-menu {
  opacity: 1;
  visibility: visible;
  pointer-events: auto;
  transform: translateX(-50%) translateY(0);
}

.nav-dropdown:hover .nav-caret,
.nav-dropdown:focus-within .nav-caret {
  transform: rotate(180deg);
}

.feed-link {
  width: 2.72rem;
  height: 2.72rem;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.08);
  color: rgba(241, 247, 255, 0.92);
}

.feed-link svg {
  width: 1.22rem;
  height: 1.22rem;
}

.feed-link path {
  stroke: currentColor;
  stroke-width: 1.85;
  stroke-linecap: round;
  stroke-linejoin: round;
}

@keyframes nav-rise-in {
  from {
    opacity: 0;
    transform: translate(-50%, 2rem);
  }

  to {
    opacity: 1;
    transform: translate(-50%, 0);
  }
}

@media (max-width: 760px) {
  .floating-nav {
    gap: 0.35rem;
    padding: 0.34rem 0.5rem;
  }

  .nav-avatar-link {
    margin-right: 0.2rem;
  }

  .nav-avatar {
    width: 1.92rem;
    height: 1.92rem;
  }

  .nav-link {
    min-width: auto;
    padding: 0.38rem 0.54rem;
    font-size: 0.75rem;
  }

  .feed-link {
    width: 1.92rem;
    height: 1.92rem;
  }

  .dropdown-menu {
    left: auto;
    right: 0;
    transform: translateY(-0.35rem);
  }

  .nav-dropdown::after {
    left: auto;
    right: 0;
    width: 8.6rem;
    transform: none;
  }

  .nav-dropdown:hover .dropdown-menu,
  .nav-dropdown:focus-within .dropdown-menu {
    transform: translateY(0);
  }
}
</style>
