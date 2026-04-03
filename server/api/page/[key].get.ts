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

type PageDetailApiResponse = {
  data: PageApiItem;
};

function normalizeBaseUrl(baseUrl: string) {
  return baseUrl.replace(/\/+$/, "");
}

export default defineEventHandler(async (event) => {
  const routeKey = String(getRouterParam(event, "key") ?? "").trim();
  if (!routeKey) {
    throw createError({ statusCode: 400, statusMessage: "Missing page key" });
  }

  const runtimeConfig = useRuntimeConfig();
  const apiBase =
    runtimeConfig.settingsApiBase ||
    runtimeConfig.public.settingsApiBase ||
    "http://127.0.0.1:7878";

  try {
    const response = await $fetch<PageDetailApiResponse>(
      `${normalizeBaseUrl(String(apiBase))}/page/${encodeURIComponent(routeKey)}`,
      {
        method: "GET",
        timeout: 12000,
        retry: 1,
        retryDelay: 250,
      },
    );

    return response;
  } catch (error: any) {
    const statusCode = Number(error?.statusCode || error?.response?.status || 500);
    const statusMessage = error?.statusMessage || error?.data?.detail || "Page fetch failed";
    throw createError({ statusCode, statusMessage });
  }
});
