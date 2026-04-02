type AlbumApiItem = {
  id: number;
  title: string;
  cover: string | null;
  class: string;
  like_count: number;
  img_urls: string | null;
  create_time: string;
  update_time: string;
};

type AlbumApiResponse = {
  data: AlbumApiItem[];
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
    const response = await $fetch<AlbumApiResponse>(
      `${normalizeBaseUrl(String(apiBase))}/album`,
      {
        method: "GET",
        timeout: 8000,
      },
    );

    return response;
  } catch (error) {
    console.error("[album-api] failed to fetch albums", error);
    return { data: [] as AlbumApiItem[] };
  }
});
