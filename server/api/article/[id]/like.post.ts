import { backendFetch } from "../../../utils/backendFetch";
import { requirePositiveIntegerParam } from "../../../utils/routeParams";

type ArticleApiItem = {
  id: number;
  title: string;
  articleTopImage: string | null;
  class: string;
  read: number;
  like_count: number;
  create_time?: string | null;
  lastEditTime: string;
  tag: string | null;
  top: number;
  content: string | null;
};

type ArticleDetailApiResponse = {
  data: ArticleApiItem;
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
  setCookie(event, "article_liked_ids", nextCookie, {
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
    path: "/",
    httpOnly: false,
  });
}

export default defineEventHandler(async (event) => {
  const articleId = requirePositiveIntegerParam(getRouterParam(event, "id"), "article");

  const likedIds = parseLikedIds(getCookie(event, "article_liked_ids"));
  if (likedIds.has(articleId)) {
    throw createError({
      statusCode: 409,
      statusMessage: "Already liked",
    });
  }

  try {
    const response = await backendFetch<ArticleDetailApiResponse>(`/article/${articleId}/like`, {
      method: "POST",
      retry: 0,
    });

    likedIds.add(articleId);
    persistLikedIds(event, likedIds);
    return response;
  } catch (error: any) {
    const statusCode = Number(error?.response?.status || error?.statusCode || 502);
    const statusMessage =
      String(error?.response?._data?.detail || error?.statusMessage || "Failed to like article");

    if (statusCode === 409) {
      likedIds.add(articleId);
      persistLikedIds(event, likedIds);
    }

    throw createError({
      statusCode,
      statusMessage,
    });
  }
});
