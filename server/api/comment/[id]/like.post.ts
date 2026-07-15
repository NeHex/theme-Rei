type CommentApiItem = {
  id: number;
  parent_id: number;
  target_type: string;
  target_id: number;
  content: string;
  nickname: string;
  email: string | null;
  website: string | null;
  like_count: number;
  status: number;
  ip: string | null;
  create_time: string;
  update_time: string;
  replies: CommentApiItem[];
};

type CommentDetailApiResponse = {
  data: CommentApiItem;
};

import { backendFetch } from "../../../utils/backendFetch";
import { requirePositiveIntegerParam } from "../../../utils/routeParams";

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

export default defineEventHandler(async (event) => {
  const commentId = requirePositiveIntegerParam(getRouterParam(event, "id"), "comment");

  const likedIds = parseLikedIds(getCookie(event, "comment_liked_ids"));
  if (likedIds.has(commentId)) {
    throw createError({
      statusCode: 409,
      statusMessage: "Already liked",
    });
  }

  try {
    const response = await backendFetch<CommentDetailApiResponse>(`/comment/${commentId}/like`, {
      method: "POST",
      retry: 0,
    });

    likedIds.add(commentId);
    const nextCookie = Array.from(likedIds).slice(-400).join(",");
    setCookie(event, "comment_liked_ids", nextCookie, {
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
      path: "/",
      httpOnly: false,
    });

    return response;
  } catch (error: any) {
    const statusCode = Number(error?.response?.status || error?.statusCode || 502);
    const statusMessage =
      String(error?.response?._data?.detail || error?.statusMessage || "Failed to like comment");

    throw createError({
      statusCode,
      statusMessage,
    });
  }
});
