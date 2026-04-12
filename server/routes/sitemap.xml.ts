import { logBackendFallback } from "../utils/backendFetch";

type ArticleApiItem = {
  id: number;
  lastEditTime: string;
};

type ArticleApiResponse = {
  data: ArticleApiItem[];
};

type PageApiItem = {
  page_key: string;
  status: number | null;
  update_time: string;
};

type PageApiResponse = {
  data: PageApiItem[];
};

type SettingApiItem = {
  setting_key: string;
  setting_type: "string" | "int" | "float" | "boolean" | "json";
  setting_content: unknown;
};

type SettingApiResponse = {
  data: SettingApiItem[];
};

type SitemapEntry = {
  path: string;
  lastmod?: string;
};

function normalizeUrlBase(raw: string) {
  return raw.replace(/\/+$/, "");
}

function normalizeRoutePath(raw: string) {
  const value = (raw || "").trim();
  if (!value) return "";
  if (/^https?:\/\//i.test(value)) return value;
  const normalized = `/${value.replace(/^\/+/, "").replace(/\/+$/, "")}`;
  return normalized === "/" ? "/" : normalized;
}

function xmlEscape(raw: string) {
  return raw
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function toAbsoluteUrl(pathOrUrl: string, siteUrl: string) {
  const value = pathOrUrl.trim();
  if (!value) return "";
  if (/^https?:\/\//i.test(value)) return value;
  return `${normalizeUrlBase(siteUrl)}${value.startsWith("/") ? value : `/${value}`}`;
}

function toW3cDate(dateLike: string | null | undefined) {
  const value = (dateLike || "").trim();
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString();
}

function asString(value: unknown, fallback = "") {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return fallback;
}

function buildSettingMap(items: SettingApiItem[]) {
  const map: Record<string, unknown> = {};
  for (const item of items) {
    map[item.setting_key] = item.setting_content;
  }
  return map;
}

function mergeEntry(
  entries: Map<string, SitemapEntry>,
  path: string,
  lastmod: string | null | undefined = "",
) {
  const normalizedPath = normalizeRoutePath(path);
  if (!normalizedPath) return;

  const normalizedLastmod = toW3cDate(lastmod);
  const current = entries.get(normalizedPath);

  if (!current) {
    entries.set(normalizedPath, {
      path: normalizedPath,
      lastmod: normalizedLastmod || undefined,
    });
    return;
  }

  if (!current.lastmod && normalizedLastmod) {
    current.lastmod = normalizedLastmod;
    return;
  }

  if (current.lastmod && normalizedLastmod) {
    const currentTime = new Date(current.lastmod).getTime();
    const nextTime = new Date(normalizedLastmod).getTime();
    if (nextTime > currentTime) {
      current.lastmod = normalizedLastmod;
    }
  }
}

export default defineEventHandler(async (event) => {
  setHeader(event, "content-type", "application/xml; charset=utf-8");
  setHeader(event, "cache-control", "public, max-age=300, s-maxage=300");

  const requestUrl = getRequestURL(event);
  let settingResponse: SettingApiResponse = { data: [] };
  let articleResponse: ArticleApiResponse = { data: [] };
  let pageResponse: PageApiResponse = { data: [] };

  try {
    [settingResponse, articleResponse, pageResponse] = await Promise.all([
      $fetch<SettingApiResponse>("/api/setting"),
      $fetch<ArticleApiResponse>("/api/article"),
      $fetch<PageApiResponse>("/api/page"),
    ]);
  } catch (error) {
    logBackendFallback("sitemap-route", error);
  }

  const settingsMap = buildSettingMap(settingResponse.data ?? []);
  const configuredSiteUrl = asString(settingsMap.site_url, "").trim();
  const fallbackSiteUrl = `${requestUrl.protocol}//${requestUrl.host}`;
  const siteUrl = configuredSiteUrl || fallbackSiteUrl;

  const entries = new Map<string, SitemapEntry>();
  const staticRoutes = ["/", "/about", "/article", "/archive", "/album", "/daily", "/friends", "/games", "/feed"];

  for (const path of staticRoutes) {
    mergeEntry(entries, path);
  }

  for (const article of articleResponse.data ?? []) {
    const articleId = String(article.id ?? "").trim();
    if (!articleId) continue;
    mergeEntry(entries, `/article/${encodeURIComponent(articleId)}`, article.lastEditTime);
  }

  for (const page of pageResponse.data ?? []) {
    const status = Number(page.status ?? 1);
    if (!Number.isNaN(status) && status !== 1) continue;

    const key = String(page.page_key ?? "").trim().replace(/^\/+|\/+$/g, "");
    if (!key) continue;
    mergeEntry(entries, `/${key}`, page.update_time);
  }

  const urlsXml = [...entries.values()]
    .sort((a, b) => a.path.localeCompare(b.path))
    .map((entry) => {
      const loc = xmlEscape(toAbsoluteUrl(entry.path, siteUrl));
      const lastmod = entry.lastmod ? `\n    <lastmod>${xmlEscape(entry.lastmod)}</lastmod>` : "";
      return `  <url>
    <loc>${loc}</loc>${lastmod}
  </url>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlsXml}
</urlset>
`;
});
