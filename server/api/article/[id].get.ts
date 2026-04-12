type ArticleApiItem = {
  id: number;
  title: string;
  articleTopImage: string | null;
  class: string;
  read: number;
  like_count: number;
  lastEditTime: string;
  tag: string | null;
  top: number;
  content: string | null;
};

type ArticleDetailApiResponse = {
  data: ArticleApiItem;
};

import { backendFetch, logBackendFallback } from "../../utils/backendFetch";

export default defineEventHandler(async (event) => {
  const articleId = getRouterParam(event, "id");
  if (!articleId) {
    throw createError({
      statusCode: 400,
      statusMessage: "Missing article id",
    });
  }

  try {
    return await backendFetch<ArticleDetailApiResponse>(`/article/${articleId}`, {
      method: "GET",
    });
  } catch (error: any) {
    const statusCode = Number(error?.response?.status || error?.statusCode || 500);
    if (statusCode === 404) {
      throw createError({
        statusCode: 404,
        statusMessage: "Article not found",
      });
    }

    logBackendFallback("article-detail-api", error);
    throw createError({
      statusCode: 502,
      statusMessage: "Failed to load article",
    });
  }
});
