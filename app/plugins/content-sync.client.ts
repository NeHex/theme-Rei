const CONTENT_SYNC_INIT_FLAG = "__nehex_content_sync_initialized__";
const CONTENT_SYNC_LAST_SEQ_STORAGE_KEY = "nehex_content_sync_last_seq";
const WS_RECONNECT_DELAY_MS = 5000;
const CHANGE_FETCH_LIMIT = 200;
const MAX_CHANGE_FETCH_ROUNDS = 8;

const RESERVED_STATIC_KEYS = new Set([
  "about",
  "album",
  "archive",
  "article",
  "daily",
  "friends",
  "games",
  "movie",
  "feed",
  "robots.txt",
  "favicon.ico",
  "site.webmanifest",
  "sitemap.xml",
]);

const RESOURCE_REFRESH_KEYS: Record<string, string[]> = {
  article: ["site-articles", "article-list"],
  daily: ["site-dailies"],
  album: ["site-albums"],
  movie: ["site-movies"],
  project: ["site-projects"],
  friend: ["site-friends"],
  setting: ["site-settings", "site-owner"],
  page: ["site-single-pages"],
  site_owner: ["site-owner"],
  siteowner: ["site-owner"],
};

type ContentUpdateEvent = {
  type: string;
  seq: number | null;
  resource: string;
  action: string;
  ids: string[];
};

function asString(value: unknown) {
  return String(value ?? "").trim();
}

function asPositiveInt(value: unknown): number | null {
  const text = asString(value);
  if (!text) return null;
  if (!/^-?\d+$/.test(text)) return null;
  const parsed = Number.parseInt(text, 10);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return parsed;
}

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function normalizeResource(value: unknown) {
  return asString(value).toLowerCase();
}

function normalizeAction(value: unknown) {
  return asString(value).toLowerCase();
}

function normalizeIds(value: unknown, fallbackId?: unknown) {
  if (Array.isArray(value)) {
    return value
      .map((item) => asString(item))
      .filter(Boolean);
  }

  const direct = asString(value);
  if (direct) return [direct];

  const fallback = asString(fallbackId);
  if (fallback) return [fallback];

  return [] as string[];
}

function normalizeContentUpdateEvent(payload: unknown): ContentUpdateEvent | null {
  if (!isObjectRecord(payload)) return null;

  const type = asString(payload.type || payload.event || "content.updated").toLowerCase();
  if (type !== "content.updated") return null;

  const resource = normalizeResource(payload.resource || payload.target || payload.domain);
  if (!resource) return null;

  const seq = asPositiveInt(payload.seq || payload.version || payload.cursor);
  const action = normalizeAction(payload.action || payload.op || payload.method || "update");
  const ids = normalizeIds(payload.ids, payload.id);

  return {
    type,
    seq,
    resource,
    action,
    ids,
  };
}

function extractEventList(payload: unknown) {
  if (Array.isArray(payload)) return payload;
  if (!isObjectRecord(payload)) return [] as unknown[];

  const candidates = [
    payload.data,
    payload.items,
    payload.changes,
    payload.events,
  ];
  for (const candidate of candidates) {
    if (Array.isArray(candidate)) return candidate;
  }
  return [payload];
}

function readStoredSeq() {
  try {
    const raw = window.sessionStorage.getItem(CONTENT_SYNC_LAST_SEQ_STORAGE_KEY);
    const parsed = asPositiveInt(raw);
    return parsed ?? 0;
  } catch {
    return 0;
  }
}

function writeStoredSeq(seq: number) {
  if (!Number.isFinite(seq) || seq < 0) return;
  try {
    window.sessionStorage.setItem(CONTENT_SYNC_LAST_SEQ_STORAGE_KEY, String(Math.floor(seq)));
  } catch {
    // ignore storage errors
  }
}

function resolveCurrentSinglePageKey(path: string) {
  const normalized = asString(path).replace(/^\/+|\/+$/g, "").toLowerCase();
  if (!normalized || RESERVED_STATIC_KEYS.has(normalized)) return "";
  return normalized;
}

function extractLargestSeq(payload: unknown) {
  if (!isObjectRecord(payload)) return 0;

  const queue: unknown[] = [payload];
  let maxSeq = 0;
  let depth = 0;

  while (queue.length > 0 && depth < 5) {
    const currentLayerSize = queue.length;
    for (let i = 0; i < currentLayerSize; i += 1) {
      const current = queue.shift();
      if (!current) continue;

      if (Array.isArray(current)) {
        for (const item of current) queue.push(item);
        continue;
      }

      if (!isObjectRecord(current)) continue;

      for (const [key, value] of Object.entries(current)) {
        if (["seq", "version", "cursor", "next_since", "nextSince"].includes(key)) {
          const parsed = asPositiveInt(value);
          if (parsed !== null) {
            maxSeq = Math.max(maxSeq, parsed);
          }
        }

        if (isObjectRecord(value) || Array.isArray(value)) {
          queue.push(value);
        }
      }
    }
    depth += 1;
  }

  return maxSeq;
}

function getEventRefreshKeys(event: ContentUpdateEvent, currentPath: string) {
  const keys = new Set<string>(RESOURCE_REFRESH_KEYS[event.resource] || []);

  if (event.resource === "article") {
    for (const id of event.ids) {
      keys.add(`article-detail-${id}`);
    }
  }

  if (event.resource === "daily") {
    for (const id of event.ids) {
      keys.add(`daily-detail-${id}`);
    }
  }

  if (event.resource === "page") {
    const currentPageKey = resolveCurrentSinglePageKey(currentPath);
    if (currentPageKey) {
      keys.add(`single-page-${currentPageKey}`);
    }
  }

  if (event.action === "delete" && event.resource === "article") {
    keys.add("article-list");
  }

  return [...keys];
}

export default defineNuxtPlugin((nuxtApp) => {
  if (!import.meta.client) return;

  const globalScope = window as Window & {
    [CONTENT_SYNC_INIT_FLAG]?: boolean;
  };
  if (globalScope[CONTENT_SYNC_INIT_FLAG]) return;
  globalScope[CONTENT_SYNC_INIT_FLAG] = true;

  const runtimeConfig = useRuntimeConfig();
  const configuredEnabled = runtimeConfig.public.contentSyncEnabled;
  const contentSyncEnabled = typeof configuredEnabled === "boolean"
    ? configuredEnabled
    : asString(configuredEnabled).toLowerCase() !== "false";
  if (!contentSyncEnabled) return;

  let socket: WebSocket | null = null;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  let flushTimer: ReturnType<typeof setTimeout> | null = null;
  let isSyncingChanges = false;
  let isActive = true;
  let lastSeq = readStoredSeq();
  const pendingRefreshKeys = new Set<string>();

  function getCurrentPath() {
    return asString(nuxtApp.$router?.currentRoute.value.fullPath || "/");
  }

  function queueRefresh(keys: string[]) {
    for (const key of keys) {
      const normalized = asString(key);
      if (!normalized) continue;
      pendingRefreshKeys.add(normalized);
    }

    if (flushTimer) return;
    flushTimer = setTimeout(() => {
      flushTimer = null;
      if (!pendingRefreshKeys.size) return;
      const keyList = [...pendingRefreshKeys];
      pendingRefreshKeys.clear();
      void refreshNuxtData(keyList);
    }, 120);
  }

  function applyEvent(event: ContentUpdateEvent) {
    if (event.seq !== null) {
      if (event.seq <= lastSeq) return;
      lastSeq = event.seq;
      writeStoredSeq(lastSeq);
    }

    const keys = getEventRefreshKeys(event, getCurrentPath());
    if (keys.length > 0) {
      queueRefresh(keys);
    }
  }

  function clearReconnectTimer() {
    if (!reconnectTimer) return;
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }

  function closeSocket(manual = false) {
    if (!socket) return;
    const current = socket;
    socket = null;
    if (manual) {
      current.onopen = null;
      current.onmessage = null;
      current.onerror = null;
      current.onclose = null;
    }
    current.close();
  }

  function scheduleReconnect() {
    if (!isActive) return;
    clearReconnectTimer();
    reconnectTimer = setTimeout(() => {
      connectSocket();
    }, WS_RECONNECT_DELAY_MS);
  }

  function resolveWsBaseUrl() {
    const configured = asString(runtimeConfig.public.contentUpdatesWsUrl);
    if (configured) return configured;

    const apiBase = asString(runtimeConfig.public.settingsApiBase).replace(/\/+$/, "");
    if (!apiBase) return "";

    if (/^https?:\/\//i.test(apiBase)) {
      return `${apiBase.replace(/^http/i, "ws")}/ws/content-updates`;
    }
    if (/^wss?:\/\//i.test(apiBase)) {
      return `${apiBase}/ws/content-updates`;
    }
    return "";
  }

  function buildWsUrl() {
    const baseUrl = resolveWsBaseUrl();
    if (!baseUrl) return "";

    try {
      const wsUrl = new URL(baseUrl, window.location.origin);
      if (wsUrl.protocol === "http:" || wsUrl.protocol === "https:") {
        wsUrl.protocol = wsUrl.protocol === "https:" ? "wss:" : "ws:";
      }
      if (!["ws:", "wss:"].includes(wsUrl.protocol)) return "";
      if (window.location.protocol === "https:" && wsUrl.protocol === "ws:") {
        wsUrl.protocol = "wss:";
      }
      return wsUrl.toString();
    } catch {
      return "";
    }
  }

  function parseEventsFromSocketPayload(payload: unknown) {
    const items = extractEventList(payload);
    const normalizedEvents: ContentUpdateEvent[] = [];
    for (const item of items) {
      const normalized = normalizeContentUpdateEvent(item);
      if (!normalized) continue;
      normalizedEvents.push(normalized);
    }
    return normalizedEvents;
  }

  function extractChangesEnvelope(payload: unknown) {
    if (!isObjectRecord(payload)) {
      return {
        events: [] as ContentUpdateEvent[],
        hasMore: false,
        nextSince: null as number | null,
      };
    }

    const events = parseEventsFromSocketPayload(payload);
    const hasMoreRaw = payload.has_more ?? payload.hasMore;
    const hasMore = hasMoreRaw === true || asString(hasMoreRaw).toLowerCase() === "true";
    const nextSince = asPositiveInt(payload.next_since ?? payload.nextSince);

    return {
      events,
      hasMore,
      nextSince,
    };
  }

  async function bootstrapVersionIfNeeded() {
    if (lastSeq > 0) return;
    try {
      const payload = await $fetch<unknown>("/api/sync/version", {
        cache: "no-store",
      });
      const maxSeq = extractLargestSeq(payload);
      if (maxSeq > 0) {
        lastSeq = maxSeq;
        writeStoredSeq(lastSeq);
      }
    } catch {
      // ignore
    }
  }

  async function syncMissedChanges() {
    if (isSyncingChanges) return;
    isSyncingChanges = true;

    try {
      let since = Math.max(0, lastSeq);
      for (let round = 0; round < MAX_CHANGE_FETCH_ROUNDS; round += 1) {
        const payload = await $fetch<unknown>("/api/sync/changes", {
          query: {
            since,
            limit: CHANGE_FETCH_LIMIT,
          },
          cache: "no-store",
        });

        const { events, hasMore, nextSince } = extractChangesEnvelope(payload);
        if (events.length === 0) break;

        for (const event of events) {
          applyEvent(event);
        }

        const maxEventSeq = events.reduce((maxValue, event) => {
          if (event.seq === null) return maxValue;
          return Math.max(maxValue, event.seq);
        }, since);
        since = Math.max(since, maxEventSeq);
        if (since > lastSeq) {
          lastSeq = since;
          writeStoredSeq(lastSeq);
        }

        if (!hasMore) break;
        if (nextSince === null) {
          if (events.length < CHANGE_FETCH_LIMIT) break;
          continue;
        }
        if (nextSince <= since) break;
        since = nextSince;
      }
    } catch {
      // ignore
    } finally {
      isSyncingChanges = false;
    }
  }

  function handleSocketMessage(rawText: string) {
    const text = asString(rawText);
    if (!text) return;

    let payload: unknown = null;
    try {
      payload = JSON.parse(text);
    } catch {
      return;
    }

    const events = parseEventsFromSocketPayload(payload);
    for (const event of events) {
      applyEvent(event);
    }
  }

  function connectSocket() {
    if (!isActive) return;
    if (socket && [WebSocket.CONNECTING, WebSocket.OPEN].includes(socket.readyState)) return;

    const wsUrl = buildWsUrl();
    if (!wsUrl) {
      scheduleReconnect();
      return;
    }

    clearReconnectTimer();

    try {
      const nextSocket = new WebSocket(wsUrl);
      socket = nextSocket;

      nextSocket.onopen = () => {
        if (socket !== nextSocket) return;
        void syncMissedChanges();
      };

      nextSocket.onmessage = (event) => {
        if (socket !== nextSocket) return;
        if (typeof event.data === "string") {
          handleSocketMessage(event.data);
          return;
        }
        if (event.data instanceof ArrayBuffer) {
          const text = new TextDecoder().decode(new Uint8Array(event.data));
          handleSocketMessage(text);
        }
      };

      nextSocket.onerror = () => {
        if (socket !== nextSocket) return;
        scheduleReconnect();
      };

      nextSocket.onclose = () => {
        if (socket === nextSocket) {
          socket = null;
        }
        scheduleReconnect();
      };
    } catch {
      scheduleReconnect();
    }
  }

  void bootstrapVersionIfNeeded().then(() => {
    if (lastSeq > 0) {
      void syncMissedChanges();
    }
  });
  connectSocket();

  window.addEventListener("online", () => {
    void syncMissedChanges();
    connectSocket();
  });
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState !== "visible") return;
    void syncMissedChanges();
    connectSocket();
  });

  window.addEventListener("beforeunload", () => {
    isActive = false;
    clearReconnectTimer();
    closeSocket(true);
  });
});
