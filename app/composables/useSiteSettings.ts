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

type NavItem = {
  label: string;
  to: string;
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
  siteIcp: string;
  siteCreateTime: string;
  themeBackground: string;
  themeHeadmsg: string;
  themeNav: NavItem[];
  themeWifes: WifeProfile[];
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
  siteIcp: "",
  siteCreateTime: "",
  themeBackground: "/images/background.png",
  themeHeadmsg: "✨",
  themeNav: [
    { label: "关于本站", to: "/about" },
    { label: "友链", to: "/friends" },
  ],
  themeWifes: [],
  userName: "UEGEE",
  userDesc: "一个长期主义者，记录技术、生活和创作。",
  userHeadpic: "/images/head.jpg",
  userSocialLink: {
    github: "#",
    feed: "/feed.xml",
  },
};

function asString(value: unknown, fallback = "") {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
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

function resolveSiteSettings(items: SettingApiItem[]) {
  const map = buildSettingMap(items);

  const themeNavRecord = parseJsonObject(map.theme_nav);
  const themeNav = Object.entries(themeNavRecord)
    .map(([label, to]) => ({
      label: asString(label).trim(),
      to: normalizeLink(asString(to).trim()),
    }))
    .filter((item) => item.label && item.to);

  const socialRecord = parseJsonObject(map.user_social_link);
  const socialLinks = Object.fromEntries(
    Object.entries(socialRecord)
      .map(([key, value]) => [key, normalizeLink(asString(value))])
      .filter(([, value]) => Boolean(value)),
  );

  const userDescRaw = asString(map.user_desc, DEFAULT_SITE_SETTINGS.userDesc);
  const userDesc = userDescRaw.replace(/\\n/g, "\n");

  const themeWifes = parseThemeWifes(map.theme_wifes);

  return {
    siteTitle: asString(map.site_title, DEFAULT_SITE_SETTINGS.siteTitle),
    siteDesc: asString(map.site_desc, DEFAULT_SITE_SETTINGS.siteDesc),
    siteFavicon: normalizeAssetPath(
      asString(map.site_favicon, DEFAULT_SITE_SETTINGS.siteFavicon),
    ),
    siteUrl: asString(map.site_url, DEFAULT_SITE_SETTINGS.siteUrl),
    siteIcp: asString(map.site_icp, DEFAULT_SITE_SETTINGS.siteIcp),
    siteCreateTime: asString(map.site_createtime, DEFAULT_SITE_SETTINGS.siteCreateTime),
    themeBackground: normalizeAssetPath(
      asString(map.theme_background, DEFAULT_SITE_SETTINGS.themeBackground),
    ),
    themeHeadmsg: asString(map.theme_headmsg, DEFAULT_SITE_SETTINGS.themeHeadmsg),
    themeNav: themeNav.length ? themeNav : DEFAULT_SITE_SETTINGS.themeNav,
    themeWifes: themeWifes.length ? themeWifes : DEFAULT_SITE_SETTINGS.themeWifes,
    userName: asString(map.user_name, DEFAULT_SITE_SETTINGS.userName),
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
      const response = await $fetch<SettingApiResponse>("/api/setting");
      return resolveSiteSettings(response.data ?? []);
    },
    {
      default: () => ({ ...DEFAULT_SITE_SETTINGS }),
      server: true,
      lazy: false,
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
