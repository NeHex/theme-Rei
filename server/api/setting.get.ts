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

import { backendFetch } from "../utils/backendFetch";

export default cachedEventHandler(async () => {
  try {
    return await backendFetch<SettingApiResponse>("/setting", { method: "GET" });
  } catch (error) {
    console.error("[setting-api] failed to fetch settings", error);
    return { data: [] as SettingApiItem[] };
  }
}, {
  maxAge: 300,
  swr: true,
  name: "api:setting",
});
