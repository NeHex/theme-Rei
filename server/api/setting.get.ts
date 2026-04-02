type SettingApiItem = {
  setting_key: string;
  setting_type: "string" | "int" | "float" | "boolean" | "json";
  setting_content: unknown;
  description: string | null;
  updated_at: string;
  created_at: string;
};

type SettingApiResponse = {
  data: SettingApiItem[];
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
    const response = await $fetch<SettingApiResponse>(
      `${normalizeBaseUrl(String(apiBase))}/setting`,
      {
        method: "GET",
        timeout: 8000,
      },
    );

    return response;
  } catch (error) {
    console.error("[setting-api] failed to fetch settings", error);
    return { data: [] as SettingApiItem[] };
  }
});
