type MovieApiItem = {
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

import { backendFetch, logBackendFallback } from "../utils/backendFetch";

export default defineEventHandler(async () => {
  try {
    return await backendFetch<MovieApiResponse>("/kuma/movie", { method: "GET" });
  } catch (error) {
    logBackendFallback("movie-api", error);
    return { data: [] as MovieApiItem[] };
  }
});
