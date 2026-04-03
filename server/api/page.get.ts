type PageApiItem = {
  id: number;
  page_key: string;
  title: string;
  cover_image: string | null;
  content: string | null;
  sort: number;
  status: number;
  create_time: string;
  update_time: string;
};

type PageApiResponse = {
  data: PageApiItem[];
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
    const response = await $fetch<PageApiResponse>(
      `${normalizeBaseUrl(String(apiBase))}/page`,
      {
        method: "GET",
        timeout: 12000,
        retry: 1,
        retryDelay: 250,
      },
    );

    return response;
  } catch (error) {
    console.error("[page-api] failed to fetch pages", error);
    return { data: [] as PageApiItem[] };
  }
});
