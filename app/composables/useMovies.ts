export type MovieApiItem = {
  id: number;
  provider: string | null;
  movie_id: string | null;
  watch_status: string | null;
  cover: string | null;
  title: string | null;
  years: string | null;
  score: number | string | null;
  desc: string | null;
  url: string | null;
  create_time: string | null;
  update_time: string | null;
};

type MovieApiResponse = {
  data: MovieApiItem[];
};

const DEFAULT_ISO_DATE = "1970-01-01T00:00:00.000Z";

export type MovieViewItem = {
  id: string;
  provider: string;
  movieId: string;
  watchStatus: string;
  cover: string;
  title: string;
  years: string;
  score: number | null;
  description: string;
  url: string;
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

function normalizeDate(raw: string | null | undefined) {
  const value = (raw || "").trim();
  if (!value) return DEFAULT_ISO_DATE;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return DEFAULT_ISO_DATE;
  return parsed.toISOString();
}

function normalizeScore(raw: number | string | null | undefined) {
  if (typeof raw === "number") {
    return Number.isFinite(raw) ? raw : null;
  }
  if (typeof raw === "string") {
    const value = raw.trim();
    if (!value) return null;
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return null;
    return parsed;
  }
  return null;
}

function normalizeExternalUrl(raw: string | null | undefined) {
  const value = (raw || "").trim();
  if (!value) return "";
  if (value.startsWith("/")) return value;
  if (value.startsWith("http://") || value.startsWith("https://")) return value;
  return `https://${value.replace(/^\/+/, "")}`;
}

export function mapMovieApiItem(item: MovieApiItem): MovieViewItem {
  return {
    id: String(item.id),
    provider: String(item.provider || "").trim().toLowerCase(),
    movieId: String(item.movie_id || "").trim(),
    watchStatus: String(item.watch_status || "").trim().toLowerCase() || "unknown",
    cover: normalizeImagePath(item.cover) || "/images/pic.jpg",
    title: String(item.title || "").trim() || "未命名电影",
    years: String(item.years || "").trim(),
    score: normalizeScore(item.score),
    description: String(item.desc || "").replace(/\s+/g, " ").trim(),
    url: normalizeExternalUrl(item.url),
    createdAt: normalizeDate(item.create_time),
    updatedAt: normalizeDate(item.update_time),
  };
}

export function useMovies() {
  const { data, pending, error, refresh } = useAsyncData<MovieViewItem[]>(
    "site-movies",
    async () => {
      const response = await $fetch<MovieApiResponse>("/api/movie");
      return (response.data ?? []).map(mapMovieApiItem);
    },
    {
      default: () => [],
      server: true,
      lazy: true,
    },
  );

  const movies = computed(() => data.value ?? []);

  return {
    movies,
    pending,
    error,
    refresh,
  };
}
