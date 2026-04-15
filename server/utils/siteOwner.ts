import { backendFetch } from "./backendFetch";

type SettingValueType = "string" | "int" | "float" | "boolean" | "json";

type SettingApiItem = {
  setting_key: string;
  setting_type: SettingValueType;
  setting_content: unknown;
  description: string | null;
  updated_at: string;
  created_at: string;
};

type SettingApiResponse = {
  data: SettingApiItem[];
};

type ThemeProfile = Record<string, unknown>;

type SettingThemeApiData = {
  active_profile?: string | null;
  profiles?: Record<string, ThemeProfile> | null;
  current?: ThemeProfile | null;
};

type SettingThemeApiResponse = {
  data: SettingThemeApiData | null;
};

export type SiteOwnerProfile = {
  avatar: string;
  nickname: string;
  homepage: string;
  email: string;
  bio: string;
};

const DEFAULT_SITE_OWNER: SiteOwnerProfile = {
  avatar: "/images/head.jpg",
  nickname: "站长",
  homepage: "",
  email: "",
  bio: "",
};

type SiteOwnerProfileApiResponse =
  | SiteOwnerProfile
  | {
      data?: Partial<SiteOwnerProfile> | null;
    };

function asString(value: unknown, fallback = "") {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return fallback;
}

function parseByType(type: SettingValueType, content: unknown) {
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

function buildSettingMap(items: SettingApiItem[]) {
  const map: Record<string, unknown> = {};
  for (const item of items) {
    map[item.setting_key] = parseByType(item.setting_type, item.setting_content);
  }
  return map;
}

function parseJsonObject(value: unknown) {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  if (typeof value !== "string") return {};
  const trimmed = value.trim();
  if (!trimmed) return {};
  if (!trimmed.startsWith("{") || !trimmed.endsWith("}")) return {};

  try {
    const parsed = JSON.parse(trimmed);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    return {};
  }

  return {};
}

function parseThemeCurrentProfile(themeData: SettingThemeApiData | null | undefined) {
  function resolveThemeProfile(raw: unknown, depth = 0): Record<string, unknown> {
    if (depth > 3) return {};
    const payload = parseJsonObject(raw);
    if (!Object.keys(payload).length) return {};

    const current = parseJsonObject(payload.current);
    if (Object.keys(current).length) return current;

    const profiles = parseJsonObject(payload.profiles);
    const activeProfile = asString(payload.active_profile).trim();
    if (activeProfile) {
      const matched = parseJsonObject(profiles[activeProfile]);
      if (Object.keys(matched).length) return matched;
    }

    for (const value of Object.values(profiles)) {
      const profile = parseJsonObject(value);
      if (Object.keys(profile).length) return profile;
    }

    const nested = resolveThemeProfile(payload.data, depth + 1);
    if (Object.keys(nested).length) return nested;

    const hasEnvelope =
      Object.prototype.hasOwnProperty.call(payload, "current") ||
      Object.prototype.hasOwnProperty.call(payload, "profiles") ||
      Object.prototype.hasOwnProperty.call(payload, "active_profile") ||
      Object.prototype.hasOwnProperty.call(payload, "data");

    return hasEnvelope ? {} : payload;
  }

  return resolveThemeProfile(themeData);
}

function normalizeAssetPath(value: unknown) {
  const trimmed = asString(value).trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("./")) return trimmed.slice(1);
  if (trimmed.startsWith("images/")) return `/${trimmed}`;
  return trimmed;
}

function normalizeHomepage(value: unknown) {
  const trimmed = asString(value).trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("/")) return trimmed;
  if (trimmed.startsWith("//")) return `https:${trimmed}`;
  if (trimmed.includes("://")) {
    if (/^https?:\/\//i.test(trimmed)) return trimmed;
    return "";
  }
  return `https://${trimmed}`;
}

function normalizeEmail(value: unknown) {
  const trimmed = asString(value).trim();
  if (!trimmed) return "";
  const email = trimmed.replace(/^mailto:/i, "").trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "";
  return email;
}

function pickFirstNonEmpty<T>(
  source: Record<string, unknown>,
  keys: string[],
  normalize: (value: unknown) => T | "",
) {
  for (const key of keys) {
    const normalized = normalize(source[key]);
    if (normalized) return normalized;
  }
  return "" as T | "";
}

function normalizeSiteOwnerApiPayload(payload: SiteOwnerProfileApiResponse): SiteOwnerProfile | null {
  const source = (payload as { data?: Partial<SiteOwnerProfile> | null })?.data
    ?? (payload as Partial<SiteOwnerProfile> | null)
    ?? null;
  if (!source || typeof source !== "object") return null;

  return {
    avatar: normalizeAssetPath(source.avatar) || DEFAULT_SITE_OWNER.avatar,
    nickname: asString(source.nickname, DEFAULT_SITE_OWNER.nickname).trim() || DEFAULT_SITE_OWNER.nickname,
    homepage: normalizeHomepage(source.homepage),
    email: normalizeEmail(source.email),
    bio: asString(source.bio).replace(/\\n/g, "\n"),
  };
}

async function fetchSiteOwnerFromBackendApi() {
  const endpoints = ["/site-owner", "/setting/site-owner"];

  for (const endpoint of endpoints) {
    try {
      const response = await backendFetch<SiteOwnerProfileApiResponse>(endpoint, {
        method: "GET",
      });
      const normalized = normalizeSiteOwnerApiPayload(response);
      if (normalized) return normalized;
    } catch {
      // Ignore and continue fallback chain.
    }
  }

  return null;
}

async function resolveSiteOwnerProfileFromSettings(): Promise<SiteOwnerProfile> {
  const [settingResponse, themeResponse] = await Promise.all([
    backendFetch<SettingApiResponse>("/setting", { method: "GET" }).catch(() => ({ data: [] as SettingApiItem[] })),
    backendFetch<SettingThemeApiResponse>("/setting/theme", { method: "GET" }).catch(() => ({ data: null })),
  ]);

  const settingMap = buildSettingMap(settingResponse.data ?? []);
  const currentThemeProfile = parseThemeCurrentProfile(themeResponse.data);
  const socialRecord = parseJsonObject(
    currentThemeProfile.social_link ?? currentThemeProfile.socialLink,
  );

  const nickname = asString(
    settingMap.user_name,
    asString(settingMap.site_title, DEFAULT_SITE_OWNER.nickname),
  ).trim() || DEFAULT_SITE_OWNER.nickname;

  const avatar = normalizeAssetPath(
    settingMap.user_headpic,
  ) || DEFAULT_SITE_OWNER.avatar;

  const homepage =
    pickFirstNonEmpty<string>(
      socialRecord,
      ["homepage", "home", "site", "website", "blog"],
      normalizeHomepage,
    )
    || normalizeHomepage(settingMap.user_homepage)
    || normalizeHomepage(settingMap.site_url);

  const email =
    pickFirstNonEmpty<string>(
      socialRecord,
      ["email", "mail"],
      normalizeEmail,
    )
    || normalizeEmail(settingMap.user_email)
    || normalizeEmail(settingMap.site_email)
    || normalizeEmail(settingMap.admin_email);

  const bio = asString(
    settingMap.user_desc,
    asString(settingMap.site_desc, DEFAULT_SITE_OWNER.bio),
  ).replace(/\\n/g, "\n");

  return {
    avatar,
    nickname,
    homepage,
    email,
    bio,
  };
}

export async function resolveSiteOwnerProfile(): Promise<SiteOwnerProfile> {
  const backendProfile = await fetchSiteOwnerFromBackendApi();
  if (backendProfile) return backendProfile;
  return resolveSiteOwnerProfileFromSettings();
}
