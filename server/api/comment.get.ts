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

function normalizeBaseUrl(baseUrl: string) {
  return baseUrl.replace(/\/+$/, "");
}

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

  const runtimeConfig = useRuntimeConfig();
  const apiBase =
    runtimeConfig.settingsApiBase ||
    runtimeConfig.public.settingsApiBase ||
    "http://127.0.0.1:7878";

  try {
    const response = await $fetch<CommentListApiResponse>(
      `${normalizeBaseUrl(String(apiBase))}/comment`,
      {
        method: "GET",
        query: {
          target_type: targetType,
          target_id: targetId,
          status,
        },
        timeout: 12000,
        retry: 1,
        retryDelay: 250,
      },
    );

    return response;
  } catch (error) {
    console.error("[comment-api] failed to fetch comments", error);
    return { data: [] as CommentApiItem[] };
  }
});
