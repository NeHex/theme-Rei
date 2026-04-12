type AlbumApiItem = {
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

import { backendFetch, logBackendFallback } from "../utils/backendFetch";

export default defineEventHandler(async () => {
  try {
    return await backendFetch<AlbumApiResponse>("/album", { method: "GET" });
  } catch (error) {
    logBackendFallback("album-api", error);
    return { data: [] as AlbumApiItem[] };
  }
});
