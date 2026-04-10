const ADMIN_MARKER_STORAGE_KEY = "nehex_admin_marker";
const ADMIN_CLIENT_HEADER_VALUE = "nehex-vuetify-admin";
const DEFAULT_ADMIN_MARKER_COOKIE_NAME = "nehex_admin_marker";

function sanitizeText(value: unknown) {
  return String(value || "").trim();
}

function isAbsoluteHttpUrl(value: string) {
  return /^https?:\/\//i.test(value);
}

function normalizeEndpoint(value: string) {
  return value.replace(/\/+$/, "");
}

function resolveAdminMarkerCookieName() {
  const runtimeConfig = useRuntimeConfig();
  return (
    sanitizeText(runtimeConfig.public.adminMarkerCookieName)
    || DEFAULT_ADMIN_MARKER_COOKIE_NAME
  );
}

function readMarkerCookie(cookieName: string) {
  if (!import.meta.client) return "";
  const encodedName = `${encodeURIComponent(cookieName)}=`;
  const cookies = document.cookie ? document.cookie.split("; ") : [];
  for (const item of cookies) {
    if (!item.startsWith(encodedName)) continue;
    const rawValue = item.slice(encodedName.length);
    try {
      return sanitizeText(decodeURIComponent(rawValue));
    } catch {
      return sanitizeText(rawValue);
    }
  }
  return "";
}

function shouldUseSecureCookie() {
  if (!import.meta.client) return false;
  return window.location.protocol === "https:";
}

function writeMarkerCookie(cookieName: string, marker: string, maxAgeSeconds?: number | null) {
  if (!import.meta.client) return;
  const encodedName = encodeURIComponent(cookieName);
  const secure = shouldUseSecureCookie() ? "; Secure" : "";
  const safeMaxAge = Number.isFinite(Number(maxAgeSeconds))
    ? Math.max(1, Math.floor(Number(maxAgeSeconds)))
    : null;

  if (!marker) {
    document.cookie = `${encodedName}=; Max-Age=0; Path=/; SameSite=Lax${secure}`;
    return;
  }

  const encodedValue = encodeURIComponent(marker);
  const maxAgePart = safeMaxAge ? `; Max-Age=${safeMaxAge}` : "";
  document.cookie = `${encodedName}=${encodedValue}${maxAgePart}; Path=/; SameSite=Lax${secure}`;
}

function resolveMarkerMaxAgeSeconds(expiresAt: unknown) {
  if (expiresAt === null || expiresAt === undefined || expiresAt === "") return null;
  const parsedNumeric = Number(expiresAt);
  const expiresMs = Number.isFinite(parsedNumeric)
    ? (parsedNumeric > 1e12 ? parsedNumeric : parsedNumeric * 1000)
    : Date.parse(String(expiresAt));
  if (!Number.isFinite(expiresMs) || expiresMs <= Date.now()) return null;
  return Math.floor((expiresMs - Date.now()) / 1000);
}

function resolveAdminPublicMarkerEndpoint() {
  const runtimeConfig = useRuntimeConfig();
  const configuredEndpoint = sanitizeText(runtimeConfig.public.adminPublicMarkerUrl);
  if (isAbsoluteHttpUrl(configuredEndpoint)) return normalizeEndpoint(configuredEndpoint);

  const adminConsoleUrl = sanitizeText(runtimeConfig.public.adminConsoleUrl);
  if (!isAbsoluteHttpUrl(adminConsoleUrl)) return "";

  try {
    return `${new URL(adminConsoleUrl).origin}/admin-api/auth/public-marker`;
  } catch {
    return "";
  }
}

export function readAdminMarker() {
  if (!import.meta.client) return "";
  const cookieName = resolveAdminMarkerCookieName();
  const markerFromCookie = readMarkerCookie(cookieName);
  if (markerFromCookie) return markerFromCookie;

  try {
    return sanitizeText(window.sessionStorage.getItem(ADMIN_MARKER_STORAGE_KEY));
  } catch {
    return "";
  }
}

export function writeAdminMarker(marker: string, maxAgeSeconds?: number | null) {
  if (!import.meta.client) return;
  const normalized = sanitizeText(marker);
  const cookieName = resolveAdminMarkerCookieName();

  try {
    if (!normalized) {
      window.sessionStorage.removeItem(ADMIN_MARKER_STORAGE_KEY);
      writeMarkerCookie(cookieName, "", null);
      return;
    }
    window.sessionStorage.setItem(ADMIN_MARKER_STORAGE_KEY, normalized);
    writeMarkerCookie(cookieName, normalized, maxAgeSeconds);
  } catch {
    // Ignore storage quota/privacy mode errors.
    writeMarkerCookie(cookieName, normalized, maxAgeSeconds);
  }
}

export async function syncAdminMarker() {
  if (!import.meta.client) return null;

  const endpoint = resolveAdminPublicMarkerEndpoint();
  if (!endpoint) return readAdminMarker() || null;

  try {
    const response = await fetch(endpoint, {
      method: "GET",
      credentials: "include",
      headers: {
        "X-NeHex-Admin-Client": ADMIN_CLIENT_HEADER_VALUE,
      },
      cache: "no-store",
    });

    if (!response.ok) return readAdminMarker() || null;

    const payload = await response.json().catch(() => null) as {
      data?: {
        marker?: string;
        expires_at?: string | number | null;
      };
    } | null;

    const marker = sanitizeText(payload?.data?.marker);
    if (!marker) return readAdminMarker() || null;

    const maxAgeSeconds = resolveMarkerMaxAgeSeconds(payload?.data?.expires_at);
    writeAdminMarker(marker, maxAgeSeconds);
    return marker;
  } catch {
    return readAdminMarker() || null;
  }
}
