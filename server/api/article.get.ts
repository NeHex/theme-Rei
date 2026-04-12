import { backendFetch, logBackendFallback } from "../utils/backendFetch";

type ArticleApiItem = {
  id: number;
  title: string;
  articleTopImage: string | null;
  class: string;
  read: number;
  like_count: number;
  lastEditTime: string;
  tag: string | null;
  top: number;
  content: string | null;
};

type ArticlePagination = {
  page: number;
  size: number;
  total: number;
  total_pages: number;
};

type ArticleTagStat = {
  tag: string;
  count: number;
};

type ArticleApiResponse = {
  data: ArticleApiItem[];
  pagination?: Partial<ArticlePagination> | null;
  tag_stats?: ArticleTagStat[];
};

type ArticleSort = "latest" | "oldest" | "updated";

const DEFAULT_ARTICLE_PAGE_SIZE = 10;
const BACKEND_PAGE_SIZE = 100;
const MAX_ARTICLE_PAGE_SIZE = 100;

function pickQueryValue(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0];
  return value;
}

function toPositiveInt(value: string | undefined, fallback: number) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return parsed;
}

function normalizePageSize(size: number) {
  return Math.max(1, Math.min(MAX_ARTICLE_PAGE_SIZE, size));
}

function normalizeText(value: string | undefined) {
  return String(value || "").trim();
}

function normalizeSort(value: string | undefined): ArticleSort {
  if (value === "oldest" || value === "updated" || value === "latest") return value;
  return "latest";
}

function parseTags(raw: string | null | undefined) {
  if (!raw) return [] as string[];
  return raw
    .split(/[，,]/g)
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function toDateMs(value: string) {
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
}

function resolveTotalPages(response: ArticleApiResponse) {
  const totalPages = Number(response.pagination?.total_pages);
  if (Number.isFinite(totalPages) && totalPages >= 0) {
    return Math.trunc(totalPages);
  }
  return (response.data ?? []).length > 0 ? 1 : 0;
}

function resolveTotal(response: ArticleApiResponse, fallback: number) {
  const total = Number(response.pagination?.total);
  if (Number.isFinite(total) && total >= 0) {
    return Math.trunc(total);
  }
  return fallback;
}

async function fetchArticlePage(page: number, size: number) {
  return backendFetch<ArticleApiResponse>("/article", {
    method: "GET",
    query: {
      page,
      size,
    },
  });
}

async function fetchAllArticles() {
  const firstPage = await fetchArticlePage(1, BACKEND_PAGE_SIZE);
  const firstPageData = firstPage.data ?? [];
  const totalPages = resolveTotalPages(firstPage);
  const merged = [...firstPageData];

  if (totalPages > 1) {
    const pageTasks: Promise<ArticleApiResponse>[] = [];
    for (let page = 2; page <= totalPages; page += 1) {
      pageTasks.push(fetchArticlePage(page, BACKEND_PAGE_SIZE));
    }
    const responses = await Promise.all(pageTasks);
    for (const response of responses) {
      if (Array.isArray(response.data) && response.data.length > 0) {
        merged.push(...response.data);
      }
    }
  }

  return {
    items: merged,
    total: resolveTotal(firstPage, merged.length),
  };
}

function filterArticles(items: ArticleApiItem[], keyword: string, tag: string) {
  const normalizedKeyword = keyword.toLowerCase();
  const normalizedTag = tag.toLowerCase();

  return items.filter((item) => {
    const itemTags = parseTags(item.tag);
    const byTag = !normalizedTag || itemTags.some((currentTag) => currentTag.toLowerCase() === normalizedTag);
    if (!byTag) return false;

    if (!normalizedKeyword) return true;
    const searchable = [
      item.title,
      item.content,
      item.class,
      item.tag,
    ]
      .map((value) => String(value || "").toLowerCase())
      .join(" ");
    return searchable.includes(normalizedKeyword);
  });
}

function sortArticles(items: ArticleApiItem[], sortBy: ArticleSort) {
  return [...items].sort((a, b) => {
    const aMs = toDateMs(a.lastEditTime);
    const bMs = toDateMs(b.lastEditTime);
    if (sortBy === "oldest") return aMs - bMs;
    return bMs - aMs;
  });
}

function buildTagStats(items: ArticleApiItem[]): ArticleTagStat[] {
  const stats = new Map<string, number>();
  for (const item of items) {
    for (const tag of parseTags(item.tag)) {
      stats.set(tag, (stats.get(tag) ?? 0) + 1);
    }
  }
  return [...stats.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
}

function paginate(items: ArticleApiItem[], page: number, size: number) {
  const total = items.length;
  const totalPages = total > 0 ? Math.ceil(total / size) : 0;
  const normalizedPage = totalPages > 0 ? Math.min(page, totalPages) : 1;
  const start = (normalizedPage - 1) * size;
  const end = start + size;

  return {
    data: items.slice(start, end),
    pagination: {
      page: normalizedPage,
      size,
      total,
      total_pages: totalPages,
    } satisfies ArticlePagination,
  };
}

export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  const queryPage = pickQueryValue(query.page as string | string[] | undefined);
  const querySize = pickQueryValue(query.size as string | string[] | undefined);
  const queryKeyword = pickQueryValue(query.q as string | string[] | undefined);
  const queryTag = pickQueryValue(query.tag as string | string[] | undefined);
  const querySort = pickQueryValue(query.sort as string | string[] | undefined);

  const requestedPage = toPositiveInt(queryPage, 1);
  const requestedSize = normalizePageSize(toPositiveInt(querySize, DEFAULT_ARTICLE_PAGE_SIZE));
  const keyword = normalizeText(queryKeyword);
  const tag = normalizeText(queryTag);
  const sortBy = normalizeSort(querySort);

  const hasPagingQuery = queryPage !== undefined || querySize !== undefined;
  const hasFilterQuery = Boolean(keyword || tag);
  const requiresServerTransform = hasFilterQuery || sortBy !== "latest";

  try {
    if (!hasPagingQuery && !requiresServerTransform) {
      const merged = await fetchAllArticles();
      return {
        data: merged.items,
        pagination: {
          page: 1,
          size: merged.items.length || requestedSize,
          total: merged.total,
          total_pages: merged.items.length > 0 ? 1 : 0,
        } satisfies ArticlePagination,
        tag_stats: buildTagStats(merged.items),
      };
    }

    if (!requiresServerTransform) {
      const response = await fetchArticlePage(requestedPage, requestedSize);
      const pageData = response.data ?? [];
      return {
        data: pageData,
        pagination: {
          page: requestedPage,
          size: requestedSize,
          total: resolveTotal(response, pageData.length),
          total_pages: resolveTotalPages(response),
        } satisfies ArticlePagination,
        tag_stats: buildTagStats(pageData),
      };
    }

    const merged = await fetchAllArticles();
    const filtered = filterArticles(merged.items, keyword, tag);
    const sorted = sortArticles(filtered, sortBy);
    const paged = paginate(sorted, requestedPage, requestedSize);

    return {
      data: paged.data,
      pagination: paged.pagination,
      tag_stats: buildTagStats(filtered),
    };
  } catch (error) {
    logBackendFallback("article-api", error);
    return {
      data: [] as ArticleApiItem[],
      pagination: {
        page: requestedPage,
        size: requestedSize,
        total: 0,
        total_pages: 0,
      } satisfies ArticlePagination,
      tag_stats: [] as ArticleTagStat[],
    };
  }
});
