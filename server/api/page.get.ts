type PageApiItem = {
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

type PageApiResponse = {
  data: PageApiItem[];
};

import { backendFetch, logBackendFallback } from "../utils/backendFetch";

export default defineEventHandler(async () => {
  try {
    return await backendFetch<PageApiResponse>("/page", { method: "GET" });
  } catch (error) {
    logBackendFallback("page-api", error);
    return { data: [] as PageApiItem[] };
  }
});
