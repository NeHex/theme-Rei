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

type AlbumDetailApiResponse = {
  data: AlbumApiItem;
};

import { backendFetch, logBackendFallback } from "../../utils/backendFetch";

export default defineEventHandler(async (event) => {
  const albumId = getRouterParam(event, "id");
  if (!albumId) {
    throw createError({
      statusCode: 400,
      statusMessage: "Missing album id",
    });
  }

  try {
    return await backendFetch<AlbumDetailApiResponse>(`/album/${albumId}`, {
      method: "GET",
    });
  } catch (error: any) {
    const statusCode = Number(error?.response?.status || error?.statusCode || 500);
    if (statusCode === 404) {
      throw createError({
        statusCode: 404,
        statusMessage: "Album not found",
      });
    }

    logBackendFallback("album-detail-api", error);
    throw createError({
      statusCode: 502,
      statusMessage: "Failed to load album",
    });
  }
});
