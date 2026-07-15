import { backendFetch } from "../utils/backendFetch";
import { createReadinessPayload } from "../utils/health.js";

export default defineEventHandler(async (event) => {
  setResponseHeader(event, "cache-control", "no-store");

  const runtimeConfig = useRuntimeConfig();
  const shouldCheckBackend = runtimeConfig.readinessCheckBackend !== false;
  if (!shouldCheckBackend) {
    return createReadinessPayload(event.context.requestId, true);
  }

  try {
    await backendFetch("/setting", {
      method: "GET",
      timeout: 3000,
      retry: 0,
    });
    return createReadinessPayload(event.context.requestId, true);
  } catch {
    setResponseStatus(event, 503);
    return createReadinessPayload(event.context.requestId, false);
  }
});
