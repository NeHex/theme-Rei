<script setup lang="ts">
import type { AlbumApiItem } from "~/composables/useAlbums";
import { mapAlbumApiItem } from "~/composables/useAlbums";

type AlbumDetailApiResponse = {
  data: AlbumApiItem;
};

const route = useRoute();
const requestUrl = useRequestURL();
const { settings } = useSiteSettings();
const DISPLAY_TIME_ZONE = "Asia/Shanghai";

const albumId = computed(() => String(route.params.id ?? "").trim());
const { album, albumData, pending, error } = useAlbumDetail(albumId);

watchEffect(() => {
  if (!error.value) return;
  throw createError({
    statusCode: Number((error.value as any).statusCode || 404),
    statusMessage: (error.value as any).statusMessage || "相册不存在",
  });
});

const siteBaseUrl = computed(() => {
  const configured = String(settings.value.siteUrl || "").trim();
  if (configured) return configured.replace(/\/+$/, "");
  return `${requestUrl.protocol}//${requestUrl.host}`;
});

function toAbsoluteUrl(pathOrUrl: string) {
  const input = String(pathOrUrl || "").trim();
  if (!input) return "";
  if (/^https?:\/\//i.test(input)) return input;
  return `${siteBaseUrl.value}${input.startsWith("/") ? input : `/${input}`}`;
}

function compactText(raw: string) {
  return raw.replace(/\s+/g, " ").trim();
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: DISPLAY_TIME_ZONE,
  })
    .format(date)
    .replace(/\//g, "-");
}

const galleryImages = computed(() => {
  const items = new Set<string>();
  const cover = String(album.value?.cover || "").trim();
  if (cover) items.add(cover);
  for (const image of album.value?.imageUrls || []) {
    const normalized = String(image || "").trim();
    if (normalized) items.add(normalized);
  }
  return [...items];
});

const imageCount = computed(() => galleryImages.value.length);
const canonicalUrl = computed(() => {
  const path = albumId.value ? `/album/${encodeURIComponent(albumId.value)}` : "/album";
  return `${siteBaseUrl.value}${path}`;
});
const seoDescription = computed(() => {
  if (!album.value) return settings.value.siteDesc;
  const parts = [
    album.value.title,
    album.value.category ? `分类 ${album.value.category}` : "",
    imageCount.value ? `共 ${imageCount.value} 张图片` : "",
  ].filter(Boolean);
  return compactText(parts.join("，")).slice(0, 160) || settings.value.siteDesc;
});
const ogImage = computed(() => toAbsoluteUrl(galleryImages.value[0] || settings.value.userHeadpic || ""));
const albumSchema = computed(() => {
  if (!album.value) return null;
  return {
    "@context": "https://schema.org",
    "@type": "ImageGallery",
    name: album.value.title,
    description: seoDescription.value,
    url: canonicalUrl.value,
    image: galleryImages.value.map((item) => toAbsoluteUrl(item)),
    datePublished: album.value.createdAt,
    dateModified: album.value.updatedAt,
    keywords: album.value.category,
  };
});

useHead(() => ({
  title: `${album.value?.title || "相册"} - ${settings.value.siteTitle}`,
  link: [{ rel: "canonical", href: canonicalUrl.value }],
  meta: [
    { name: "description", content: seoDescription.value },
    { property: "og:type", content: "article" },
    { property: "og:title", content: `${album.value?.title || "相册"} - ${settings.value.siteTitle}` },
    { property: "og:description", content: seoDescription.value },
    { property: "og:url", content: canonicalUrl.value },
    { property: "og:image", content: ogImage.value },
  ],
  script: albumSchema.value
    ? [
        {
          type: "application/ld+json",
          key: "album-detail-schema",
          children: JSON.stringify(albumSchema.value),
        },
      ]
    : [],
}));

const viewerVisible = ref(false);
const viewerStartIndex = ref(0);
const likedAlbumCookie = useCookie<string>("album_liked_ids", {
  sameSite: "lax",
  maxAge: 60 * 60 * 24 * 365,
  default: () => "",
});
const likedAlbumMap = reactive<Record<string, true>>({});
const likesHydratedOnClient = ref(false);
const isLiking = ref(false);
const likeError = ref("");

function openAlbumViewer(startIndex = 0) {
  if (!galleryImages.value.length) return;
  viewerStartIndex.value = Math.max(0, Math.min(startIndex, galleryImages.value.length - 1));
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

function markAlbumLiked(currentAlbumId: string) {
  if (!currentAlbumId || likedAlbumMap[currentAlbumId]) return;
  likedAlbumMap[currentAlbumId] = true;
  persistLikedAlbumsToCookie();
}

const isLiked = computed(() => {
  if (!likesHydratedOnClient.value || !albumId.value) return false;
  return Boolean(likedAlbumMap[albumId.value]);
});

const displayLikes = computed(() => Math.max(0, Number(album.value?.likes || 0)));
const commentTargetId = computed(() => Number(album.value?.id || 0));

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

async function likeCurrentAlbum() {
  if (!albumData.value || !albumId.value || isLiked.value || isLiking.value) return;

  likeError.value = "";
  isLiking.value = true;
  const previousLikeCount = Math.max(0, Number(albumData.value.likes || 0));
  albumData.value = {
    ...albumData.value,
    likes: previousLikeCount + 1,
  };

  try {
    const response = await $fetch<AlbumDetailApiResponse>(
      `/api/album/${encodeURIComponent(albumId.value)}/like`,
      { method: "POST" },
    );
    albumData.value = mapAlbumApiItem(response.data);
    markAlbumLiked(albumId.value);
  } catch (error: any) {
    if (albumData.value) {
      albumData.value = {
        ...albumData.value,
        likes: previousLikeCount,
      };
    }

    const statusCode = Number(error?.statusCode || error?.response?.status || 500);
    if (statusCode === 409) {
      markAlbumLiked(albumId.value);
      return;
    }

    likeError.value = String(error?.statusMessage || "点赞失败，请稍后重试");
  } finally {
    isLiking.value = false;
  }
}
</script>

<template>
  <div class="album-detail-page">
    <main class="album-detail-shell">
      <section v-if="album" class="album-detail-card">
        <NuxtLink to="/album" class="album-back-link">
          返回相册列表
        </NuxtLink>

        <header class="album-detail-head">
          <button
            type="button"
            class="album-detail-cover-button"
            @click="openAlbumViewer(0)"
          >
            <img :src="galleryImages[0] || album.cover" :alt="`${album.title} 封面`" class="album-detail-cover" />
            <span class="album-detail-cover-hint">点击查看大图</span>
          </button>

          <div class="album-detail-meta">
            <span class="album-detail-category">{{ album.category || "未分类" }}</span>
            <h1>{{ album.title }}</h1>
            <p class="album-detail-summary">
              {{ imageCount }} 张图片 · 创建于 {{ formatDate(album.createdAt) }} · 更新于 {{ formatDate(album.updatedAt) }}
            </p>

            <div class="album-detail-stats">
              <span>点赞 {{ displayLikes }}</span>
            </div>

            <div class="album-detail-actions">
              <button
                type="button"
                class="album-action-button"
                :class="{ 'is-liked': isLiked }"
                :disabled="isLiked || isLiking"
                @click="likeCurrentAlbum"
              >
                {{ isLiked ? "已点赞" : isLiking ? "点赞中..." : "点赞相册" }}
              </button>

              <button
                type="button"
                class="album-action-button album-action-button-secondary"
                @click="openAlbumViewer(0)"
              >
                全屏浏览
              </button>
            </div>

            <p v-if="likeError" class="album-like-error">{{ likeError }}</p>
          </div>
        </header>

        <section class="album-detail-gallery">
          <button
            v-for="(image, index) in galleryImages"
            :key="`${album.id}-${index}-${image}`"
            type="button"
            class="album-detail-photo"
            @click="openAlbumViewer(index)"
          >
            <img :src="image" :alt="`${album.title} 图片 ${index + 1}`" loading="lazy">
          </button>
        </section>

        <section class="album-detail-comments">
          <header class="album-comment-head">
            <h2>相册留言</h2>
            <p>可以对这组照片留下评论。</p>
          </header>

          <CommentSection
            target-type="album"
            :target-id="commentTargetId"
          />
        </section>
      </section>

      <section v-else class="album-detail-card">
        <p>{{ pending ? "相册加载中..." : "相册不存在或已下线。" }}</p>
      </section>
    </main>

    <AlbumViewer
      v-model="viewerVisible"
      :album="album"
      :images="galleryImages"
      :start-index="viewerStartIndex"
    />
  </div>
</template>

<style scoped>
.album-detail-page {
  min-height: 100vh;
  padding: 6.3rem 1rem 2.4rem;
  color: var(--theme-text);
}

.album-detail-shell {
  width: min(var(--site-content-width), 78rem);
  margin: 0 auto;
}

.album-detail-card {
  padding: 1.2rem;
  border-radius: 1.25rem;
  border: 1px solid rgba(138, 189, 213, 0.2);
  background:
    radial-gradient(circle at 12% 12%, rgba(112, 173, 205, 0.18), transparent 32%),
    radial-gradient(circle at 88% 18%, rgba(220, 184, 118, 0.12), transparent 28%),
    linear-gradient(160deg, rgba(8, 17, 31, 0.95), rgba(9, 18, 34, 0.84));
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.24);
}

.album-back-link {
  display: inline-flex;
  margin-bottom: 1rem;
  color: rgba(204, 223, 237, 0.9);
  text-decoration: none;
}

.album-detail-head {
  display: grid;
  grid-template-columns: minmax(18rem, 26rem) 1fr;
  gap: 1.2rem;
  align-items: start;
}

.album-detail-cover-button {
  position: relative;
  overflow: hidden;
  margin: 0;
  padding: 0;
  border: 0;
  border-radius: 1rem;
  background: transparent;
  cursor: pointer;
}

.album-detail-cover {
  width: 100%;
  display: block;
  aspect-ratio: 1 / 1;
  object-fit: cover;
  border-radius: 1rem;
}

.album-detail-cover-hint {
  position: absolute;
  left: 0.85rem;
  bottom: 0.85rem;
  padding: 0.35rem 0.7rem;
  border-radius: 999px;
  background: rgba(8, 16, 30, 0.72);
  color: rgba(240, 246, 252, 0.92);
  font-size: 0.86rem;
}

.album-detail-meta {
  display: grid;
  gap: 0.85rem;
}

.album-detail-category {
  width: fit-content;
  padding: 0.28rem 0.72rem;
  border-radius: 999px;
  background: rgba(135, 187, 214, 0.14);
  color: rgba(220, 234, 244, 0.92);
}

.album-detail-meta h1 {
  margin: 0;
  font-size: clamp(2rem, 4vw, 3rem);
  line-height: 1.02;
}

.album-detail-summary {
  margin: 0;
  color: rgba(200, 219, 233, 0.88);
  line-height: 1.8;
}

.album-detail-stats {
  color: rgba(172, 197, 216, 0.84);
  font-size: 0.95rem;
}

.album-detail-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.7rem;
}

.album-action-button {
  min-height: 2.7rem;
  padding: 0 1rem;
  border-radius: 999px;
  border: 1px solid rgba(121, 191, 217, 0.24);
  background: rgba(31, 96, 109, 0.46);
  color: #f4fbff;
  cursor: pointer;
  transition: transform 0.18s ease, background-color 0.18s ease, border-color 0.18s ease, opacity 0.18s ease;
}

.album-action-button:hover:not(:disabled) {
  transform: translateY(-1px);
  border-color: rgba(156, 212, 236, 0.48);
  background: rgba(39, 113, 129, 0.6);
}

.album-action-button.is-liked,
.album-action-button:disabled {
  opacity: 0.76;
  cursor: default;
}

.album-action-button-secondary {
  background: rgba(255, 255, 255, 0.04);
}

.album-like-error {
  margin: 0;
  color: #ffd0d0;
  font-size: 0.92rem;
}

.album-detail-gallery {
  margin-top: 1.35rem;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.85rem;
}

.album-detail-photo {
  overflow: hidden;
  margin: 0;
  padding: 0;
  border: 1px solid rgba(138, 189, 213, 0.18);
  border-radius: 0.95rem;
  background: rgba(255, 255, 255, 0.02);
  cursor: pointer;
  transition: transform 0.2s ease, border-color 0.2s ease;
}

.album-detail-photo:hover {
  transform: translateY(-2px);
  border-color: rgba(172, 219, 240, 0.44);
}

.album-detail-photo img {
  width: 100%;
  display: block;
  aspect-ratio: 1 / 1;
  object-fit: cover;
}

.album-detail-comments {
  margin-top: 1.4rem;
}

.album-comment-head {
  margin-bottom: 0.8rem;
}

.album-comment-head h2 {
  margin: 0 0 0.35rem;
  font-size: 1.25rem;
}

.album-comment-head p {
  margin: 0;
  color: rgba(195, 214, 228, 0.76);
}

@media (max-width: 900px) {
  .album-detail-head {
    grid-template-columns: 1fr;
  }

  .album-detail-gallery {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 640px) {
  .album-detail-page {
    padding-inline: 0.7rem;
  }

  .album-detail-card {
    padding: 1rem;
  }

  .album-detail-gallery {
    grid-template-columns: 1fr;
  }
}
</style>
