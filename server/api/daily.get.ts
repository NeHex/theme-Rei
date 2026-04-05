type DailyApiItem = {
  id: number;
  title: string;
  content: string | null;
  create_time: string;
  weather: string | null;
};

type DailyApiResponse = {
  data: DailyApiItem[];
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
    const response = await $fetch<DailyApiResponse>(
      `${normalizeBaseUrl(String(apiBase))}/daily`,
      {
        method: "GET",
        timeout: 12000,
        retry: 1,
        retryDelay: 250,
      },
    );

    return response;
  } catch (error) {
    console.error("[daily-api] failed to fetch dailies", error);
    return { data: [] as DailyApiItem[] };
  }
});

