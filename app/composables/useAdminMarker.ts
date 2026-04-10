const ADMIN_MARKER_STORAGE_KEY = "nehex_admin_marker";
const ADMIN_CLIENT_HEADER_VALUE = "nehex-vuetify-admin";

function sanitizeText(value: unknown) {
  return String(value || "").trim();
}

function isAbsoluteHttpUrl(value: string) {
  return /^https?:\/\//i.test(value);
}

function normalizeEndpoint(value: string) {
  return value.replace(/\/+$/, "");
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
  try {
    return sanitizeText(window.sessionStorage.getItem(ADMIN_MARKER_STORAGE_KEY));
  } catch {
    return "";
  }
}

export function writeAdminMarker(marker: string) {
  if (!import.meta.client) return;
  const normalized = sanitizeText(marker);

  try {
    if (!normalized) {
      window.sessionStorage.removeItem(ADMIN_MARKER_STORAGE_KEY);
      return;
    }
    window.sessionStorage.setItem(ADMIN_MARKER_STORAGE_KEY, normalized);
  } catch {
    // Ignore storage quota/privacy mode errors.
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
      };
    } | null;

    const marker = sanitizeText(payload?.data?.marker);
    if (!marker) return readAdminMarker() || null;

    writeAdminMarker(marker);
    return marker;
  } catch {
    return readAdminMarker() || null;
  }
}
