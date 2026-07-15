import { getCookie, getRequestHeader, type H3Event } from "h3";

const DEFAULT_ADMIN_MARKER_COOKIE_NAME = "nehex_admin_marker";
const DEFAULT_ADMIN_SESSION_COOKIE_NAMES = [
  "nehex_admin_session",
  "admin_session",
  "nehex_admin_token",
  "admin_token",
];

type AdminIdentitySource = "header" | "marker_cookie" | "admin_cookie";

export type AdminIdentity = {
  marker: string;
  source: AdminIdentitySource;
};

function sanitizeValue(value: unknown) {
  return String(value || "").trim();
}

export function normalizeAdminMarker(value: unknown) {
  if (typeof value !== "string") return "";
  const normalized = value.trim();
  if (!normalized || normalized.length > 512) return "";
  if (/[\u0000-\u001f\u007f]/.test(normalized)) return "";
  return normalized;
}

export function getAdminMarkerCookieName() {
  const runtimeConfig = useRuntimeConfig();
  const configuredName = sanitizeValue(runtimeConfig.adminMarkerCookieName);
  return configuredName || DEFAULT_ADMIN_MARKER_COOKIE_NAME;
}

export function getAdminSessionCookieNames() {
  const runtimeConfig = useRuntimeConfig();
  const configuredNames = sanitizeValue(runtimeConfig.adminSessionCookieNames);

  if (!configuredNames) {
    return DEFAULT_ADMIN_SESSION_COOKIE_NAMES;
  }

  const parsedNames = configuredNames
    .split(",")
    .map((name) => name.trim())
    .filter(Boolean);

  return parsedNames.length ? parsedNames : DEFAULT_ADMIN_SESSION_COOKIE_NAMES;
}

export function resolveAdminIdentity(event: H3Event): AdminIdentity | null {
  const markerFromHeader = normalizeAdminMarker(getRequestHeader(event, "x-nehex-admin-marker"));
  if (markerFromHeader) {
    return {
      marker: markerFromHeader,
      source: "header",
    };
  }

  const markerCookieName = getAdminMarkerCookieName();
  const markerFromCookie = normalizeAdminMarker(getCookie(event, markerCookieName));
  if (markerFromCookie) {
    return {
      marker: markerFromCookie,
      source: "marker_cookie",
    };
  }

  const adminSessionCookieNames = getAdminSessionCookieNames();
  for (const cookieName of adminSessionCookieNames) {
    const sessionCookieValue = normalizeAdminMarker(getCookie(event, cookieName));
    if (!sessionCookieValue) continue;

    return {
      marker: sessionCookieValue,
      source: "admin_cookie",
    };
  }

  return null;
}
