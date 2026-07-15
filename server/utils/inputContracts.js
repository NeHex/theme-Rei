const HTTP_PROTOCOLS = new Set(["http:", "https:"])

export const COMMENT_TARGET_TYPES = new Set([
  "article",
  "album",
  "daily",
  "project",
  "singlepage",
  "friend_page",
])

function isRecord(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value)
}

function normalizeString(value, field, options = {}) {
  const { required = false, maxLength = 255 } = options

  if (value === null || value === undefined) {
    if (!required) return ""
    throw new Error(`${field} is required`)
  }

  if (typeof value !== "string") {
    throw new Error(`${field} must be a string`)
  }

  const normalized = value.trim()
  if (required && !normalized) {
    throw new Error(`${field} is required`)
  }
  if (normalized.length > maxLength) {
    throw new Error(`${field} must be at most ${maxLength} characters`)
  }

  return normalized
}

function normalizeOptionalString(value, field, maxLength) {
  if (value === null || value === undefined || value === "") return ""
  return normalizeString(value, field, { maxLength })
}

function normalizePositiveInteger(value, field, options = {}) {
  const { required = true, allowZero = false } = options
  if (value === null || value === undefined || value === "") {
    if (!required) return 0
    throw new Error(`${field} is required`)
  }

  if (typeof value !== "number" || !Number.isSafeInteger(value)) {
    throw new Error(`${field} must be an integer`)
  }

  const minimum = allowZero ? 0 : 1
  if (value < minimum) {
    throw new Error(`${field} must be at least ${minimum}`)
  }

  return value
}

function normalizeHttpUrl(value, field, options = {}) {
  const { required = false, maxLength = 255 } = options
  const normalized = normalizeString(value, field, { required, maxLength })
  if (!normalized) return ""

  let parsed
  try {
    parsed = new URL(normalized)
  } catch {
    throw new Error(`${field} must be a valid HTTP URL`)
  }

  if (!HTTP_PROTOCOLS.has(parsed.protocol) || !parsed.hostname) {
    throw new Error(`${field} must use http or https`)
  }

  return parsed.toString()
}

function normalizeEmail(value) {
  const normalized = normalizeOptionalString(value, "email", 255)
  if (!normalized) return ""
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
    throw new Error("email must be valid")
  }
  return normalized
}

export function validateCommentPayload(payload) {
  if (!isRecord(payload)) throw new Error("comment payload must be an object")

  const targetType = normalizeString(payload.target_type, "target_type", {
    required: true,
    maxLength: 40,
  }).toLowerCase()
  if (!COMMENT_TARGET_TYPES.has(targetType)) {
    throw new Error("target_type is not supported")
  }

  return {
    parent_id: normalizePositiveInteger(payload.parent_id, "parent_id", {
      required: false,
      allowZero: true,
    }),
    target_type: targetType,
    target_id: normalizePositiveInteger(payload.target_id, "target_id"),
    content: normalizeString(payload.content, "content", {
      required: true,
      maxLength: 1200,
    }),
    nickname: normalizeString(payload.nickname, "nickname", {
      required: true,
      maxLength: 100,
    }),
    email: normalizeEmail(payload.email),
    website: normalizeHttpUrl(payload.website, "website"),
  }
}

export function validateFriendApplyPayload(payload) {
  if (!isRecord(payload)) throw new Error("friend apply payload must be an object")

  return {
    site_title: normalizeString(payload.site_title, "site_title", {
      required: true,
      maxLength: 100,
    }),
    site_url: normalizeHttpUrl(payload.site_url, "site_url", {
      required: true,
    }),
    site_description: normalizeString(payload.site_description, "site_description", {
      required: true,
      maxLength: 240,
    }),
    site_icon: normalizeHttpUrl(payload.site_icon, "site_icon"),
    contact: normalizeOptionalString(payload.contact, "contact", 255),
  }
}
