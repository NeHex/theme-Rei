type FriendApiItem = {
  id: number;
  title: string;
  description: string | null;
  category: string;
  favicon: string | null;
  url: string;
  status: "ok" | "missing" | "blocked";
  create_time: string;
};

type FriendApiResponse = {
  data: FriendApiItem[];
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
    const response = await $fetch<FriendApiResponse>(
      `${normalizeBaseUrl(String(apiBase))}/friend`,
      {
        method: "GET",
        timeout: 12000,
        retry: 1,
        retryDelay: 250,
      },
    );

    return response;
  } catch (error) {
    console.error("[friend-api] failed to fetch friends", error);
    return { data: [] as FriendApiItem[] };
  }
});

