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

type NavItem = {
  label: string;
  to: string;
};

export type AboutMapPoint = {
  label: string;
  coords: [number, number];
};

export type WifeProfile = {
  cnName: string;
  otherName: string;
  image: string;
};

export type SiteSettings = {
  siteTitle: string;
  siteDesc: string;
  siteFavicon: string;
  siteUrl: string;
  friendExchangeSiteTitle: string;
  friendExchangeSiteUrl: string;
  friendExchangeSiteIcon: string;
  friendExchangeSiteDescription: string;
  siteIcp: string;
  siteCreateTime: string;
  themeBackground: string;
  themeHeadmsg: string;
  themeNav: NavItem[];
  themeNavTravelling: boolean;
  themeAboutPages: Record<string, unknown>;
  themeAboutMapPoints: AboutMapPoint[];
  themeWifes: WifeProfile[];
  commentMemes: Record<string, Record<string, string>>;
  userName: string;
  userDesc: string;
  userHeadpic: string;
  userSocialLink: Record<string, string>;
};

const DEFAULT_SITE_SETTINGS: SiteSettings = {
  siteTitle: "NeHex",
  siteDesc: "Notes on tech, ideas, and long-term making.",
  siteFavicon: "/favicon.ico",
  siteUrl: "http://localhost:3000",
  friendExchangeSiteTitle: "NeHex",
  friendExchangeSiteUrl: "http://localhost:3000",
  friendExchangeSiteIcon: "/favicon.ico",
  friendExchangeSiteDescription: "Notes on tech, ideas, and long-term making.",
  siteIcp: "",
  siteCreateTime: "",
  themeBackground: "/images/background.png",
  themeHeadmsg: "✨",
  themeNav: [
    { label: "关于本站", to: "/about" },
    { label: "友链", to: "/friends" },
  ],
  themeNavTravelling: true,
  themeAboutPages: {},
  themeAboutMapPoints: [
    { label: "天津", coords: [117.200983, 39.084158] },
    { label: "山东", coords: [118.000923, 36.675807] },
  ],
  themeWifes: [],
  commentMemes: {},
  userName: "UEGEE",
  userDesc: "一个长期主义者，记录技术、生活和创作。",
  userHeadpic: "/images/head.jpg",
  userSocialLink: {
    github: "#",
    feed: "/feed",
  },
};

function asString(value: unknown, fallback = "") {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return fallback;
}

function asBoolean(value: unknown, fallback = false) {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  const normalized = asString(value).trim().toLowerCase();
  if (!normalized) return fallback;
  if (["1", "true", "yes", "on"].includes(normalized)) return true;
  if (["0", "false", "no", "off"].includes(normalized)) return false;
  return fallback;
}

function pickFirstText(map: Record<string, unknown>, keys: string[], fallback = "") {
  for (const key of keys) {
    const value = asString(map[key]).trim();
    if (value) return value;
  }
  return fallback;
}

function normalizeAssetPath(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("./")) return trimmed.slice(1);
  if (trimmed.startsWith("images/")) return `/${trimmed}`;
  return trimmed;
}

function normalizeLink(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("./")) return trimmed.slice(1);
  if (trimmed.startsWith("/")) return trimmed;
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) return trimmed;
  if (trimmed.startsWith("mailto:")) return trimmed;
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return `mailto:${trimmed}`;
  return `/${trimmed.replace(/^\/+/, "")}`;
}

function normalizeSocialLink(key: string, value: unknown) {
  const lowerKey = key.trim().toLowerCase();
  if (typeof value === "boolean") {
    if ((lowerKey === "feed" || lowerKey === "rss") && value) {
      return "/feed";
    }
    return "";
  }

  const normalized = normalizeLink(asString(value));
  if ((lowerKey === "feed" || lowerKey === "rss") && normalized.replace(/\/+$/, "") === "/feed.xml") {
    return "/feed";
  }
  return normalized;
}

function normalizeSocialKey(key: string) {
  const lowerKey = key.trim().toLowerCase();
  if (lowerKey === "mail") return "email";
  if (lowerKey === "rss") return "feed";
  return lowerKey;
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

function pickWifeRecord(value: unknown): WifeProfile | null {
  if (typeof value === "string") {
    const image = normalizeAssetPath(value);
    if (!image) return null;
    return {
      cnName: "",
      otherName: "",
      image,
    };
  }

  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const record = value as Record<string, unknown>;
  const imageCandidate =
    record.image ??
    record.src ??
    record.url ??
    record.cover ??
    record.pic ??
    record.img;
  const cnNameCandidate =
    record.cn_name ??
    record.cnName ??
    record.name ??
    record.title ??
    record.label;
  const otherNameCandidate =
    record.other_name ??
    record.otherName ??
    record.alias ??
    record.subtitle ??
    record.subTitle;

  const image = normalizeAssetPath(asString(imageCandidate));
  if (!image) return null;

  return {
    cnName: asString(cnNameCandidate).trim(),
    otherName: asString(otherNameCandidate).trim(),
    image,
  };
}

function parseThemeWifes(value: unknown): WifeProfile[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => pickWifeRecord(item))
      .filter((item): item is WifeProfile => Boolean(item));
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return [];

    if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
      try {
        const parsed = JSON.parse(trimmed);
        return parseThemeWifes(parsed);
      } catch {
        // ignore invalid JSON and fallback to split parsing
      }
    }

    return trimmed
      .split(/[\n,]/g)
      .map((item) => pickWifeRecord(item))
      .filter((item): item is WifeProfile => Boolean(item));
  }

  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;

    const arrayKeys = ["images", "items", "list", "data", "cards", "wifes"];
    for (const key of arrayKeys) {
      if (Array.isArray(record[key])) {
        return parseThemeWifes(record[key]);
      }
    }

    return Object.values(record)
      .map((item) => pickWifeRecord(item))
      .filter((item): item is WifeProfile => Boolean(item));
  }

  return [];
}

function parseThemeCommentMemes(value: unknown) {
  const normalizedGroups: Record<string, Record<string, string>> = {};
  const rootRecord = parseJsonObject(value);

  for (const [groupKeyRaw, groupValueRaw] of Object.entries(rootRecord)) {
    const groupKey = asString(groupKeyRaw).trim();
    if (!groupKey) continue;

    const groupRecord = parseJsonObject(groupValueRaw);
    const normalizedGroup: Record<string, string> = {};
    for (const [codeRaw, urlRaw] of Object.entries(groupRecord)) {
      const code = asString(codeRaw).trim();
      const url = normalizeAssetPath(asString(urlRaw).trim());
      if (!code || !url) continue;
      normalizedGroup[code] = url;
    }

    if (Object.keys(normalizedGroup).length > 0) {
      normalizedGroups[groupKey] = normalizedGroup;
    }
  }

  return normalizedGroups;
}

function parseCoordPair(value: unknown): [number, number] | null {
  if (Array.isArray(value) && value.length >= 2) {
    const lng = Number(value[0]);
    const lat = Number(value[1]);
    if (
      Number.isFinite(lng) &&
      Number.isFinite(lat) &&
      lng >= -180 &&
      lng <= 180 &&
      lat >= -90 &&
      lat <= 90
    ) {
      return [lng, lat];
    }
    return null;
  }

  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    const lng = Number(record.lng ?? record.lon ?? record.longitude ?? record.x);
    const lat = Number(record.lat ?? record.latitude ?? record.y);
    if (
      Number.isFinite(lng) &&
      Number.isFinite(lat) &&
      lng >= -180 &&
      lng <= 180 &&
      lat >= -90 &&
      lat <= 90
    ) {
      return [lng, lat];
    }
    return null;
  }

  if (typeof value !== "string") return null;
  const matches = value.match(/-?\d+(?:\.\d+)?/g);
  if (!matches || matches.length < 2) return null;

  const lng = Number(matches[0]);
  const lat = Number(matches[1]);
  if (
    !Number.isFinite(lng) ||
    !Number.isFinite(lat) ||
    lng < -180 ||
    lng > 180 ||
    lat < -90 ||
    lat > 90
  ) {
    return null;
  }
  return [lng, lat];
}

function parseThemeAboutMapPoints(value: unknown): AboutMapPoint[] {
  const aboutRecord = parseJsonObject(value);
  const mapRecord = parseJsonObject(aboutRecord.map);

  return Object.entries(mapRecord)
    .map(([label, coordsRaw]) => {
      const coords = parseCoordPair(coordsRaw);
      if (!coords) return null;
      const trimmedLabel = asString(label).trim();
      if (!trimmedLabel) return null;
      return {
        label: trimmedLabel,
        coords,
      } satisfies AboutMapPoint;
    })
    .filter((item): item is AboutMapPoint => Boolean(item));
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

function resolveSiteSettings(items: SettingApiItem[], themeData: SettingThemeApiData | null = null) {
  const map = buildSettingMap(items);
  const currentThemeProfile = parseThemeCurrentProfile(themeData);
  const siteTitle = asString(map.site_title, DEFAULT_SITE_SETTINGS.siteTitle);
  const siteDesc = asString(
    map.site_desc,
    asString(map.site_description, DEFAULT_SITE_SETTINGS.siteDesc),
  );

  const profileNavRecord = parseJsonObject(
    currentThemeProfile.nav_border ??
      currentThemeProfile.theme_nav ??
      currentThemeProfile.nav,
  );
  const settingNavRecord = parseJsonObject(map.theme_nav);
  const hasProfileTravelling = Object.prototype.hasOwnProperty.call(profileNavRecord, "travelling");
  const hasSettingTravelling = Object.prototype.hasOwnProperty.call(settingNavRecord, "travelling");
  const themeNavTravelling = hasProfileTravelling
    ? asBoolean(profileNavRecord.travelling, DEFAULT_SITE_SETTINGS.themeNavTravelling)
    : hasSettingTravelling
      ? asBoolean(settingNavRecord.travelling, DEFAULT_SITE_SETTINGS.themeNavTravelling)
      : DEFAULT_SITE_SETTINGS.themeNavTravelling;
  const themeNavRecord = Object.keys(profileNavRecord).length ? profileNavRecord : settingNavRecord;
  const themeNav = Object.entries(themeNavRecord)
    .filter(([label, to]) => label.trim().toLowerCase() !== "travelling" && typeof to !== "boolean")
    .map(([label, to]) => ({
      label: asString(label).trim(),
      to: normalizeLink(asString(to).trim()),
    }))
    .filter((item) => item.label && item.to)
    .filter((item) => {
      const route = item.to.toLowerCase().replace(/\/+$/, "");
      return route !== "/wifes";
    });

  const socialRecord = parseJsonObject(currentThemeProfile.social_link);
  const socialLinks = Object.fromEntries(
    Object.entries(socialRecord)
      .map(([key, value]) => [normalizeSocialKey(key), normalizeSocialLink(key, value)])
      .filter(([, value]) => Boolean(value)),
  );

  const userDescRaw = asString(
    map.user_desc,
    siteDesc || DEFAULT_SITE_SETTINGS.userDesc,
  );
  const userDesc = userDescRaw.replace(/\\n/g, "\n");

  const profileBackground = normalizeAssetPath(
    asString(
      currentThemeProfile.background_images,
      asString(currentThemeProfile.background, ""),
    ),
  );
  const profileHeadmsg = asString(currentThemeProfile.headmsg, "");

  const profileAboutPages = parseJsonObject(
    currentThemeProfile.about_page ??
      currentThemeProfile.about_pages ??
      currentThemeProfile.theme_about_pages,
  );
  const settingAboutPages = parseJsonObject(map.theme_about_pages);
  const themeAboutPages = Object.keys(profileAboutPages).length ? profileAboutPages : settingAboutPages;
  const profileWifes = parseThemeWifes(
    profileAboutPages.wifes_card ??
      profileAboutPages.wifes ??
      currentThemeProfile.wifes_card ??
      currentThemeProfile.theme_wifes,
  );
  const settingWifes = parseThemeWifes(map.theme_wifes);
  const themeWifes = profileWifes.length ? profileWifes : settingWifes;
  const themeAboutMapPoints = parseThemeAboutMapPoints(themeAboutPages);
  const profileCommentMemes = parseThemeCommentMemes(
    currentThemeProfile.comment_memes ?? currentThemeProfile.commentMemes,
  );
  const settingCommentMemes = parseThemeCommentMemes(
    map.comment_memes ?? map.theme_comment_memes,
  );
  const commentMemes = Object.keys(profileCommentMemes).length
    ? profileCommentMemes
    : settingCommentMemes;
  const friendExchangeSiteTitle = pickFirstText(
    map,
    [
      "friend_site_title",
      "friends_site_title",
      "friend_exchange_site_title",
      "friends_exchange_site_title",
      "friend_link_site_title",
    ],
    siteTitle || DEFAULT_SITE_SETTINGS.friendExchangeSiteTitle,
  );
  const friendExchangeSiteUrl = pickFirstText(
    map,
    [
      "friend_site_url",
      "friends_site_url",
      "friend_exchange_site_url",
      "friends_exchange_site_url",
      "friend_link_site_url",
    ],
    asString(map.site_url, DEFAULT_SITE_SETTINGS.friendExchangeSiteUrl),
  );
  const friendExchangeSiteIcon = normalizeAssetPath(
    pickFirstText(
      map,
      [
        "friend_site_icon",
        "friends_site_icon",
        "friend_exchange_site_icon",
        "friends_exchange_site_icon",
        "friend_link_site_icon",
      ],
      asString(map.site_favicon, DEFAULT_SITE_SETTINGS.friendExchangeSiteIcon),
    ),
  ) || DEFAULT_SITE_SETTINGS.friendExchangeSiteIcon;
  const friendExchangeSiteDescription = pickFirstText(
    map,
    [
      "friend_site_description",
      "friends_site_description",
      "friend_exchange_site_description",
      "friends_exchange_site_description",
      "friend_link_site_description",
      "friend_site_desc",
      "friends_site_desc",
    ],
    siteDesc || DEFAULT_SITE_SETTINGS.friendExchangeSiteDescription,
  );

  return {
    siteTitle,
    siteDesc,
    siteFavicon: normalizeAssetPath(
      asString(map.site_favicon, DEFAULT_SITE_SETTINGS.siteFavicon),
    ),
    siteUrl: asString(map.site_url, DEFAULT_SITE_SETTINGS.siteUrl),
    friendExchangeSiteTitle,
    friendExchangeSiteUrl,
    friendExchangeSiteIcon,
    friendExchangeSiteDescription,
    siteIcp: asString(map.site_icp, DEFAULT_SITE_SETTINGS.siteIcp),
    siteCreateTime: asString(map.site_createtime, DEFAULT_SITE_SETTINGS.siteCreateTime),
    themeBackground: profileBackground || DEFAULT_SITE_SETTINGS.themeBackground,
    themeHeadmsg: profileHeadmsg || DEFAULT_SITE_SETTINGS.themeHeadmsg,
    themeNav: themeNav.length ? themeNav : DEFAULT_SITE_SETTINGS.themeNav,
    themeNavTravelling,
    themeAboutPages,
    themeAboutMapPoints: themeAboutMapPoints.length
      ? themeAboutMapPoints
      : DEFAULT_SITE_SETTINGS.themeAboutMapPoints,
    themeWifes: themeWifes.length ? themeWifes : DEFAULT_SITE_SETTINGS.themeWifes,
    commentMemes,
    userName: asString(map.user_name, siteTitle || DEFAULT_SITE_SETTINGS.userName),
    userDesc,
    userHeadpic: normalizeAssetPath(
      asString(map.user_headpic, DEFAULT_SITE_SETTINGS.userHeadpic),
    ),
    userSocialLink: Object.keys(socialLinks).length
      ? socialLinks
      : DEFAULT_SITE_SETTINGS.userSocialLink,
  } satisfies SiteSettings;
}

export function useSiteSettings() {
  const { data, pending, error, refresh } = useAsyncData<SiteSettings>(
    "site-settings",
    async () => {
      const [settingResponse, themeResponse] = await Promise.all([
        $fetch<SettingApiResponse>("/api/setting", { cache: "no-store" }),
        $fetch<SettingThemeApiResponse>("/api/setting/theme", { cache: "no-store" }).catch(() => ({ data: null })),
      ]);

      return resolveSiteSettings(settingResponse.data ?? [], themeResponse.data);
    },
    {
      default: () => ({ ...DEFAULT_SITE_SETTINGS }),
      server: true,
      lazy: true,
    },
  );

  const settings = computed(() => data.value ?? DEFAULT_SITE_SETTINGS);

  return {
    settings,
    pending,
    error,
    refresh,
  };
}
