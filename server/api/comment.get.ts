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
  is_admin?: boolean;
  ip: string | null;
  create_time: string;
  update_time: string;
  replies: CommentApiItem[];
};

type CommentListApiResponse = {
  data: CommentApiItem[];
};

import { backendFetch, logBackendFallback } from "../utils/backendFetch";

export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  const targetType = String(query.target_type || "").trim();
  const targetId = Number(query.target_id || 0);
  const status = Number(query.status ?? 1);

  if (!targetType || !targetId) {
    throw createError({
      statusCode: 400,
      statusMessage: "Missing target_type or target_id",
    });
  }

  try {
    return await backendFetch<CommentListApiResponse>("/comment", {
      method: "GET",
      query: {
        target_type: targetType,
        target_id: targetId,
        status,
      },
    });
  } catch (error) {
    logBackendFallback("comment-api", error);
    return { data: [] as CommentApiItem[] };
  }
});
