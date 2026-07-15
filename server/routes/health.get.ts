import { createHealthPayload } from "../utils/health.js";

export default defineEventHandler((event) => {
  setResponseHeader(event, "cache-control", "no-store");
  return createHealthPayload(event.context.requestId);
});
