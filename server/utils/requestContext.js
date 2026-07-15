import { randomUUID } from "node:crypto"

export const REQUEST_ID_HEADER = "x-request-id"

const REQUEST_ID_PATTERN = /^[A-Za-z0-9._:-]{1,128}$/

export function sanitizeRequestId(value) {
  if (typeof value !== "string") return ""
  const normalized = value.trim()
  return REQUEST_ID_PATTERN.test(normalized) ? normalized : ""
}

export function resolveRequestId(value) {
  return sanitizeRequestId(value) || randomUUID()
}

export function withRequestIdHeader(headers, requestId) {
  if (!requestId) return headers
  const nextHeaders = new Headers(headers)
  nextHeaders.set(REQUEST_ID_HEADER, requestId)
  return nextHeaders
}

export function classifyRequestError(statusCode) {
  if (statusCode >= 500) return "server_error"
  if (statusCode >= 400) return "client_error"
  return "none"
}
