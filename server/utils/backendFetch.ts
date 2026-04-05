import type { FetchOptions } from "ofetch";

const DEFAULT_BACKEND_BASE_URL = "http://127.0.0.1:7878";
const DEFAULT_TIMEOUT = 12000;
const DEFAULT_RETRY = 1;
const DEFAULT_RETRY_DELAY = 250;

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

type BackendFetchOptions = Omit<FetchOptions<"json">, "timeout" | "retry" | "retryDelay"> & {
  timeout?: number;
  retry?: number;
  retryDelay?: number;
};

export function backendFetch<T>(endpoint: string, options: BackendFetchOptions = {}) {
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
