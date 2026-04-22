export type SinglePageApiItem = {
  id: number;
  page_key: string;
  title: string;
  cover_image: string | null;
  content: string | null;
  sort: number;
  status: number;
  create_time: string;
  update_time: string;
};

type SinglePageApiResponse = {
  data: SinglePageApiItem[];
};

type SinglePageDetailApiResponse = {
  data: SinglePageApiItem;
};

const DEFAULT_ISO_DATE = "1970-01-01T00:00:00.000Z";

export type SinglePageViewItem = {
  id: string;
  key: string;
  title: string;
  coverImage: string;
  content: string;
  sort: number;
  updatedAt: string;
  to: string;
};

function normalizeAssetPath(path: string | null | undefined) {
  const value = (path || "").trim();
  if (!value) return "";
  if (value.startsWith("/public/")) return value.slice(7);
  if (value.startsWith("public/")) return `/${value.slice(7)}`;
  if (value.startsWith("./")) return value.slice(1);
  return value;
}

function normalizeText(value: string | null | undefined) {
  return (value || "").replace(/\r\n/g, "\n").trim();
}

function normalizeDate(raw: string | null | undefined) {
  const value = (raw || "").trim();
  if (!value) return DEFAULT_ISO_DATE;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return DEFAULT_ISO_DATE;
  return parsed.toISOString();
}

export function mapSinglePageApiItem(item: SinglePageApiItem): SinglePageViewItem {
  const key = normalizeText(item.page_key).replace(/^\/+|\/+$/g, "");
  return {
    id: String(item.id),
    key,
    title: normalizeText(item.title) || key || "独立页",
    coverImage: normalizeAssetPath(item.cover_image),
    content: normalizeText(item.content),
    sort: Number(item.sort || 0),
    updatedAt: normalizeDate(item.update_time),
    to: `/${key}`,
  };
}

export function useSinglePages() {
  const { data, pending, error, refresh } = useAsyncData<SinglePageViewItem[]>(
    "site-single-pages",
    async () => {
      const response = await $fetch<SinglePageApiResponse>("/api/page", { cache: "no-store" });
      return (response.data ?? []).map(mapSinglePageApiItem);
    },
    {
      default: () => [],
      server: true,
      lazy: true,
    },
  );

  const pages = computed(() => data.value ?? []);

  function getPageByKey(pageKey: string) {
    const normalized = String(pageKey || "").trim().replace(/^\/+|\/+$/g, "");
    return pages.value.find((page) => page.key === normalized);
  }

  async function fetchPageDetail(pageKey: string) {
    const normalized = String(pageKey || "").trim().replace(/^\/+|\/+$/g, "");
    if (!normalized) {
      throw createError({ statusCode: 400, statusMessage: "缺少页面标识" });
    }

    const response = await $fetch<SinglePageDetailApiResponse>(
      `/api/page/${encodeURIComponent(normalized)}`,
      { cache: "no-store" },
    );
    return mapSinglePageApiItem(response.data);
  }

  return {
    pages,
    pending,
    error,
    refresh,
    getPageByKey,
    fetchPageDetail,
  };
}
