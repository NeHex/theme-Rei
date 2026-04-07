export type DailyApiItem = {
  id: number;
  title: string;
  content: string | null;
  create_time: string;
  weather: string | null;
};

type DailyApiResponse = {
  data: DailyApiItem[];
};

export type DailyViewItem = {
  id: string;
  title: string;
  content: string;
  summary: string;
  weather: string;
  createdAt: string;
};

function normalizeDate(raw: string | null | undefined) {
  const value = (raw || "").trim();
  if (!value) return new Date().toISOString();
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return new Date().toISOString();
  return date.toISOString();
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

export function mapDailyApiItem(item: DailyApiItem): DailyViewItem {
  const rawContent = (item.content || "").replace(/\r\n/g, "\n").trim();
  const content = rawContent || "暂无内容";
  const summarySource = compactText(rawContent) || content;
  const weather = (item.weather || "").trim();

  return {
    id: String(item.id),
    title: item.title || "未命名日常",
    content,
    summary: truncate(summarySource, 96),
    weather,
    createdAt: normalizeDate(item.create_time),
  };
}

export function useDailies() {
  const { data, pending, error, refresh } = useAsyncData<DailyViewItem[]>(
    "site-dailies",
    async () => {
      const response = await $fetch<DailyApiResponse>("/api/daily");
      return (response.data ?? []).map(mapDailyApiItem);
    },
    {
      default: () => [],
      server: true,
      lazy: false,
    },
  );

  const dailies = computed(() => data.value ?? []);

  return {
    dailies,
    pending,
    error,
    refresh,
  };
}
