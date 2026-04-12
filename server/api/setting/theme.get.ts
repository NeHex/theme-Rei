import { backendFetch, logBackendFallback } from "../../utils/backendFetch";

type ThemeProfile = Record<string, unknown>;

type SettingThemeApiData = {
  active_profile?: string | null;
  profiles?: Record<string, ThemeProfile> | null;
  current?: ThemeProfile | null;
};

type SettingThemeApiResponse = {
  data: SettingThemeApiData | null;
};

export default defineEventHandler(async () => {
  try {
    return await backendFetch<SettingThemeApiResponse>("/setting/theme", {
      method: "GET",
    });
  } catch (error) {
    logBackendFallback("setting-theme-api", error);
    return { data: null } satisfies SettingThemeApiResponse;
  }
});
