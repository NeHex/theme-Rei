<script setup lang="ts">
import { mapAlbumApiItem } from "~/composables/useAlbums";

type AlbumDetailApiResponse = {
  data: {
    id: number;
    title: string;
    cover: string | null;
    class: string;
    like_count: number;
    img_urls: string | null;
    create_time: string;
    update_time: string;
  };
};

const { settings } = useSiteSettings();
const { albums, pending } = useAlbums();
const route = useRoute();

useHead(() => ({
  title: `相册 - ${settings.value.siteTitle}`,
}));

const allCategoryLabel = "所有";
const activeCategory = ref(allCategoryLabel);

const albumCategories = computed(() => {
  const categorySet = new Set<string>();
  for (const album of albums.value) {
    if (!album.category) continue;
    categorySet.add(album.category);
  }
  const sortedCategories = Array.from(categorySet).sort((a, b) =>
    a.localeCompare(b, "zh-Hans-CN", { numeric: true }),
  );
  return [allCategoryLabel, ...sortedCategories];
});

watch(
  albumCategories,
  (categories) => {
    if (!categories.includes(activeCategory.value)) {
      activeCategory.value = allCategoryLabel;
    }
  },
  { immediate: true },
);

const filteredItems = computed(() => {
  if (activeCategory.value === allCategoryLabel) return albums.value;
  return albums.value.filter((item) => item.category === activeCategory.value);
});

const viewerVisible = ref(false);
const viewerAlbum = ref<(typeof albums.value)[number] | null>(null);
const viewerImages = ref<string[]>([]);
const viewerStartIndex = ref(0);
const autoOpenedAlbumId = ref<string | null>(null);

async function openAlbumViewer(item: (typeof albums.value)[number], startIndex = 0) {
  let albumData = item;

  try {
    const response = await $fetch<AlbumDetailApiResponse>(`/api/album/${item.id}`);
    albumData = mapAlbumApiItem(response.data);
  } catch (error) {
    console.error("[album-page] failed to fetch album detail", error);
  }

  const images = albumData.imageUrls.length ? albumData.imageUrls : [albumData.cover];
  if (!images.length) return;

  viewerAlbum.value = albumData;
  viewerImages.value = images;
  viewerStartIndex.value = Math.max(0, Math.min(startIndex, images.length - 1));
  viewerVisible.value = true;
}

watch(
  [() => route.query.album, albums],
  async ([albumQuery]) => {
    const rawAlbumId = Array.isArray(albumQuery) ? albumQuery[0] : albumQuery;
    const albumId = String(rawAlbumId || "").trim();
    if (!albumId || !albums.value.length) return;
    if (autoOpenedAlbumId.value === albumId) return;

    const targetAlbum = albums.value.find((item) => item.id === albumId);
    if (!targetAlbum) return;

    autoOpenedAlbumId.value = albumId;
    await openAlbumViewer(targetAlbum);
  },
  { immediate: true },
);

function formatDate(dateInput: string) {
  const date = new Date(dateInput);
  if (Number.isNaN(date.getTime())) return dateInput;
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
    .format(date)
    .replace(/\//g, "-");
}
</script>

<template>
  <div class="album-page">
    <main class="album-shell">
      <aside class="album-sidebar">
        <button
          v-for="(category, index) in albumCategories"
          :key="category"
          class="category-btn category-btn-reveal"
          :class="{ active: category === activeCategory }"
          :style="{ '--category-order': index }"
          @click="activeCategory = category"
        >
          {{ category }}
        </button>
      </aside>

      <section class="album-grid">
        <article
          v-for="(item, index) in filteredItems"
          :key="item.id"
          class="album-card album-card-reveal"
          :style="{ '--album-order': index }"
          role="button"
          tabindex="0"
          @click="openAlbumViewer(item)"
          @keydown.enter.prevent="openAlbumViewer(item)"
          @keydown.space.prevent="openAlbumViewer(item)"
        >
          <img :src="item.cover" :alt="item.title" class="album-image" />
          <div class="album-card-body">
            <h3>{{ item.title }}</h3>
            <div class="album-meta">
              <time :datetime="item.createdAt">{{ formatDate(item.createdAt) }}</time>
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

        <article v-if="!pending && !filteredItems.length" class="album-empty">
          当前分类还没有相册内容
        </article>
      </section>
    </main>

    <AlbumViewer
      v-model="viewerVisible"
      :album="viewerAlbum"
      :images="viewerImages"
      :start-index="viewerStartIndex"
    />
  </div>
</template>

<style scoped>
.album-page {
  position: relative;
  min-height: 100vh;
  padding: 6.6rem 0.7rem 2.2rem;
  isolation: isolate;
}

.album-shell {
  width: var(--site-max-width);
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
  color: var(--theme-text);
  background: transparent;
  cursor: pointer;
  font-size: var(--fs-small);
  font-weight: 700;
  letter-spacing: 0.01em;
  transition: all 0.18s ease;
}

.category-btn-reveal {
  opacity: 0;
  transform: translateX(-1rem);
  animation: category-slide-in 460ms cubic-bezier(0.2, 0.86, 0.24, 1) both;
  animation-delay: calc(var(--category-order, 0) * 80ms);
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
  border: 1px solid var(--theme-border);
  background: var(--theme-surface);
  min-width: 0;
  cursor: pointer;
  transition: border-color 0.2s ease, transform 0.2s ease;
}

.album-card-reveal {
  opacity: 0;
  animation: album-card-flicker-in 440ms ease-out both;
  animation-delay: calc(var(--album-order, 0) * 42ms);
}

.album-card:hover {
  border-color: rgba(125, 190, 213, 0.46);
  transform: translateY(-0.1rem);
}

.album-card:focus-visible {
  outline: 2px solid rgba(66, 219, 234, 0.72);
  outline-offset: 2px;
}

.album-image {
  width: 100%;
  aspect-ratio: 1 / 1;
  object-fit: cover;
  display: block;
}

.album-card-body {
  padding: 0.9rem 0.86rem 0.8rem;
}

.album-card-body h3 {
  margin: 0;
  font-size: var(--fs-title);
  line-height: 1.35;
}

.album-meta {
  margin-top: 0.72rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  color: var(--theme-text-mute);
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

.album-empty {
  grid-column: 1 / -1;
  border-radius: 0.8rem;
  border: 1px dashed rgba(118, 170, 194, 0.36);
  padding: 1.6rem 1rem;
  text-align: center;
  color: var(--theme-text-mute);
  background: rgba(255, 255, 255, 0.02);
}

@keyframes category-slide-in {
  from {
    opacity: 0;
    transform: translateX(-1rem);
  }

  to {
    opacity: 1;
    transform: translateX(0);
  }
}

@keyframes album-card-flicker-in {
  0% {
    opacity: 0.1;
    filter: brightness(0.5);
  }

  20% {
    opacity: 1;
    filter: brightness(1.28);
  }

  40% {
    opacity: 0.25;
    filter: brightness(0.62);
  }

  60% {
    opacity: 1;
    filter: brightness(1.18);
  }

  80% {
    opacity: 0.62;
    filter: brightness(0.9);
  }

  100% {
    opacity: 1;
    filter: brightness(1);
  }
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
    margin-top:2em;
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

@media (prefers-reduced-motion: reduce) {
  .category-btn-reveal,
  .album-card-reveal {
    opacity: 1;
    transform: none;
    filter: none;
    animation: none !important;
  }
}
</style>

