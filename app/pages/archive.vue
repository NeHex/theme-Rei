<script setup lang="ts">
type ArchiveItem = {
  date: string;
  title: string;
  to: string;
};

useHead({
  title: "归档 - NeHex",
});

const archives: readonly ArchiveItem[] = [
  { date: "2024-02-03", title: "游记", to: "/article/ai-fatigue-real" },
  { date: "2023-03-10", title: "近况", to: "/article/ai-rebuild-rfc-plan" },
  { date: "2022-06-11", title: "朝花夕拾", to: "/article/lobehub-performance-dx" },
  { date: "2022-05-22", title: "阶段总结", to: "/article/my-ai-writing-workflow" },
  { date: "2022-05-22", title: "深夜 emo", to: "/article/after-leaving-folo" },
  { date: "2022-05-21", title: "这段记忆 - 上海", to: "/article/look-back-at-myself" },
  { date: "2022-05-21", title: "年终总结", to: "/article/follow-development-monthly-01" },
];
</script>

<template>
  <div class="archive-page">
    <main class="archive-shell">
      <section class="archive-panel">
        <header class="archive-head">
          <h1>归档</h1>
        </header>

        <div class="archive-list">
          <NuxtLink
            v-for="item in archives"
            :key="`${item.date}-${item.title}`"
            :to="item.to"
            class="archive-item"
          >
            <time class="archive-date" :datetime="item.date">{{ item.date }}</time>
            <span class="archive-title">{{ item.title }}</span>
          </NuxtLink>
        </div>
      </section>
    </main>
  </div>
</template>

<style scoped>
.archive-page {
  position: relative;
  min-height: 100vh;
  padding: 6.9rem 0.9rem 2.2rem;
  isolation: isolate;
}

.archive-shell {
  width: var(--site-max-width);
  margin: 0 auto;
}

.archive-panel {
  width: min(46rem, 100%);
  padding-left: 1.8rem;
  border-left: 1px solid rgba(146, 169, 196, 0.32);
}

.archive-head h1 {
  margin: 0;
  font-size: var(--fs-display);
  line-height: 1;
  color: var(--theme-text);
}

.archive-list {
  margin-top: 2rem;
  display: flex;
  flex-direction: column;
}

.archive-item {
  display: grid;
  grid-template-columns: 9.2rem 1fr;
  gap: 1.15rem;
  align-items: baseline;
  padding: 0.86rem 0;
  text-decoration: none;
  color: var(--theme-text);
}

.archive-date {
  color: var(--theme-text-mute);
  font-size: 1.04rem;
  font-weight: 600;
  letter-spacing: 0.01em;
  font-variant-numeric: tabular-nums;
}

.archive-title {
  font-size: var(--fs-h2);
  line-height: 1.25;
  color: rgba(236, 245, 255, 0.9);
  transition: color 0.18s ease, transform 0.18s ease;
}

.archive-item:hover .archive-title {
  color: #7ad8ef;
  transform: translateX(2px);
}

@media (max-width: 760px) {
  .archive-page {
    padding: 6.1rem 0.6rem 2rem;
  }

  .archive-shell {
    width: min(96%, 1560px);
  }

  .archive-panel {
    padding-left: 1rem;
  }

  .archive-head h1 {
    font-size: 2.5rem;
  }

  .archive-item {
    grid-template-columns: 1fr;
    gap: 0.32rem;
    padding: 0.8rem 0;
  }

  .archive-date {
    font-size: 0.92rem;
  }

  .archive-title {
    font-size: 1.46rem;
  }
}
</style>
