import { logBackendFallback } from "../utils/backendFetch";

type SettingApiItem = {
  setting_key: string;
  setting_type: "string" | "int" | "float" | "boolean" | "json";
  setting_content: unknown;
};

type SettingApiResponse = {
  data: SettingApiItem[];
};

function asString(value: unknown, fallback = "") {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return fallback;
}

function normalizeUrlBase(raw: string) {
  return raw.replace(/\/+$/, "");
}

function buildSettingMap(items: SettingApiItem[]) {
  const map: Record<string, unknown> = {};
  for (const item of items) {
    map[item.setting_key] = item.setting_content;
  }
  return map;
}

export default defineEventHandler(async (event) => {
  setHeader(event, "content-type", "text/plain; charset=utf-8");
  setHeader(event, "cache-control", "public, max-age=600, s-maxage=600");

  const requestUrl = getRequestURL(event);
  let settingResponse: SettingApiResponse = { data: [] };

  try {
    settingResponse = await $fetch<SettingApiResponse>("/api/setting");
  } catch (error) {
    logBackendFallback("robots-route", error);
  }

  const settingsMap = buildSettingMap(settingResponse.data ?? []);
  const configuredSiteUrl = asString(settingsMap.site_url, "").trim();
  const fallbackSiteUrl = `${requestUrl.protocol}//${requestUrl.host}`;
  const siteUrl = normalizeUrlBase(configuredSiteUrl || fallbackSiteUrl);

  return [
    "User-agent: *",
    "Allow: /",
    "Disallow: /admin",
    "Disallow: /admin-api",
    "",
    `Sitemap: ${siteUrl}/sitemap.xml`,
    "",
  ].join("\n");
});
