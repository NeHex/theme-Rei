export type FriendStatus = "ok" | "missing" | "blocked";

export type FriendApiItem = {
  id: number;
  title: string;
  description: string | null;
  category: string;
  favicon: string | null;
  url: string;
  status: FriendStatus;
  create_time: string;
};

type FriendApiResponse = {
  data: FriendApiItem[];
};

const DEFAULT_ISO_DATE = "1970-01-01T00:00:00.000Z";

export type FriendViewItem = {
  id: string;
  title: string;
  description: string;
  category: string;
  favicon: string;
  url: string;
  status: FriendStatus;
  createdAt: string;
};

function normalizeAssetPath(path: string | null | undefined) {
  const value = (path || "").trim();
  if (!value) return "";
  if (value.startsWith("http://") || value.startsWith("https://")) return value;
  if (value.startsWith("/public/")) return value.slice(7);
  if (value.startsWith("public/")) return `/${value.slice(7)}`;
  if (value.startsWith("./")) return value.slice(1);
  return value.startsWith("/") ? value : `/${value}`;
}

function normalizeExternalUrl(raw: string | null | undefined) {
  const value = (raw || "").trim();
  if (!value) return "#";
  if (value.startsWith("http://") || value.startsWith("https://")) return value;
  return `https://${value.replace(/^\/+/, "")}`;
}

function normalizeDate(raw: string | null | undefined) {
  const value = (raw || "").trim();
  if (!value) return DEFAULT_ISO_DATE;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return DEFAULT_ISO_DATE;
  return date.toISOString();
}

export function mapFriendApiItem(item: FriendApiItem): FriendViewItem {
  return {
    id: String(item.id),
    title: (item.title || "").trim() || "未命名友链",
    description: (item.description || "").trim() || "这个友链还没有填写简介。",
    category: (item.category || "").trim() || "未分类",
    favicon: normalizeAssetPath(item.favicon),
    url: normalizeExternalUrl(item.url),
    status: item.status || "ok",
    createdAt: normalizeDate(item.create_time),
  };
}

export function useFriends() {
  const { data, pending, error, refresh } = useAsyncData<FriendViewItem[]>(
    "site-friends",
    async () => {
      const response = await $fetch<FriendApiResponse>("/api/friend");
      return (response.data ?? []).map(mapFriendApiItem);
    },
    {
      default: () => [],
      server: true,
      lazy: true,
    },
  );

  const friends = computed(() => data.value ?? []);

  return {
    friends,
    pending,
    error,
    refresh,
  };
}
