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
const requestUrl = useRequestURL();
const DISPLAY_TIME_ZONE = "Asia/Shanghai";

const siteBaseUrl = computed(() => {
  const configured = String(settings.value.siteUrl || "").trim();
  if (configured) return configured.replace(/\/+$/, "");
  return `${requestUrl.protocol}//${requestUrl.host}`;
});
const canonicalUrl = computed(() => `${siteBaseUrl.value}/album`);
const seoDescription = computed(() => `相册与图集内容 - ${settings.value.siteDesc}`);
const ogImage = computed(() => {
  const input = String(settings.value.userHeadpic || "/images/head.jpg").trim();
  if (!input) return "";
  if (/^https?:\/\//i.test(input)) return input;
  return `${siteBaseUrl.value}${input.startsWith("/") ? input : `/${input}`}`;
});
const albumSchema = computed(() => ({
  "@context": "https://schema.org",
  "@type": "CollectionPage",
  name: `相册 - ${settings.value.siteTitle}`,
  description: seoDescription.value,
  url: canonicalUrl.value,
}));

useHead(() => ({
  title: `相册 - ${settings.value.siteTitle}`,
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
      content: `相册 - ${settings.value.siteTitle}`,
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
      key: "album-schema",
      children: JSON.stringify(albumSchema.value),
    },
  ],
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
const likeError = ref("");
const likedAlbumCookie = useCookie<string>("album_liked_ids", {
  sameSite: "lax",
  maxAge: 60 * 60 * 24 * 365,
  default: () => "",
});
const likedAlbumMap = reactive<Record<string, true>>({});
const likingAlbumMap = reactive<Record<string, true>>({});
const albumLikeCountOverride = reactive<Record<string, number>>({});
const likesHydratedOnClient = ref(false);

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

function parseLikedAlbumIds(rawValue: string | null | undefined) {
  const result = new Set<string>();
  const chunks = String(rawValue || "").split(",");
  for (const chunk of chunks) {
    const value = chunk.trim();
    if (!value || !/^\d+$/.test(value)) continue;
    result.add(value);
  }
  return result;
}

function syncLikedAlbumsFromCookie() {
  const parsed = parseLikedAlbumIds(likedAlbumCookie.value);
  for (const key of Object.keys(likedAlbumMap)) {
    delete likedAlbumMap[key];
  }
  for (const id of parsed) {
    likedAlbumMap[id] = true;
  }
}

function persistLikedAlbumsToCookie() {
  likedAlbumCookie.value = Object.keys(likedAlbumMap).slice(-400).join(",");
}

function hasLikedAlbum(albumId: string) {
  if (!likesHydratedOnClient.value) return false;
  return Boolean(likedAlbumMap[albumId]);
}

function isLikingAlbum(albumId: string) {
  return Boolean(likingAlbumMap[albumId]);
}

function markAlbumLiked(albumId: string) {
  if (likedAlbumMap[albumId]) return;
  likedAlbumMap[albumId] = true;
  persistLikedAlbumsToCookie();
}

function getAlbumLikeCount(item: (typeof albums.value)[number]) {
  if (Number.isFinite(albumLikeCountOverride[item.id])) {
    return albumLikeCountOverride[item.id]!;
  }
  return Number(item.likes || 0);
}

function applyAlbumLikeCount(albumId: string, likeCount: number) {
  const nextCount = Math.max(0, Number(likeCount || 0));
  albumLikeCountOverride[albumId] = nextCount;

  const target = albums.value.find((item) => item.id === albumId);
  if (target) {
    target.likes = nextCount;
  }

  if (viewerAlbum.value?.id === albumId) {
    viewerAlbum.value = {
      ...viewerAlbum.value,
      likes: nextCount,
    };
  }
}

async function likeAlbum(item: (typeof albums.value)[number]) {
  const albumId = item.id;
  if (!albumId || hasLikedAlbum(albumId) || isLikingAlbum(albumId)) return;

  likeError.value = "";
  likingAlbumMap[albumId] = true;
  const previousLikeCount = getAlbumLikeCount(item);
  applyAlbumLikeCount(albumId, previousLikeCount + 1);

  try {
    const response = await $fetch<AlbumDetailApiResponse>(`/api/album/${albumId}/like`, {
      method: "POST",
    });
    const mapped = mapAlbumApiItem(response.data);
    applyAlbumLikeCount(albumId, mapped.likes);
    markAlbumLiked(albumId);
  } catch (error: any) {
    applyAlbumLikeCount(albumId, previousLikeCount);
    const statusCode = Number(error?.statusCode || error?.response?.status || 500);

    if (statusCode === 409) {
      markAlbumLiked(albumId);
      return;
    }

    likeError.value = String(error?.statusMessage || "点赞失败，请稍后重试");
  } finally {
    delete likingAlbumMap[albumId];
  }
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

watch(
  () => likedAlbumCookie.value,
  () => {
    if (!likesHydratedOnClient.value) return;
    syncLikedAlbumsFromCookie();
  },
);

onMounted(() => {
  syncLikedAlbumsFromCookie();
  likesHydratedOnClient.value = true;
});

function formatDate(dateInput: string) {
  const date = new Date(dateInput);
  if (Number.isNaN(date.getTime())) return dateInput;
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: DISPLAY_TIME_ZONE,
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
            <div class="album-card-actions">
              <NuxtLink
                :to="`/album/${encodeURIComponent(item.id)}`"
                class="album-detail-link"
                @click.stop
                @keydown.enter.stop
                @keydown.space.stop
              >
                详情页
              </NuxtLink>
            </div>
            <div class="album-meta">
              <time :datetime="item.createdAt">{{ formatDate(item.createdAt) }}</time>
              <button
                type="button"
                class="album-like"
                :class="{ 'is-liked': hasLikedAlbum(item.id) }"
                :disabled="hasLikedAlbum(item.id) || isLikingAlbum(item.id)"
                :title="hasLikedAlbum(item.id) ? '你已点赞过' : isLikingAlbum(item.id) ? '点赞中...' : '点赞相册'"
                @click.stop="likeAlbum(item)"
                @keydown.enter.stop.prevent
                @keydown.space.stop.prevent
              >
                <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M8.4 10.3V19H5.5a1.5 1.5 0 0 1-1.5-1.5v-5.7a1.5 1.5 0 0 1 1.5-1.5h2.9Z" />
                  <path d="M8.4 19h7.1a2 2 0 0 0 2-1.6l1-5.2A1.9 1.9 0 0 0 16.7 10h-4.1l.5-2.8a2 2 0 0 0-3.9-.8L8.4 10.3Z" />
                </svg>
                {{ getAlbumLikeCount(item) }}
              </button>
            </div>
          </div>
        </article>

        <article v-if="!pending && !filteredItems.length" class="album-empty">
          当前分类还没有相册内容
        </article>
      </section>
    </main>

    <p v-if="likeError" class="album-error">{{ likeError }}</p>

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

.album-card-actions {
  margin-top: 0.66rem;
  display: flex;
  align-items: center;
  justify-content: flex-start;
}

.album-detail-link {
  display: inline-flex;
  align-items: center;
  min-height: 1.9rem;
  padding: 0 0.7rem;
  border-radius: 999px;
  border: 1px solid rgba(118, 170, 194, 0.28);
  color: rgba(212, 233, 245, 0.9);
  background: rgba(255, 255, 255, 0.03);
  text-decoration: none;
  transition: border-color 0.2s ease, background-color 0.2s ease, color 0.2s ease;
}

.album-detail-link:hover {
  color: #ffffff;
  border-color: rgba(146, 202, 225, 0.48);
  background: rgba(255, 255, 255, 0.1);
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
  padding: 0.1rem 0.4rem;
  border-radius: 999px;
  border: 1px solid rgba(118, 170, 194, 0.28);
  background: rgba(255, 255, 255, 0.03);
  color: inherit;
  cursor: pointer;
  transition: border-color 0.2s ease, background-color 0.2s ease, opacity 0.2s ease;
}

.album-like:hover:not(:disabled) {
  border-color: rgba(146, 202, 225, 0.48);
  background: rgba(255, 255, 255, 0.1);
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

.album-like.is-liked {
  color: #b4ecff;
  border-color: rgba(108, 198, 227, 0.55);
  background: rgba(27, 86, 98, 0.4);
}

.album-like:disabled {
  opacity: 0.8;
  cursor: not-allowed;
}

.album-error {
  width: var(--site-max-width);
  margin: 0.65rem auto 0;
  color: #ffd0d0;
  font-size: 0.9rem;
  text-align: right;
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

  .album-error {
    width: min(98%, 1760px);
    text-align: left;
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
