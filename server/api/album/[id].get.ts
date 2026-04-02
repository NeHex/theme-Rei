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

type AlbumDetailApiResponse = {
  data: AlbumApiItem;
};

function normalizeBaseUrl(baseUrl: string) {
  return baseUrl.replace(/\/+$/, "");
}

export default defineEventHandler(async (event) => {
  const albumId = getRouterParam(event, "id");
  if (!albumId) {
    throw createError({
      statusCode: 400,
      statusMessage: "Missing album id",
    });
  }

  const runtimeConfig = useRuntimeConfig();
  const apiBase =
    runtimeConfig.settingsApiBase ||
    runtimeConfig.public.settingsApiBase ||
    "http://127.0.0.1:7878";

  try {
    const response = await $fetch<AlbumDetailApiResponse>(
      `${normalizeBaseUrl(String(apiBase))}/album/${albumId}`,
      {
        method: "GET",
        timeout: 8000,
      },
    );

    return response;
  } catch (error: any) {
    const statusCode = Number(error?.response?.status || error?.statusCode || 500);
    if (statusCode === 404) {
      throw createError({
        statusCode: 404,
        statusMessage: "Album not found",
      });
    }

    console.error("[album-detail-api] failed to fetch album", error);
    throw createError({
      statusCode: 502,
      statusMessage: "Failed to load album",
    });
  }
});
