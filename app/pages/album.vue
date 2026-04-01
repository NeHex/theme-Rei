<script setup lang="ts">
import { albumCategories, albumItems } from "~/data/albums";

useHead({
  title: "相册 - NeHex",
});

const activeCategory = ref<(typeof albumCategories)[number]>("所有");

const filteredItems = computed(() => {
  if (activeCategory.value === "所有") return albumItems;
  return albumItems.filter((item) => item.category === activeCategory.value);
});
</script>

<template>
  <div class="album-page">
    <main class="album-shell">
      <aside class="album-sidebar">
        <button
          v-for="category in albumCategories"
          :key="category"
          class="category-btn"
          :class="{ active: category === activeCategory }"
          @click="activeCategory = category"
        >
          {{ category }}
        </button>
      </aside>

      <section class="album-grid">
        <article v-for="item in filteredItems" :key="item.id" class="album-card">
          <img :src="item.image" :alt="item.title" class="album-image" />
          <div class="album-card-body">
            <h3>{{ item.title }}</h3>
            <div class="album-meta">
              <time :datetime="item.date">{{ item.date }}</time>
              <p class="album-like">
                <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M8.4 10.3V19H5.5a1.5 1.5 0 0 1-1.5-1.5v-5.7a1.5 1.5 0 0 1 1.5-1.5h2.9Z" />
                  <path d="M8.4 19h7.1a2 2 0 0 0 2-1.6l1-5.2A1.9 1.9 0 0 0 16.7 10h-4.1l.5-2.8a2 2 0 0 0-3.9-.8L8.4 10.3Z" />
                </svg>
                {{ item.likes }}
              </p>
            </div>
          </div>
        </article>
      </section>
    </main>
  </div>
</template>

<style scoped>
.album-page {
  position: relative;
  min-height: 100vh;
  padding: 6.6rem 0.7rem 2rem;
  isolation: isolate;
}

.album-page::before {
  content: "";
  position: fixed;
  inset: 0;
  z-index: -2;
  background:
    linear-gradient(180deg, rgba(2, 23, 24, 0.7), rgba(1, 24, 27, 0.92)),
    url("/images/background.png") center / cover no-repeat fixed;
}

.album-shell {
  width: min(94%, 1760px);
  margin: 0 auto;
  display: grid;
  grid-template-columns: 7.2rem 1fr;
  gap: 1rem;
}

.album-sidebar {
  position: sticky;
  top: 7.3rem;
  align-self: start;
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
  padding: 0.4rem 0.3rem;
  border-radius: 0.8rem;
}

.category-btn {
  border: 0;
  height: 2.35rem;
  text-align: left;
  padding: 0 0.8rem;
  border-radius: 0.6rem;
  color: rgba(219, 236, 247, 0.9);
  background: transparent;
  cursor: pointer;
  font-size: 0.86rem;
  font-weight: 700;
  letter-spacing: 0.01em;
  transition: all 0.18s ease;
}

.category-btn:hover {
  color: #ffffff;
  background: rgba(255, 255, 255, 0.08);
}

.category-btn.active {
  color: #d7ffff;
  background: rgba(23, 90, 99, 0.62);
  box-shadow: inset 3px 0 0 rgba(66, 219, 234, 0.86);
}

.album-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.9rem;
}

.album-card {
  border-radius: 0.6rem;
  overflow: hidden;
  border: 1px solid rgba(118, 170, 194, 0.16);
  background: rgba(26, 28, 34, 0.9);
  min-width: 0;
}

.album-image {
  width: 100%;
  aspect-ratio: 4 / 4;
  object-fit: cover;
  display: block;
}

.album-card-body {
  padding: 0.9rem 0.86rem 0.8rem;
}

.album-card-body h3 {
  margin: 0;
  font-size: 1.06rem;
  line-height: 1.35;
}

.album-meta {
  margin-top: 0.72rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  color: rgba(171, 191, 205, 0.76);
}

.album-meta time {
  font-size: 0.86rem;
}

.album-like {
  margin: 0;
  display: inline-flex;
  align-items: center;
  gap: 0.26rem;
}

.album-like svg {
  width: 0.95rem;
  height: 0.95rem;
}

.album-like path {
  stroke: currentColor;
  stroke-width: 1.65;
  stroke-linecap: round;
  stroke-linejoin: round;
}

@media (max-width: 1180px) {
  .album-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 820px) {
  .album-page {
    padding: 6rem 0.5rem 1.6rem;
  }

  .album-shell {
    width: min(98%, 1760px);
    grid-template-columns: 1fr;
    gap: 0.72rem;
  }

  .album-sidebar {
    position: relative;
    top: auto;
    flex-direction: row;
    flex-wrap: wrap;
    gap: 0.4rem;
    padding: 0;
  }

  .category-btn {
    height: 2.05rem;
    padding: 0 0.68rem;
    border: 1px solid rgba(118, 170, 194, 0.24);
    background: rgba(255, 255, 255, 0.03);
  }

  .category-btn.active {
    box-shadow: none;
    border-color: rgba(66, 219, 234, 0.68);
  }

  .album-grid {
    grid-template-columns: 1fr;
  }
}
</style>
