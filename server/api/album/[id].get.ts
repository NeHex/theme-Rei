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
import { assertAlbumDetailApiResponse } from "../../utils/detailApiContracts";
import { requirePositiveIntegerParam } from "../../utils/routeParams";

export default defineEventHandler(async (event) => {
  const albumId = requirePositiveIntegerParam(getRouterParam(event, "id"), "album");

  try {
    return assertAlbumDetailApiResponse(await backendFetch<AlbumDetailApiResponse>(`/album/${albumId}`, {
      method: "GET",
    }));
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
