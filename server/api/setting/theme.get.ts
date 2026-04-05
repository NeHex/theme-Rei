import { backendFetch } from "../../utils/backendFetch";

type ThemeProfile = Record<string, unknown>;

type SettingThemeApiData = {
  active_profile?: string | null;
  profiles?: Record<string, ThemeProfile> | null;
  current?: ThemeProfile | null;
};

type SettingThemeApiResponse = {
  data: SettingThemeApiData | null;
};

export default cachedEventHandler(async () => {
  try {
    return await backendFetch<SettingThemeApiResponse>("/setting/theme", {
      method: "GET",
    });
  } catch (error) {
    console.error("[setting-theme-api] failed to fetch theme settings", error);
    return { data: null } satisfies SettingThemeApiResponse;
  }
}, {
  maxAge: 300,
  swr: true,
  name: "api:setting-theme",
});
