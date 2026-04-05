<script setup lang="ts">
const route = useRoute();
const { settings } = useSiteSettings();
const { pages: singlePages } = useSinglePages();

const isHome = computed(() => route.path === "/");
const isArticle = computed(() => route.path.startsWith("/article"));
const isAlbum = computed(() => route.path.startsWith("/album"));
const isArchive = computed(() => route.path.startsWith("/archive"));

const avatarSrc = computed(() => settings.value.userHeadpic || "/images/head.jpg");
const avatarAlt = computed(() => `${settings.value.userName || "站长"}头像`);
const feedHref = computed(() => {
  const candidate = settings.value.userSocialLink.feed || settings.value.userSocialLink.rss || "/feed";
  if (candidate.trim().replace(/\/+$/, "") === "/feed.xml") return "/feed";
  return candidate;
});

const dropdownLinks = computed(() => settings.value.themeNav);
const homeDropdownLinks = computed(() =>
  singlePages.value.map((page) => ({ label: page.title, to: page.to })),
);

const hoveredHomeIndex = ref(-1);
const hoveredMoreIndex = ref(-1);
const isMobileMenuOpen = ref(false);
const isMobileHomeSubmenuOpen = ref(false);
const isMobileMoreSubmenuOpen = ref(false);

function isExternalLink(url: string) {
  return /^https?:\/\//.test(url) || url.startsWith("mailto:");
}

function normalizeRouteKey(url: string) {
  return url.trim().toLowerCase().replace(/\/+$/, "") || "/";
}

function openHomeMenu() {
  if (!homeDropdownLinks.value.length) return;
  hoveredHomeIndex.value = 0;
}

function closeHomeMenu() {
  hoveredHomeIndex.value = -1;
}

function focusHomeItem(index: number) {
  hoveredHomeIndex.value = index;
}

function openMoreMenu() {
  if (!dropdownLinks.value.length) return;
  hoveredMoreIndex.value = 0;
}

function closeMoreMenu() {
  hoveredMoreIndex.value = -1;
}

function focusMoreItem(index: number) {
  hoveredMoreIndex.value = index;
}

function isMobileLinkActive(to: string, external: boolean) {
  if (external) return false;
  const current = normalizeRouteKey(route.path);
  const target = normalizeRouteKey(to);
  if (target === "/") return current === "/";
  return current === target || current.startsWith(`${target}/`);
}

function toggleMobileMenu() {
  isMobileMenuOpen.value = !isMobileMenuOpen.value;
}

function closeMobileMenu() {
  isMobileMenuOpen.value = false;
  isMobileHomeSubmenuOpen.value = false;
  isMobileMoreSubmenuOpen.value = false;
}

function toggleMobileHomeSubmenu() {
  isMobileHomeSubmenuOpen.value = !isMobileHomeSubmenuOpen.value;
}

function toggleMobileMoreSubmenu() {
  isMobileMoreSubmenuOpen.value = !isMobileMoreSubmenuOpen.value;
}

watch(
  () => route.fullPath,
  () => {
    closeMobileMenu();
  },
);
</script>

<template>
  <header class="floating-nav-wrap">
    <nav class="floating-nav">
      <div class="nav-main">
        <NuxtLink to="/" class="nav-avatar-link" aria-label="返回首页">
          <img class="nav-avatar" :src="avatarSrc" :alt="avatarAlt" />
        </NuxtLink>

        <div
          v-if="homeDropdownLinks.length"
          class="nav-dropdown nav-home-dropdown"
          @mouseenter="openHomeMenu"
          @mouseleave="closeHomeMenu"
        >
          <NuxtLink to="/" class="nav-link" :class="{ active: isHome }">首页</NuxtLink>

          <div class="dropdown-menu home-dropdown-menu">
            <span
              class="dropdown-active-pill"
              :class="{ 'is-visible': hoveredHomeIndex >= 0 }"
              :style="{ '--pill-index': hoveredHomeIndex }"
              aria-hidden="true"
            />

            <NuxtLink
              v-for="(item, index) in homeDropdownLinks"
              :key="`${item.label}-${item.to}`"
              :to="item.to"
              class="dropdown-link"
              @mouseenter="focusHomeItem(index)"
              @focus="focusHomeItem(index)"
            >
              {{ item.label }}
            </NuxtLink>
          </div>
        </div>

        <NuxtLink v-else to="/" class="nav-link" :class="{ active: isHome }">首页</NuxtLink>

        <NuxtLink to="/article" class="nav-link" :class="{ active: isArticle }">文章</NuxtLink>
        <NuxtLink to="/album" class="nav-link" :class="{ active: isAlbum }">相册</NuxtLink>
        <NuxtLink to="/archive" class="nav-link" :class="{ active: isArchive }">归档</NuxtLink>

        <div
          class="nav-dropdown"
          @mouseenter="openMoreMenu"
          @mouseleave="closeMoreMenu"
        >
          <button type="button" class="nav-link nav-link-more" aria-haspopup="true">
            更多
            <svg class="nav-caret" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M6.5 9.5L12 15L17.5 9.5" />
            </svg>
          </button>
          <div class="dropdown-menu">
            <span
              class="dropdown-active-pill"
              :class="{ 'is-visible': hoveredMoreIndex >= 0 }"
              :style="{ '--pill-index': hoveredMoreIndex }"
              aria-hidden="true"
            />

            <template v-for="(item, index) in dropdownLinks" :key="`${item.label}-${item.to}`">
              <a
                v-if="isExternalLink(item.to)"
                :href="item.to"
                class="dropdown-link"
                target="_blank"
                rel="noopener noreferrer"
                @mouseenter="focusMoreItem(index)"
                @focus="focusMoreItem(index)"
              >
                {{ item.label }}
              </a>
              <NuxtLink
                v-else
                :to="item.to"
                class="dropdown-link"
                @mouseenter="focusMoreItem(index)"
                @focus="focusMoreItem(index)"
              >
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

      <button
        type="button"
        class="mobile-menu-toggle"
        :class="{ active: isMobileMenuOpen }"
        aria-label="打开菜单"
        :aria-expanded="isMobileMenuOpen ? 'true' : 'false'"
        @click="toggleMobileMenu"
      >
        <span />
        <span />
        <span />
      </button>
    </nav>

    <Transition name="mobile-menu-fade">
      <button
        v-if="isMobileMenuOpen"
        type="button"
        class="mobile-menu-backdrop"
        aria-label="关闭菜单"
        @click="closeMobileMenu"
      />
    </Transition>

    <Transition name="mobile-menu-panel">
      <div v-if="isMobileMenuOpen" class="mobile-menu-panel" role="menu">
        <div class="mobile-menu-group">
          <div class="mobile-menu-group-head">
            <NuxtLink
              to="/"
              class="mobile-menu-link"
              :class="{ active: isMobileLinkActive('/', false) }"
              @click="closeMobileMenu"
            >
              首页
            </NuxtLink>
            <button
              v-if="homeDropdownLinks.length"
              type="button"
              class="mobile-submenu-toggle"
              :class="{ active: isMobileHomeSubmenuOpen }"
              aria-label="展开首页子菜单"
              @click="toggleMobileHomeSubmenu"
            >
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M6.5 9.5L12 15L17.5 9.5" />
              </svg>
            </button>
          </div>
          <Transition name="mobile-submenu">
            <div v-if="isMobileHomeSubmenuOpen && homeDropdownLinks.length" class="mobile-submenu">
              <NuxtLink
                v-for="item in homeDropdownLinks"
                :key="`${item.label}-${item.to}`"
                :to="item.to"
                class="mobile-submenu-link"
                :class="{ active: isMobileLinkActive(item.to, false) }"
                @click="closeMobileMenu"
              >
                {{ item.label }}
              </NuxtLink>
            </div>
          </Transition>
        </div>

        <NuxtLink
          to="/article"
          class="mobile-menu-link"
          :class="{ active: isMobileLinkActive('/article', false) }"
          @click="closeMobileMenu"
        >
          文章
        </NuxtLink>
        <NuxtLink
          to="/album"
          class="mobile-menu-link"
          :class="{ active: isMobileLinkActive('/album', false) }"
          @click="closeMobileMenu"
        >
          相册
        </NuxtLink>
        <NuxtLink
          to="/archive"
          class="mobile-menu-link"
          :class="{ active: isMobileLinkActive('/archive', false) }"
          @click="closeMobileMenu"
        >
          归档
        </NuxtLink>

        <div class="mobile-menu-group">
          <div class="mobile-menu-group-head">
            <span class="mobile-menu-link static">更多</span>
            <button
              v-if="dropdownLinks.length"
              type="button"
              class="mobile-submenu-toggle"
              :class="{ active: isMobileMoreSubmenuOpen }"
              aria-label="展开更多子菜单"
              @click="toggleMobileMoreSubmenu"
            >
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M6.5 9.5L12 15L17.5 9.5" />
              </svg>
            </button>
          </div>
          <Transition name="mobile-submenu">
            <div v-if="isMobileMoreSubmenuOpen && dropdownLinks.length" class="mobile-submenu">
              <template v-for="item in dropdownLinks" :key="`${item.label}-${item.to}`">
                <a
                  v-if="isExternalLink(item.to)"
                  :href="item.to"
                  class="mobile-submenu-link"
                  target="_blank"
                  rel="noopener noreferrer"
                  @click="closeMobileMenu"
                >
                  {{ item.label }}
                </a>
                <NuxtLink
                  v-else
                  :to="item.to"
                  class="mobile-submenu-link"
                  :class="{ active: isMobileLinkActive(item.to, false) }"
                  @click="closeMobileMenu"
                >
                  {{ item.label }}
                </NuxtLink>
              </template>
            </div>
          </Transition>
        </div>

        <a
          :href="feedHref"
          class="mobile-menu-link"
          :target="isExternalLink(feedHref) ? '_blank' : undefined"
          :rel="isExternalLink(feedHref) ? 'noopener noreferrer' : undefined"
          @click="closeMobileMenu"
        >
          RSS
        </a>
      </div>
    </Transition>
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
  position: relative;
  z-index: 91;
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
  background-image: none;
  background-size: 0 0;
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
  background-image: none;
  background-size: 0 0;
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
  display: grid;
  --dropdown-item-gap: 0.14rem;
  --dropdown-item-height: 2.56rem;
  gap: var(--dropdown-item-gap);
  padding: 0.38rem;
  border-radius: 0.62rem;
  border: 1px solid rgba(166, 215, 255, 0.24);
  background: rgba(4, 36, 70, 0.94);
  box-shadow: 0 14px 34px rgba(0, 0, 0, 0.45);
  backdrop-filter: blur(12px);
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
  transition: all 0.24s cubic-bezier(0.2, 0.86, 0.24, 1);
}

.home-dropdown-menu {
  min-width: 8.6rem;
}

.dropdown-menu::before {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: linear-gradient(
    145deg,
    rgba(170, 225, 255, 0.14) 0%,
    rgba(89, 167, 217, 0.06) 55%,
    rgba(12, 58, 102, 0.06) 100%
  );
  opacity: 0;
  transition: opacity 0.24s cubic-bezier(0.2, 0.86, 0.24, 1);
  pointer-events: none;
  z-index: 0;
}

.dropdown-active-pill {
  position: absolute;
  left: 0.38rem;
  right: 0.38rem;
  top: calc(
    0.38rem + (var(--pill-index, 0) * (var(--dropdown-item-height) + var(--dropdown-item-gap)))
  );
  height: var(--dropdown-item-height);
  border-radius: 0.42rem;
  background: linear-gradient(140deg, rgba(255, 255, 255, 0.2), rgba(170, 223, 255, 0.14));
  box-shadow: 0 8px 18px rgba(0, 0, 0, 0.2);
  opacity: 0;
  transition:
    top 0.24s cubic-bezier(0.2, 0.86, 0.24, 1),
    opacity 0.2s ease;
  pointer-events: none;
  z-index: 1;
}

.dropdown-active-pill.is-visible {
  opacity: 1;
}

.dropdown-link {
  display: flex;
  align-items: center;
  position: relative;
  z-index: 2;
  height: var(--dropdown-item-height);
  box-sizing: border-box;
  line-height: 1;
  border-radius: 0.42rem;
  padding: 0 0.58rem;
  text-decoration: none;
  white-space: nowrap;
  color: var(--theme-text);
  font-size: var(--fs-small);
  font-weight: 600;
  background-image: none;
  background-size: 0 0;
  transition: color 0.2s ease;
}

.dropdown-link:hover {
  color: #ffffff;
}

.nav-dropdown:hover .dropdown-menu,
.nav-dropdown:focus-within .dropdown-menu {
  opacity: 1;
  visibility: visible;
  pointer-events: auto;
  transform: translateX(-50%) translateY(0);
}

.nav-dropdown:hover .dropdown-menu::before,
.nav-dropdown:focus-within .dropdown-menu::before {
  opacity: 1;
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
  background-image: none;
  background-size: 0 0;
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

.mobile-menu-toggle {
  display: none;
  width: 2.72rem;
  height: 2.72rem;
  border: 0;
  border-radius: 999px;
  padding: 0;
  margin-left: 0.3rem;
  background: rgba(255, 255, 255, 0.08);
  color: rgba(241, 247, 255, 0.92);
  cursor: pointer;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 0.22rem;
}

.mobile-menu-toggle span {
  width: 1rem;
  height: 1.6px;
  border-radius: 999px;
  background: currentColor;
  transition: transform 0.2s ease, opacity 0.2s ease;
}

.mobile-menu-toggle.active span:nth-child(1) {
  transform: translateY(0.38rem) rotate(45deg);
}

.mobile-menu-toggle.active span:nth-child(2) {
  opacity: 0;
}

.mobile-menu-toggle.active span:nth-child(3) {
  transform: translateY(-0.38rem) rotate(-45deg);
}

.mobile-menu-backdrop {
  display: none;
}

.mobile-menu-panel {
  display: none;
}

.mobile-menu-link {
  display: flex;
  align-items: center;
  min-height: 2.48rem;
  border-radius: 0.54rem;
  padding: 0 0.7rem;
  text-decoration: none;
  font-size: 0.92rem;
  line-height: 1;
  font-weight: 600;
  color: rgba(232, 242, 255, 0.92);
  background-image: none;
  background-size: 0 0;
}

.mobile-menu-link.active {
  background: rgba(255, 255, 255, 0.16);
  color: #ffffff;
}

.mobile-menu-link.static {
  background: transparent;
  color: rgba(232, 242, 255, 0.92);
  pointer-events: none;
}

.mobile-menu-group {
  display: grid;
  gap: 0.18rem;
}

.mobile-menu-group-head {
  display: flex;
  align-items: center;
  gap: 0.24rem;
}

.mobile-menu-group-head .mobile-menu-link {
  flex: 1;
}

.mobile-submenu-toggle {
  width: 2.48rem;
  height: 2.48rem;
  border: 0;
  border-radius: 0.54rem;
  background: rgba(255, 255, 255, 0.08);
  color: rgba(232, 242, 255, 0.9);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.mobile-submenu-toggle svg {
  width: 1rem;
  height: 1rem;
}

.mobile-submenu-toggle path {
  stroke: currentColor;
  stroke-width: 1.8;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.mobile-submenu-toggle.active svg {
  transform: rotate(180deg);
}

.mobile-submenu {
  display: grid;
  gap: 0.2rem;
  padding-left: 0.5rem;
}

.mobile-submenu-link {
  display: flex;
  align-items: center;
  min-height: 2.24rem;
  border-radius: 0.5rem;
  padding: 0 0.62rem;
  text-decoration: none;
  font-size: 0.86rem;
  line-height: 1;
  font-weight: 600;
  color: rgba(222, 236, 250, 0.9);
  background-image: none;
  background-size: 0 0;
}

.mobile-submenu-link.active {
  background: rgba(255, 255, 255, 0.14);
  color: #ffffff;
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
  .floating-nav-wrap {
    width: min(94vw, var(--site-max-width));
  }

  .floating-nav {
    width: 100%;
    display: flex;
    justify-content: space-between;
    box-sizing: border-box;
    min-height: 3.8rem;
    gap: 0.5rem;
    padding: 0.68rem 0.72rem;
  }

  .nav-main {
    flex: 1;
    min-width: 0;
  }

  .nav-avatar-link {
    margin-right: 0;
  }

  .nav-avatar {
    width: 3.05rem;
    height: 3.05rem;
  }

  .nav-main > :not(.nav-avatar-link) {
    display: none;
  }

  .feed-link {
    display: none;
  }

  .mobile-menu-toggle {
    display: inline-flex;
    width: 3.05rem;
    height: 3.05rem;
    margin-left: 0.12rem;
    gap: 0.24rem;
  }

  .mobile-menu-toggle span {
    width: 1.22rem;
    height: 1.8px;
  }

  .mobile-menu-toggle.active span:nth-child(1) {
    transform: translateY(0.43rem) rotate(45deg);
  }

  .mobile-menu-toggle.active span:nth-child(3) {
    transform: translateY(-0.43rem) rotate(-45deg);
  }

  .mobile-menu-backdrop {
    position: fixed;
    inset: 6.05rem 0 0;
    z-index: 88;
    border: 0;
    background: rgba(3, 12, 24, 0.38);
  }

  .mobile-menu-panel {
    display: grid;
    position: fixed;
    top: 6.28rem;
    left: 50%;
    transform: translateX(-50%);
    width: min(92vw, 19.5rem);
    z-index: 89;
    gap: 0.24rem;
    padding: 0.5rem;
    border-radius: 0.72rem;
    border: 1px solid rgba(166, 215, 255, 0.24);
    background: rgba(4, 36, 70, 0.95);
    box-shadow: 0 14px 34px rgba(0, 0, 0, 0.45);
    backdrop-filter: blur(12px);
  }

  .mobile-menu-fade-enter-active,
  .mobile-menu-fade-leave-active {
    transition: opacity 0.2s ease;
  }

  .mobile-menu-fade-enter-from,
  .mobile-menu-fade-leave-to {
    opacity: 0;
  }

  .mobile-menu-panel-enter-active,
  .mobile-menu-panel-leave-active {
    transition: all 0.22s cubic-bezier(0.2, 0.86, 0.24, 1);
  }

  .mobile-menu-panel-enter-from,
  .mobile-menu-panel-leave-to {
    opacity: 0;
    transform: translate(-50%, -0.35rem);
  }

  .mobile-submenu-enter-active,
  .mobile-submenu-leave-active {
    transition: all 0.2s ease;
  }

  .mobile-submenu-enter-from,
  .mobile-submenu-leave-to {
    opacity: 0;
    transform: translateY(-0.2rem);
  }
}
</style>
