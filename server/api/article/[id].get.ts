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

function normalizeBaseUrl(baseUrl: string) {
  return baseUrl.replace(/\/+$/, "");
}

export default defineEventHandler(async (event) => {
  const articleId = getRouterParam(event, "id");
  if (!articleId) {
    throw createError({
      statusCode: 400,
      statusMessage: "Missing article id",
    });
  }

  const runtimeConfig = useRuntimeConfig();
  const apiBase =
    runtimeConfig.settingsApiBase ||
    runtimeConfig.public.settingsApiBase ||
    "http://127.0.0.1:7878";

  try {
    const response = await $fetch<ArticleDetailApiResponse>(
      `${normalizeBaseUrl(String(apiBase))}/article/${articleId}`,
      {
        method: "GET",
        timeout: 12000,
        retry: 1,
        retryDelay: 250,
      },
    );

    return response;
  } catch (error: any) {
    const statusCode = Number(error?.response?.status || error?.statusCode || 500);
    if (statusCode === 404) {
      throw createError({
        statusCode: 404,
        statusMessage: "Article not found",
      });
    }

    console.error("[article-detail-api] failed to fetch article", error);
    throw createError({
      statusCode: 502,
      statusMessage: "Failed to load article",
    });
  }
});
