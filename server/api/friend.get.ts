type FriendApiItem = {
  id: number;
  title: string;
  description: string | null;
  category: string;
  favicon: string | null;
  url: string;
  status: "ok" | "missing" | "blocked";
  create_time: string;
};

type FriendApiResponse = {
  data: FriendApiItem[];
};

import { backendFetch, logBackendFallback } from "../utils/backendFetch";

export default defineEventHandler(async () => {
  try {
    return await backendFetch<FriendApiResponse>("/friend", { method: "GET" });
  } catch (error) {
    logBackendFallback("friend-api", error);
    return { data: [] as FriendApiItem[] };
  }
});
