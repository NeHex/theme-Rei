export type AlbumApiItem = {
  id: number;
  title: string;
  cover: string | null;
  class: string;
  like_count: number;
  img_urls: string | null;
  create_time: string;
  update_time: string;
};

type AlbumApiResponse = {
  data: AlbumApiItem[];
};

export type AlbumViewItem = {
  id: string;
  title: string;
  cover: string;
  category: string;
  likes: number;
  imageUrls: string[];
  createdAt: string;
  updatedAt: string;
};

function normalizeImagePath(path: string | null | undefined) {
  const value = (path || "").trim();
  if (!value) return "";
  if (value.startsWith("/public/")) return value.slice(7);
  if (value.startsWith("public/")) return `/${value.slice(7)}`;
  if (value.startsWith("./")) return value.slice(1);
  return value;
}

function parseImageUrls(raw: string | null | undefined) {
  if (!raw) return [] as string[];
  return raw
    .split(/[,\n\r，]+/g)
    .map((url) => normalizeImagePath(url))
    .filter(Boolean);
}

function normalizeDate(raw: string | null | undefined) {
  const value = (raw || "").trim();
  if (!value) return new Date().toISOString();
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return new Date().toISOString();
  return date.toISOString();
}

export function mapAlbumApiItem(item: AlbumApiItem): AlbumViewItem {
  const imageUrls = parseImageUrls(item.img_urls);
  const normalizedCover = normalizeImagePath(item.cover);
  const cover = normalizedCover || imageUrls[0] || "/images/pic.jpg";
  const createdAt = normalizeDate(item.create_time);
  const updatedAt = normalizeDate(item.update_time);

  return {
    id: String(item.id),
    title: item.title || "未命名相册",
    cover,
    category: (item.class || "其他").trim() || "其他",
    likes: item.like_count || 0,
    imageUrls,
    createdAt,
    updatedAt,
  };
}

export function useAlbums() {
  const { data, pending, error, refresh } = useAsyncData<AlbumViewItem[]>(
    "site-albums",
    async () => {
      const response = await $fetch<AlbumApiResponse>("/api/album");
      return (response.data ?? []).map(mapAlbumApiItem);
    },
    {
      default: () => [],
      server: true,
      lazy: false,
    },
  );

  const albums = computed(() => data.value ?? []);

  function getAlbumById(id: string) {
    return albums.value.find((album) => album.id === id);
  }

  return {
    albums,
    pending,
    error,
    refresh,
    getAlbumById,
  };
}
