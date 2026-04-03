type ArticleApiItem = {
  id: number;
  title: string;
  articleTopImage: string | null;
  class: string;
  read: number;
  lastEditTime: string;
  tag: string | null;
  top: number;
  content: string | null;
};

type ArticleApiResponse = {
  data: ArticleApiItem[];
};

type SettingApiItem = {
  setting_key: string;
  setting_type: "string" | "int" | "float" | "boolean" | "json";
  setting_content: unknown;
};

type SettingApiResponse = {
  data: SettingApiItem[];
};

function normalizeUrlBase(raw: string) {
  return raw.replace(/\/+$/, "");
}

function xmlEscape(raw: string) {
  return raw
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function stripMarkdown(raw: string) {
  return raw
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/!\[.*?\]\(.*?\)/g, " ")
    .replace(/\[(.*?)\]\(.*?\)/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/[*_~>-]+/g, " ")
    .replace(/\r\n/g, "\n")
    .replace(/\n{2,}/g, "\n")
    .replace(/\s+/g, " ")
    .trim();
}

function toRfc822(dateLike: string) {
  const date = new Date(dateLike);
  if (Number.isNaN(date.getTime())) return new Date().toUTCString();
  return date.toUTCString();
}

function normalizeAssetPath(path: string | null | undefined) {
  const value = (path || "").trim();
  if (!value) return "";
  if (value.startsWith("/public/")) return value.slice(7);
  if (value.startsWith("public/")) return `/${value.slice(7)}`;
  if (value.startsWith("./")) return value.slice(1);
  return value;
}

function toAbsoluteUrl(pathOrUrl: string, siteUrl: string) {
  const value = pathOrUrl.trim();
  if (!value) return "";
  if (/^https?:\/\//i.test(value)) return value;
  return `${normalizeUrlBase(siteUrl)}${value.startsWith("/") ? value : `/${value}`}`;
}

function parseTags(raw: string | null | undefined) {
  if (!raw) return [] as string[];
  return raw
    .split(/[，,]/g)
    .map((item) => item.trim())
    .filter(Boolean);
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

export default defineEventHandler(async (event) => {
  setHeader(event, "content-type", "application/rss+xml; charset=utf-8");
  setHeader(event, "cache-control", "public, max-age=300, s-maxage=300");

  const requestUrl = getRequestURL(event);

  const [articleResponse, settingResponse] = await Promise.all([
    $fetch<ArticleApiResponse>("/api/article"),
    $fetch<SettingApiResponse>("/api/setting"),
  ]);

  const settingsMap = buildSettingMap(settingResponse.data ?? []);
  const siteTitle = asString(settingsMap.site_title, "NeHex");
  const siteDesc = asString(settingsMap.site_desc, "NeHex feed");
  const configuredSiteUrl = asString(settingsMap.site_url, "").trim();
  const fallbackSiteUrl = `${requestUrl.protocol}//${requestUrl.host}`;
  const siteUrl = configuredSiteUrl || fallbackSiteUrl;
  const feedUrl = toAbsoluteUrl("/feed", siteUrl);

  const sortedArticles = [...(articleResponse.data ?? [])].sort((a, b) => {
    return new Date(b.lastEditTime).getTime() - new Date(a.lastEditTime).getTime();
  });

  const lastBuildDate = sortedArticles.length
    ? toRfc822(sortedArticles[0].lastEditTime)
    : new Date().toUTCString();

  const itemsXml = sortedArticles
    .map((article) => {
      const title = xmlEscape(article.title || `文章 ${article.id}`);
      const link = toAbsoluteUrl(`/article/${article.id}`, siteUrl);
      const guid = link;
      const pubDate = toRfc822(article.lastEditTime);
      const cover = normalizeAssetPath(article.articleTopImage);
      const coverUrl = cover ? toAbsoluteUrl(cover, siteUrl) : "";

      const plain = stripMarkdown(article.content || "");
      const summary = xmlEscape(plain.slice(0, 220) || "暂无摘要");

      const categories = [
        article.class?.trim(),
        ...parseTags(article.tag),
      ]
        .filter(Boolean)
        .map((category) => `    <category>${xmlEscape(category as string)}</category>`)
        .join("\n");

      const enclosure = coverUrl
        ? `\n    <enclosure url="${xmlEscape(coverUrl)}" type="image/jpeg" />`
        : "";

      return `<item>
    <title>${title}</title>
    <link>${xmlEscape(link)}</link>
    <guid isPermaLink="true">${xmlEscape(guid)}</guid>
    <pubDate>${xmlEscape(pubDate)}</pubDate>
    <description>${summary}</description>
${categories}${enclosure}
  </item>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
  <title>${xmlEscape(siteTitle)}</title>
  <link>${xmlEscape(siteUrl)}</link>
  <description>${xmlEscape(siteDesc)}</description>
  <language>zh-cn</language>
  <lastBuildDate>${xmlEscape(lastBuildDate)}</lastBuildDate>
  <atom:link href="${xmlEscape(feedUrl)}" rel="self" type="application/rss+xml" />
${itemsXml}
</channel>
</rss>
`;

  return xml;
});
