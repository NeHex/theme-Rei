type ArticleApiItem = {
  id: number;
  title: string;
  articleTopImage: string | null;
  class: string;
  read: number;
  lastEditTime: string;
  tag: string | null;
  top: number;
  content: string | null;
};

type ArticleApiResponse = {
  data: ArticleApiItem[];
};

function normalizeBaseUrl(baseUrl: string) {
  return baseUrl.replace(/\/+$/, "");
}

export default defineEventHandler(async () => {
  const runtimeConfig = useRuntimeConfig();
  const apiBase =
    runtimeConfig.settingsApiBase ||
    runtimeConfig.public.settingsApiBase ||
    "http://127.0.0.1:7878";

  try {
    const response = await $fetch<ArticleApiResponse>(
      `${normalizeBaseUrl(String(apiBase))}/article`,
      {
        method: "GET",
        timeout: 12000,
        retry: 1,
        retryDelay: 250,
      },
    );

    return response;
  } catch (error) {
    console.error("[article-api] failed to fetch articles", error);
    return { data: [] as ArticleApiItem[] };
  }
});

