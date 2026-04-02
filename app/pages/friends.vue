<script setup lang="ts">
import type { FriendStatus, FriendViewItem } from "~/composables/useFriends";

const { settings } = useSiteSettings();

useHead(() => ({
  title: `友链 - ${settings.value.siteTitle}`,
}));

type FriendGroupMeta = {
  label: string;
  description: string;
};

const STATUS_ORDER: FriendStatus[] = ["ok", "missing", "blocked"];

const STATUS_META: Record<FriendStatus, FriendGroupMeta> = {
  ok: {
    label: "正常友链",
    description: "目前可访问并正常展示的站点",
  },
  missing: {
    label: "失联友链",
    description: "暂时无法访问，保留记录",
  },
  blocked: {
    label: "屏蔽友链",
    description: "已屏蔽，不在导航推荐",
  },
};

const { friends, pending, error } = useFriends();

const groupedFriends = computed(() =>
  STATUS_ORDER.map((status) => ({
    status,
    ...STATUS_META[status],
    items: friends.value.filter((item) => item.status === status),
  })),
);

function getCardStyle(item: FriendViewItem) {
  const fallback =
    "radial-gradient(circle at 74% 50%, rgba(10, 66, 108, 0.4), rgba(13, 22, 40, 0.95) 65%)";
  const cover = item.favicon
    ? `url("${item.favicon.replace(/"/g, '\\"')}")`
    : fallback;
  return {
    "--friend-cover": cover,
  } as Record<string, string>;
}

function getStatusTag(status: FriendStatus) {
  if (status === "ok") return "正常";
  if (status === "missing") return "失联";
  return "屏蔽";
}
</script>

<template>
  <div class="friends-page">
    <main class="friends-main">
      <section class="friends-hero">
        <h1 class="friends-title">友链</h1>
        <p class="friends-subtitle">
          记录一路同行的朋友们，愿每次点击都能遇见新的灵感。
        </p>
      </section>

      <p v-if="pending" class="friends-state">正在加载友链…</p>
      <p v-else-if="error" class="friends-state friends-state-error">友链加载失败，请稍后重试。</p>

      <section
        v-for="(group, groupIndex) in groupedFriends"
        :key="group.status"
        class="friends-group"
      >
        <header class="friends-group-head">
          <h2>{{ group.label }}</h2>
          <p>{{ group.description }} · {{ group.items.length }} 个</p>
        </header>

        <div v-if="group.items.length" class="friends-grid">
          <component
            :is="group.status === 'ok' ? 'a' : 'div'"
            v-for="(item, itemIndex) in group.items"
            :key="item.id"
            class="friend-card friend-card-reveal"
            :class="{ 'is-disabled': group.status !== 'ok' }"
            :href="group.status === 'ok' ? item.url : undefined"
            :target="group.status === 'ok' ? '_blank' : undefined"
            :rel="group.status === 'ok' ? 'noopener noreferrer' : undefined"
            :style="{
              ...getCardStyle(item),
              '--friend-order': groupIndex * 20 + itemIndex,
            }"
          >
            <img
              v-if="item.favicon"
              class="friend-avatar"
              :src="item.favicon"
              :alt="`${item.title} 图标`"
              loading="lazy"
            >
            <div v-else class="friend-avatar friend-avatar-fallback">
              {{ item.title.slice(0, 1).toUpperCase() }}
            </div>

            <div class="friend-info">
              <h3 class="friend-title">{{ item.title }}</h3>
              <p class="friend-description">{{ item.description }}</p>
              <div class="friend-meta">
                <span class="friend-tag">{{ item.category }}</span>
                <span class="friend-tag friend-status">{{ getStatusTag(item.status) }}</span>
              </div>
            </div>
          </component>
        </div>

        <p v-else class="friends-empty">这个分组还没有友链。</p>
      </section>
    </main>
  </div>
</template>

<style scoped>
.friends-page {
  min-height: 100vh;
  padding: 6.7rem 1rem 3.2rem;
}

.friends-main {
  width: var(--site-max-width);
  margin: 0 auto;
}

.friends-hero {
  margin-bottom: 1.55rem;
}

.friends-title {
  margin: 0;
  font-size: var(--fs-display);
  color: #0f9cb8;
  line-height: 1.02;
}

.friends-subtitle {
  margin: 0.7rem 0 0;
  color: var(--theme-text-soft);
  font-size: 1.02rem;
}

.friends-state {
  margin: 0 0 1rem;
  color: var(--theme-text-soft);
}

.friends-state-error {
  color: #f7a8a8;
}

.friends-group {
  margin-top: 1.3rem;
}

.friends-group-head {
  margin-bottom: 0.78rem;
}

.friends-group-head h2 {
  margin: 0;
  font-size: clamp(1.1rem, 1.7vw, 1.45rem);
  color: rgba(227, 240, 253, 0.96);
}

.friends-group-head p {
  margin: 0.35rem 0 0;
  color: var(--theme-text-mute);
  font-size: 0.9rem;
}

.friends-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 1.02rem;
}

.friend-card {
  position: relative;
  z-index: 0;
  isolation: isolate;
  display: flex;
  align-items: center;
  min-height: 7.5rem;
  border-radius: 0.78rem;
  overflow: clip;
  padding: 0 0.95rem;
  text-decoration: none !important;
  background-image: none !important;
  background-size: 0 0 !important;
  color: #162339 !important;
  border: 1px solid rgba(147, 185, 221, 0.28);
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.16);
  transition: transform 0.28s cubic-bezier(0.2, 0.8, 0.24, 1), box-shadow 0.28s ease;
}

.friend-card-reveal {
  opacity: 0;
  transform: translateY(-0.7rem);
  animation: friend-card-drop-in 560ms cubic-bezier(0.2, 0.86, 0.24, 1) both;
  animation-delay: calc(var(--friend-order, 0) * 54ms + 80ms);
}

.friend-card::before {
  content: "";
  position: absolute;
  inset: 0;
  z-index: -2;
  background-image: var(--friend-cover);
  background-size: cover;
  background-position: center;
  opacity: 0.9;
}

.friend-card::after {
  content: "";
  position: absolute;
  inset: 0;
  z-index: -1;
  background: linear-gradient(
    to left,
    rgba(252, 254, 255, 0.08) 0%,
    rgba(252, 254, 255, 0.46) 23%,
    rgba(252, 254, 255, 0.9) 45%,
    rgba(252, 254, 255, 0.98) 68%,
    rgba(252, 254, 255, 1) 100%
  );
}

.friend-card:hover {
  transform: scale(1.05);
  box-shadow: 0 14px 24px rgba(0, 0, 0, 0.2);
  color: #0f1c31 !important;
}

.friend-card.is-disabled {
  cursor: default;
}

.friend-avatar {
  width: 4.15rem;
  height: 4.15rem;
  min-width: 4.15rem;
  border-radius: 999px;
  object-fit: cover;
  border: 2px solid rgba(255, 255, 255, 0.95);
  box-shadow: 0 3px 10px rgba(0, 0, 0, 0.18);
}

.friend-avatar-fallback {
  display: grid;
  place-items: center;
  font-size: 1.4rem;
  font-weight: 700;
  color: #ffffff;
  background: linear-gradient(140deg, #2a80b7, #1f4f86);
}

.friend-info {
  margin-left: 0.86rem;
  min-width: 0;
}

.friend-title {
  margin: 0;
  font-size: 1.08rem;
  line-height: 1.25;
  color: #152236;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.friend-description {
  margin: 0.33rem 0 0;
  font-size: 0.85rem;
  line-height: 1.45;
  color: rgba(21, 34, 54, 0.8);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.friend-meta {
  margin-top: 0.52rem;
  display: flex;
  gap: 0.4rem;
  flex-wrap: wrap;
}

.friend-tag {
  display: inline-flex;
  align-items: center;
  height: 1.26rem;
  padding: 0 0.48rem;
  border-radius: 999px;
  font-size: 0.72rem;
  color: rgba(17, 35, 56, 0.88);
  background: rgba(214, 233, 252, 0.82);
}

.friend-status {
  background: rgba(179, 214, 248, 0.82);
}

.friends-empty {
  margin: 0;
  padding: 1rem 0.9rem;
  border-radius: 0.72rem;
  border: 1px dashed rgba(125, 170, 196, 0.36);
  color: var(--theme-text-soft);
}

@keyframes friend-card-drop-in {
  from {
    opacity: 0;
    transform: translateY(-0.7rem);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (max-width: 1120px) {
  .friends-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 760px) {
  .friends-page {
    padding: 5.9rem 0.68rem 2.8rem;
  }

  .friends-grid {
    grid-template-columns: 1fr;
  }
}

@media (prefers-reduced-motion: reduce) {
  .friend-card-reveal {
    opacity: 1;
    transform: none;
    animation: none !important;
  }
}
</style>


