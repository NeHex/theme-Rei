export function createHealthPayload(requestId) {
  return {
    status: "ok",
    service: "theme-rei",
    request_id: requestId || null,
  }
}

export function createReadinessPayload(requestId, backendAvailable) {
  return {
    status: backendAvailable ? "ready" : "not_ready",
    service: "theme-rei",
    backend: backendAvailable ? "ok" : "unavailable",
    request_id: requestId || null,
  }
}
