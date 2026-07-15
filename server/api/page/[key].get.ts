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

type PageDetailApiResponse = {
  data: PageApiItem;
};

import { backendFetch } from "../../utils/backendFetch";

export default defineEventHandler(async (event) => {
  const routeKey = String(getRouterParam(event, "key") ?? "").trim();
  if (!routeKey) {
    throw createError({ statusCode: 400, statusMessage: "Missing page key" });
  }

  try {
    return await backendFetch<PageDetailApiResponse>(`/page/${encodeURIComponent(routeKey)}`, {
      method: "GET",
    });
  } catch (error: any) {
    const statusCode = Number(error?.response?.status || error?.statusCode || 502);
    if (statusCode === 404) {
      throw createError({ statusCode: 404, statusMessage: "Page not found" });
    }
    throw createError({ statusCode: 502, statusMessage: "Failed to load page" });
  }
});
