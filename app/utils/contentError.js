function readStatusCode(error) {
  if (!error || typeof error !== "object") return 0
  const source = error
  const statusCode = Number(source.statusCode || source.status || 0)
  return Number.isFinite(statusCode) ? Math.trunc(statusCode) : 0
}

export function resolveContentErrorStatus(error) {
  const statusCode = readStatusCode(error)
  if (statusCode === 400 || statusCode === 404) return statusCode
  return 502
}

export function resolveContentErrorMessage(
  error,
  notFoundMessage,
  failedMessage = "内容加载失败，请稍后重试",
) {
  const statusCode = resolveContentErrorStatus(error)
  if (statusCode === 404) return notFoundMessage
  if (statusCode === 400) return "请求参数无效"

  if (error && typeof error === "object") {
    const source = error
    const message = String(source.statusMessage || source.message || "").trim()
    if (message && !/^\d{3}\s/.test(message)) return message
  }

  return failedMessage
}
