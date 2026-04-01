<script setup lang="ts">
const route = useRoute();

const isHome = computed(() => route.path === "/");
const isArticle = computed(() => route.path.startsWith("/article"));
const isAlbum = computed(() => route.path.startsWith("/album"));
</script>

<template>
  <header class="floating-nav-wrap">
    <nav class="floating-nav">
      <div class="nav-main">
        <NuxtLink to="/" aria-label="Go home">
          <img class="nav-avatar" src="/images/head.jpg" alt="Site owner avatar" />
        </NuxtLink>

        <NuxtLink to="/" class="nav-link" :class="{ active: isHome }">首页</NuxtLink>
        <NuxtLink to="/article" class="nav-link" :class="{ active: isArticle }">文章</NuxtLink>
        <NuxtLink to="/album" class="nav-link" :class="{ active: isAlbum }">相册</NuxtLink>
        <NuxtLink to="/#journal" class="nav-link">归档</NuxtLink>

        <div class="nav-dropdown">
          <button type="button" class="nav-link nav-link-more" aria-haspopup="true">
            更多
            <svg class="nav-caret" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M6.5 9.5L12 15L17.5 9.5" />
            </svg>
          </button>
          <div class="dropdown-menu">
            <NuxtLink to="/about" class="dropdown-link">关于</NuxtLink>
            <NuxtLink to="/friends" class="dropdown-link">友联</NuxtLink>
          </div>
        </div>
      </div>

      <a href="#" class="feed-link" aria-label="Feed RSS">
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
}

.floating-nav {
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  padding: 0.52rem 0.78rem 0.52rem 0.56rem;
  background: rgba(4, 36, 70, 0.76);
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
  gap: 0.18rem;
}

.nav-avatar {
  width: 2.38rem;
  height: 2.38rem;
  border-radius: 999px;
  margin-right: 0.41rem;
}

.nav-link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 3rem;
  border-radius: 999px;
  padding: 0.54rem 0.86rem;
  color: rgba(231, 243, 255, 0.9);
  text-decoration: none;
  font-size: 0.95rem;
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
  color: rgba(231, 243, 255, 0.9);
  font-size: 0.85rem;
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
  width: 2.32rem;
  height: 2.32rem;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.08);
  color: rgba(241, 247, 255, 0.92);
}

.feed-link svg {
  width: 1.1rem;
  height: 1.1rem;
}

.feed-link path {
  stroke: currentColor;
  stroke-width: 1.85;
  stroke-linecap: round;
  stroke-linejoin: round;
}

@media (max-width: 760px) {
  .floating-nav {
    gap: 0.35rem;
    padding: 0.3rem 0.42rem;
  }

  .nav-avatar {
    width: 1.75rem;
    height: 1.75rem;
    margin-right: 0.12rem;
  }

  .nav-link {
    min-width: auto;
    padding: 0.34rem 0.48rem;
    font-size: 0.72rem;
  }

  .feed-link {
    width: 1.75rem;
    height: 1.75rem;
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

