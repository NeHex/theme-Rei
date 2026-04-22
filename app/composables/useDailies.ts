export type DailyApiItem = {
  id: number;
  title: string;
  content: string | null;
  create_time: string;
  weather: string | null;
  daily_type: string | null;
  kuma_movie_id: number | null;
  movie: DailyMovieApiItem | null;
};

type DailyApiResponse = {
  data: DailyApiItem[];
};

const DEFAULT_ISO_DATE = "1970-01-01T00:00:00.000Z";
const DAILY_TYPES = ["note", "review"] as const;

export type DailyType = (typeof DAILY_TYPES)[number] | "unknown";

export type DailyMovieApiItem = {
  id: number;
  provider: string | null;
  movie_id: string | null;
  watch_status: string | null;
  cover: string | null;
  title: string | null;
  years: string | null;
  score: number | string | null;
  url: string | null;
};

export type DailyMovieViewItem = {
  id: string;
  provider: string;
  movieId: string;
  watchStatus: string;
  cover: string;
  title: string;
  years: string;
  score: number | null;
  url: string;
};

export type DailyViewItem = {
  id: string;
  title: string;
  content: string;
  summary: string;
  weather: string;
  dailyType: DailyType;
  kumaMovieId: string;
  movie: DailyMovieViewItem | null;
  createdAt: string;
};

function normalizeDate(raw: string | null | undefined) {
  const value = (raw || "").trim();
  if (!value) return DEFAULT_ISO_DATE;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return DEFAULT_ISO_DATE;
  return date.toISOString();
}

function compactText(raw: string | null | undefined) {
  return (raw || "")
    .replace(/\r\n/g, "\n")
    .replace(/\n{2,}/g, "\n")
    .replace(/\s+/g, " ")
    .trim();
}

function truncate(text: string, maxLength: number) {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, Math.max(0, maxLength - 1)).trim()}…`;
}

function normalizeImagePath(path: string | null | undefined) {
  const value = (path || "").trim();
  if (!value) return "";
  if (value.startsWith("/public/")) return value.slice(7);
  if (value.startsWith("public/")) return `/${value.slice(7)}`;
  if (value.startsWith("./")) return value.slice(1);
  return value;
}

function normalizeExternalUrl(raw: string | null | undefined) {
  const value = (raw || "").trim();
  if (!value) return "";
  if (value.startsWith("/")) return value;
  if (value.startsWith("http://") || value.startsWith("https://")) return value;
  return `https://${value.replace(/^\/+/, "")}`;
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

function normalizeDailyType(raw: string | null | undefined): DailyType {
  const value = String(raw || "").trim().toLowerCase();
  if ((DAILY_TYPES as readonly string[]).includes(value)) {
    return value as DailyType;
  }
  return "unknown";
}

function normalizeDailyMovie(raw: DailyMovieApiItem | null | undefined) {
  if (!raw) return null;

  return {
    id: String(raw.id),
    provider: String(raw.provider || "").trim().toLowerCase(),
    movieId: String(raw.movie_id || "").trim(),
    watchStatus: String(raw.watch_status || "").trim().toLowerCase() || "unknown",
    cover: normalizeImagePath(raw.cover) || "/images/pic.jpg",
    title: String(raw.title || "").trim() || "未命名电影",
    years: String(raw.years || "").trim(),
    score: normalizeScore(raw.score),
    url: normalizeExternalUrl(raw.url),
  } as DailyMovieViewItem;
}

export function mapDailyApiItem(item: DailyApiItem): DailyViewItem {
  const rawContent = (item.content || "").replace(/\r\n/g, "\n").trim();
  const content = rawContent || "暂无内容";
  const summarySource = compactText(rawContent) || content;
  const weather = (item.weather || "").trim();
  const dailyType = normalizeDailyType(item.daily_type);
  const kumaMovieId = String(item.kuma_movie_id ?? "").trim();
  const movie = normalizeDailyMovie(item.movie);

  return {
    id: String(item.id),
    title: item.title || "未命名日常",
    content,
    summary: truncate(summarySource, 96),
    weather,
    dailyType,
    kumaMovieId,
    movie,
    createdAt: normalizeDate(item.create_time),
  };
}

export function useDailies() {
  const { data, pending, error, refresh } = useAsyncData<DailyViewItem[]>(
    "site-dailies",
    async () => {
      const response = await $fetch<DailyApiResponse>("/api/daily", { cache: "no-store" });
      return (response.data ?? []).map(mapDailyApiItem);
    },
    {
      default: () => [],
      server: true,
      lazy: true,
    },
  );

  const dailies = computed(() => data.value ?? []);

  return {
    dailies,
    pending,
    error,
    refresh,
  };
}
