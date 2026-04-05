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

type CommentCreateApiPayload = {
  parent_id?: number;
  target_type: string;
  target_id: number;
  content: string;
  nickname: string;
  email?: string | null;
  website?: string | null;
};

type CommentDetailApiResponse = {
  data: CommentApiItem;
};

function normalizeBaseUrl(baseUrl: string) {
  return baseUrl.replace(/\/+$/, "");
}

export default defineEventHandler(async (event) => {
  const body = await readBody<CommentCreateApiPayload>(event);

  if (!body || !body.target_type || !body.target_id) {
    throw createError({
      statusCode: 400,
      statusMessage: "Missing required comment payload",
    });
  }

  const runtimeConfig = useRuntimeConfig();
  const apiBase =
    runtimeConfig.settingsApiBase ||
    runtimeConfig.public.settingsApiBase ||
    "http://127.0.0.1:7878";
  const forwardedFor =
    getRequestHeader(event, "x-forwarded-for") ||
    getRequestHeader(event, "x-real-ip") ||
    event.node.req.socket.remoteAddress ||
    "";
  const userAgent = getRequestHeader(event, "user-agent") || "";

  try {
    const response = await $fetch<CommentDetailApiResponse>(
      `${normalizeBaseUrl(String(apiBase))}/comment`,
      {
        method: "POST",
        body,
        headers: {
          "x-forwarded-for": forwardedFor,
          "user-agent": userAgent,
        },
        timeout: 12000,
      },
    );

    return response;
  } catch (error: any) {
    const statusCode = Number(error?.response?.status || error?.statusCode || 502);
    const statusMessage =
      String(error?.response?._data?.detail || error?.statusMessage || "Failed to create comment");

    throw createError({
      statusCode,
      statusMessage,
    });
  }
});

