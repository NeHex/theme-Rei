import { resolveAdminIdentity } from "../utils/adminIdentity";
import { backendFetch } from "../utils/backendFetch";
import { validateCommentPayload } from "../utils/inputContracts.js";

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

export default defineEventHandler(async (event) => {
  let body: ReturnType<typeof validateCommentPayload>;
  try {
    body = validateCommentPayload(await readBody<CommentCreateApiPayload>(event));
  } catch (error) {
    throw createError({
      statusCode: 422,
      statusMessage: error instanceof Error ? error.message : "Invalid comment payload",
    });
  }

  const forwardedFor =
    getRequestHeader(event, "x-forwarded-for") ||
    getRequestHeader(event, "x-real-ip") ||
    event.node.req.socket.remoteAddress ||
    "";
  const userAgent = getRequestHeader(event, "user-agent") || "";
  const requestCookie = getRequestHeader(event, "cookie") || "";
  const adminIdentity = resolveAdminIdentity(event);

  try {
    return await backendFetch<CommentDetailApiResponse>("/comment", {
      method: "POST",
      body,
      retry: 0,
      headers: {
        "x-forwarded-for": forwardedFor,
        "user-agent": userAgent,
        ...(requestCookie ? { cookie: requestCookie } : {}),
        ...(adminIdentity
          ? {
              "x-nehex-admin-marker": adminIdentity.marker,
              "x-nehex-admin-source": adminIdentity.source,
            }
          : {}),
      },
    });
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
