import { backendFetch, logBackendFallback } from "../../utils/backendFetch";

type SyncVersionPayload = Record<string, unknown>;

export default defineEventHandler(async () => {
  try {
    return await backendFetch<SyncVersionPayload>("/api/sync/version", {
      method: "GET",
    });
  } catch (error) {
    logBackendFallback("sync-version-api", error);
    return {};
  }
});
