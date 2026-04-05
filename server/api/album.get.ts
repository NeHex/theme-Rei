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

import { backendFetch } from "../utils/backendFetch";

export default defineEventHandler(async () => {
  try {
    return await backendFetch<AlbumApiResponse>("/album", { method: "GET" });
  } catch (error) {
    console.error("[album-api] failed to fetch albums", error);
    return { data: [] as AlbumApiItem[] };
  }
});
