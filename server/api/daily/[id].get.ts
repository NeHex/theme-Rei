import { backendFetch, logBackendFallback } from "../../utils/backendFetch";
import { assertDailyDetailApiResponse } from "../../utils/detailApiContracts";

type DailyMovieApiItem = {
  id: number;
  provider: string | null;
  movie_id: string | null;
  watch_status: string | null;
  cover: string | null;
  title: string | null;
  years: string | null;
  score: number | string | null;
  url: string | null;
};

type DailyApiItem = {
  id: number;
  title: string;
  content: string | null;
  create_time: string;
  weather: string | null;
  daily_type: string | null;
  kuma_movie_id: number | null;
  movie: DailyMovieApiItem | null;
};

type DailyDetailApiResponse = {
  data: DailyApiItem;
};

export default defineEventHandler(async (event) => {
  const dailyId = getRouterParam(event, "id");
  if (!dailyId) {
    throw createError({
      statusCode: 400,
      statusMessage: "Missing daily id",
    });
  }

  try {
    return assertDailyDetailApiResponse(await backendFetch<DailyDetailApiResponse>(`/daily/${encodeURIComponent(dailyId)}`, {
      method: "GET",
    }));
  } catch (error: any) {
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
