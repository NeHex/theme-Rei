type SettingApiItem = {
  setting_key: string;
  setting_type: "string" | "int" | "float" | "boolean" | "json";
  setting_content: unknown;
};

type SettingApiResponse = {
  data: SettingApiItem[];
};

type FriendExchangeInfoResponse = {
  data: {
    site_title: string;
    site_url: string;
    site_icon: string;
    site_description: string;
  };
};

import { backendFetch, logBackendFallback } from "../utils/backendFetch";

function asString(value: unknown, fallback = "") {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return fallback;
}

function parseByType(type: SettingApiItem["setting_type"], content: unknown) {
  if (type === "boolean") {
    if (typeof content === "boolean") return content;
    if (typeof content === "string") return content.trim().toLowerCase() === "true";
    if (typeof content === "number") return content !== 0;
    return false;
  }

  if (type === "int") {
    if (typeof content === "number") return Math.trunc(content);
    const parsed = Number.parseInt(asString(content), 10);
    return Number.isNaN(parsed) ? 0 : parsed;
  }

  if (type === "float") {
    if (typeof content === "number") return content;
    const parsed = Number.parseFloat(asString(content));
    return Number.isNaN(parsed) ? 0 : parsed;
  }

  if (type === "json") {
    if (typeof content === "string") {
      try {
        return JSON.parse(content);
      } catch {
        return content;
      }
    }
    return content;
  }

  return content;
}

function pickFirstText(map: Record<string, unknown>, keys: string[], fallback = "") {
  for (const key of keys) {
    const value = asString(map[key]).trim();
    if (value) return value;
  }
  return fallback;
}

function buildSettingMap(items: SettingApiItem[]) {
  const map: Record<string, unknown> = {};
  for (const item of items) {
    map[item.setting_key] = parseByType(item.setting_type, item.setting_content);
  }
  return map;
}

export default defineEventHandler(async (): Promise<FriendExchangeInfoResponse> => {
  try {
    return await backendFetch<FriendExchangeInfoResponse>("/friend-exchange-info", { method: "GET" });
  } catch (error) {
    logBackendFallback("friend-exchange-info-api", error);
  }

  try {
    const response = await backendFetch<SettingApiResponse>("/setting", { method: "GET" });
    const map = buildSettingMap(response.data ?? []);

    const siteTitle = asString(map.site_title, "").trim();
    const siteUrl = asString(map.site_url, "").trim();
    const siteFavicon = asString(map.site_favicon, "").trim();
    const siteDesc = asString(map.site_desc, asString(map.site_description, "")).trim();

    return {
      data: {
        site_title: pickFirstText(
          map,
          [
            "friend_exchange_site_title",
            "friends_exchange_site_title",
            "friend_site_title",
            "friends_site_title",
            "friend_link_site_title",
          ],
          siteTitle,
        ),
        site_url: pickFirstText(
          map,
          [
            "friend_exchange_site_url",
            "friends_exchange_site_url",
            "friend_site_url",
            "friends_site_url",
            "friend_link_site_url",
          ],
          siteUrl,
        ),
        site_icon: pickFirstText(
          map,
          [
            "friend_exchange_site_icon",
            "friends_exchange_site_icon",
            "friend_site_icon",
            "friends_site_icon",
            "friend_link_site_icon",
          ],
          siteFavicon,
        ),
        site_description: pickFirstText(
          map,
          [
            "friend_exchange_site_description",
            "friends_exchange_site_description",
            "friend_site_description",
            "friends_site_description",
            "friend_link_site_description",
            "friend_site_desc",
            "friends_site_desc",
          ],
          siteDesc,
        ),
      },
    };
  } catch (error) {
    logBackendFallback("friend-exchange-info-settings-fallback", error);
    return {
      data: {
        site_title: "",
        site_url: "",
        site_icon: "",
        site_description: "",
      },
    };
  }
});
