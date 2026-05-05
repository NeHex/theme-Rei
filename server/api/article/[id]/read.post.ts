import { backendFetch } from "../../../utils/backendFetch";

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

export default defineEventHandler(async (event) => {
  const articleId = Number(getRouterParam(event, "id") || 0);
  if (!Number.isFinite(articleId) || articleId <= 0) {
    throw createError({
      statusCode: 422,
      statusMessage: "Invalid article id",
    });
  }

  try {
    return await backendFetch<ArticleDetailApiResponse>(`/article/${articleId}/read`, {
      method: "POST",
      retry: 0,
    });
  } catch (error: any) {
    const statusCode = Number(error?.response?.status || error?.statusCode || 502);
    const statusMessage =
      String(error?.response?._data?.detail || error?.statusMessage || "Failed to update article read count");

    throw createError({
      statusCode,
      statusMessage,
    });
  }
});
