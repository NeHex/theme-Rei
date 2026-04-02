export type ArticleApiItem = {
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

export type ArticleViewItem = {
  id: string;
  title: string;
  summary: string;
  excerpt: string;
  cover: string;
  category: string;
  tags: string[];
  views: number;
  likes: number;
  top: number;
  featured: boolean;
  content: string;
  publishedAt: string;
  updatedAt: string;
  edited: boolean;
};

export function normalizeImagePath(path: string | null | undefined) {
  const value = (path || "").trim();
  if (!value) return "/images/background.png";
  if (value.startsWith("/public/")) return value.slice(7);
  if (value.startsWith("public/")) return `/${value.slice(7)}`;
  if (value.startsWith("./")) return value.slice(1);
  return value;
}

export function parseTags(raw: string | null | undefined) {
  if (!raw) return [] as string[];
  return raw
    .split(/[，,]/g)
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function compactText(raw: string | null | undefined) {
  return (raw || "")
    .replace(/\r\n/g, "\n")
    .replace(/\n{2,}/g, "\n")
    .replace(/\s+/g, " ")
    .trim();
}

function truncate(text: string, maxLength: number) {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, Math.max(0, maxLength - 1)).trim()}…`;
}

export function mapArticleApiItem(item: ArticleApiItem): ArticleViewItem {
  const rawContent = (item.content || "").replace(/\r\n/g, "\n").trim();
  const plainContent = compactText(rawContent) || "暂无正文内容。";
  const summary = truncate(plainContent, 56);
  const excerpt = truncate(plainContent, 90);
  const date = item.lastEditTime || new Date().toISOString();

  return {
    id: String(item.id),
    title: item.title || "未命名文章",
    summary,
    excerpt,
    cover: normalizeImagePath(item.articleTopImage),
    category: item.class || "default",
    tags: parseTags(item.tag),
    views: item.read || 0,
    likes: 0,
    top: item.top || 0,
    featured: (item.top || 0) > 0,
    content: rawContent || "暂无正文内容。",
    publishedAt: date,
    updatedAt: date,
    edited: false,
  };
}

export function useArticles() {
  const { data, pending, error, refresh } = useAsyncData<ArticleViewItem[]>(
    "site-articles",
    async () => {
      const response = await $fetch<ArticleApiResponse>("/api/article");
      return (response.data ?? []).map(mapArticleApiItem);
    },
    {
      default: () => [],
      server: true,
      lazy: false,
    },
  );

  const articles = computed(() => data.value ?? []);

  function getArticleById(id: string) {
    return articles.value.find((article) => article.id === id);
  }

  return {
    articles,
    pending,
    error,
    refresh,
    getArticleById,
  };
}
