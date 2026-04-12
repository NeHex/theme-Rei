type DailyApiItem = {
  id: number;
  title: string;
  content: string | null;
  create_time: string;
  weather: string | null;
};

type DailyApiResponse = {
  data: DailyApiItem[];
};

import { backendFetch, logBackendFallback } from "../utils/backendFetch";

export default defineEventHandler(async () => {
  try {
    return await backendFetch<DailyApiResponse>("/daily", { method: "GET" });
  } catch (error) {
    logBackendFallback("daily-api", error);
    return { data: [] as DailyApiItem[] };
  }
});
