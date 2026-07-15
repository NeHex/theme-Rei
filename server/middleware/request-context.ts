import {
  classifyRequestError,
  REQUEST_ID_HEADER,
  resolveRequestId,
} from "../utils/requestContext.js";

export default defineEventHandler((event) => {
  const requestId = resolveRequestId(getRequestHeader(event, REQUEST_ID_HEADER));
  const startedAt = Date.now();
  event.context.requestId = requestId;
  setResponseHeader(event, REQUEST_ID_HEADER, requestId);

  event.node.res.once("finish", () => {
    const statusCode = event.node.res.statusCode || 200;
    const entry = {
      type: "http_request",
      request_id: requestId,
      method: event.node.req.method || "GET",
      route: event.path,
      status_code: statusCode,
      duration_ms: Date.now() - startedAt,
      error_class: classifyRequestError(statusCode),
    };

    console.info(JSON.stringify(entry));
  });
});
