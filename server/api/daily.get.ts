type DailyMovieApiItem = {
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

type DailyApiItem = {
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

import { backendFetch, logBackendFallback } from "../utils/backendFetch";

export default defineEventHandler(async () => {
  try {
    return await backendFetch<DailyApiResponse>("/daily", { method: "GET" });
  } catch (error) {
    logBackendFallback("daily-api", error);
    return { data: [] as DailyApiItem[] };
  }
});
