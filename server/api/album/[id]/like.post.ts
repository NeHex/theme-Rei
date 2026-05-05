import { backendFetch } from "../../../utils/backendFetch";

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

function parseLikedIds(rawCookie: string | undefined) {
  const result = new Set<number>();
  const chunks = String(rawCookie || "").split(",");
  for (const chunk of chunks) {
    const value = chunk.trim();
    if (!value || !/^\d+$/.test(value)) continue;
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0) continue;
    result.add(parsed);
  }
  return result;
}

function persistLikedIds(event: any, likedIds: Set<number>) {
  const nextCookie = Array.from(likedIds).slice(-400).join(",");
  setCookie(event, "album_liked_ids", nextCookie, {
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
    path: "/",
    httpOnly: false,
  });
}

export default defineEventHandler(async (event) => {
  const albumId = Number(getRouterParam(event, "id") || 0);
  if (!Number.isFinite(albumId) || albumId <= 0) {
    throw createError({
      statusCode: 422,
      statusMessage: "Invalid album id",
    });
  }

  const likedIds = parseLikedIds(getCookie(event, "album_liked_ids"));
  if (likedIds.has(albumId)) {
    throw createError({
      statusCode: 409,
      statusMessage: "Already liked",
    });
  }

  try {
    const response = await backendFetch<AlbumDetailApiResponse>(`/album/${albumId}/like`, {
      method: "POST",
      retry: 0,
    });

    likedIds.add(albumId);
    persistLikedIds(event, likedIds);
    return response;
  } catch (error: any) {
    const statusCode = Number(error?.response?.status || error?.statusCode || 502);
    const statusMessage =
      String(error?.response?._data?.detail || error?.statusMessage || "Failed to like album");

    if (statusCode === 409) {
      likedIds.add(albumId);
      persistLikedIds(event, likedIds);
    }

    throw createError({
      statusCode,
      statusMessage,
    });
  }
});
