import { backendFetch, logBackendFallback } from "../../utils/backendFetch";

type DailyApiItem = {
  id: number;
  title: string;
  content: string | null;
  create_time: string;
  weather: string | null;
};

type DailyListApiResponse = {
  data: DailyApiItem[];
};

function findDailyById(items: DailyApiItem[], targetId: string) {
  return items.find((item) => String(item.id) === targetId) || null;
}

export default defineEventHandler(async (event) => {
  const dailyId = getRouterParam(event, "id");
  if (!dailyId) {
    throw createError({
      statusCode: 400,
      statusMessage: "Missing daily id",
    });
  }

  try {
    const response = await backendFetch<DailyListApiResponse>("/daily", {
      method: "GET",
    });

    const target = findDailyById(response.data ?? [], dailyId);
    if (!target) {
      throw createError({
        statusCode: 404,
        statusMessage: "Daily not found",
      });
    }

    return {
      data: target,
    };
  } catch (error: any) {
    if (error?.statusCode === 404) throw error;

    const statusCode = Number(error?.response?.status || error?.statusCode || 500);
    if (statusCode === 404) {
      throw createError({
        statusCode: 404,
        statusMessage: "Daily not found",
      });
    }

    logBackendFallback("daily-detail-api", error);
    throw createError({
      statusCode: 502,
      statusMessage: "Failed to load daily",
    });
  }
});
