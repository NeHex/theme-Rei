import type { FetchOptions } from "ofetch";

const DEFAULT_BACKEND_BASE_URL = "http://127.0.0.1:7878";
const DEFAULT_TIMEOUT = 12000;
const DEFAULT_RETRY = 1;
const DEFAULT_RETRY_DELAY = 250;
const BACKEND_FETCH_SKIPPED_CODE = "NEHEX_PRERENDER_BACKEND_FETCH_SKIPPED";
const loggedFallbackWarnings = new Set<string>();

export function getBackendBaseUrl() {
  const runtimeConfig = useRuntimeConfig();
  const apiBase =
    runtimeConfig.settingsApiBase ||
    runtimeConfig.public.settingsApiBase ||
    DEFAULT_BACKEND_BASE_URL;
  return String(apiBase).replace(/\/+$/, "");
}

function normalizeEndpoint(endpoint: string) {
  const value = String(endpoint || "").trim();
  if (!value) return "/";
  if (/^https?:\/\//i.test(value)) return value;
  return value.startsWith("/") ? value : `/${value}`;
}

export function buildBackendUrl(endpoint: string) {
  const normalized = normalizeEndpoint(endpoint);
  if (/^https?:\/\//i.test(normalized)) return normalized;
  return `${getBackendBaseUrl()}${normalized}`;
}

function parseBoolean(value: unknown, fallback = false) {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  if (typeof value !== "string") return fallback;

  const normalized = value.trim().toLowerCase();
  if (!normalized) return fallback;
  if (["1", "true", "yes", "on"].includes(normalized)) return true;
  if (["0", "false", "no", "off"].includes(normalized)) return false;
  return fallback;
}

function shouldSkipBackendFetchForPrerender() {
  if (!import.meta.prerender) return false;

  const runtimeConfig = useRuntimeConfig();
  const allowBackendFetch = parseBoolean(runtimeConfig.prerenderFetchBackend, false);
  return !allowBackendFetch;
}

function createSkippedError(endpoint: string) {
  const error = new Error(`skip backend fetch during prerender: ${endpoint}`) as Error & {
    code?: string;
  };
  error.code = BACKEND_FETCH_SKIPPED_CODE;
  return error;
}

function normalizeErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "string") return error;
  return "unknown error";
}

export function isBackendFetchSkippedError(error: unknown) {
  return Boolean(
    error &&
      typeof error === "object" &&
      "code" in error &&
      (error as { code?: string }).code === BACKEND_FETCH_SKIPPED_CODE,
  );
}

export function logBackendFallback(scope: string, error: unknown) {
  if (isBackendFetchSkippedError(error)) return;

  if (import.meta.prerender) {
    const summary = normalizeErrorMessage(error);
    const warningKey = `${scope}:${summary}`;
    if (loggedFallbackWarnings.has(warningKey)) return;
    loggedFallbackWarnings.add(warningKey);
    console.warn(`[${scope}] backend unavailable during prerender, fallback enabled: ${summary}`);
    return;
  }

  console.error(`[${scope}] failed to fetch backend, fallback enabled`, error);
}

type BackendFetchOptions = Omit<FetchOptions<"json">, "timeout" | "retry" | "retryDelay"> & {
  timeout?: number;
  retry?: number;
  retryDelay?: number;
};

export function backendFetch<T>(endpoint: string, options: BackendFetchOptions = {}) {
  if (shouldSkipBackendFetchForPrerender()) {
    throw createSkippedError(endpoint);
  }

  const {
    timeout = DEFAULT_TIMEOUT,
    retry = DEFAULT_RETRY,
    retryDelay = DEFAULT_RETRY_DELAY,
    ...rest
  } = options;

  return $fetch<T>(buildBackendUrl(endpoint), {
    timeout,
    retry,
    retryDelay,
    ...rest,
  });
}
