<script setup lang="ts">
import { isExternalSiteLink, resolveSiteHostname } from "~/utils/link";

const route = useRoute();
const requestUrl = useRequestURL();
const runtimeConfig = useRuntimeConfig();
const { settings } = useSiteSettings();
const currentYear = new Date().getFullYear();
type OnlineSocketState = "connecting" | "open" | "error";

const startYear = computed(() => {
  const match = settings.value.siteCreateTime.match(/(19|20)\d{2}/);
  return match ? Number(match[0]) : currentYear;
});

const copyrightText = computed(() => {
  if (startYear.value >= currentYear) return `© ${currentYear} ${settings.value.siteTitle}`;
  return `© ${startYear.value}-${currentYear} ${settings.value.siteTitle}`;
});

const contactLinks = computed(() => {
  const links = settings.value.userSocialLink;
  return [
    { label: "GitHub", href: links.github || "" },
    { label: "Bilibili", href: links.bilibili || "" },
    { label: "Steam", href: links.steam || "" },
    { label: "邮箱", href: links.email || "" },
    { label: "RSS", href: links.feed || links.rss || "" },
  ].filter((item) => Boolean(item.href));
});

const onlineSocketState = ref<OnlineSocketState>("connecting");
const onlineCount = ref(0);
const onlineCountEnabled = computed(() => {
  const configured = runtimeConfig.public.websocketFutionEnabled;
  if (typeof configured === "boolean") return configured;
  return String(configured || "").trim().toLowerCase() === "true";
});
const onlineStatusText = computed(() => {
  if (onlineSocketState.value === "open") return `${onlineCount.value}人跟你一起浏览`;
  if (onlineSocketState.value === "error") return "websocket链接失败";
  return "websocket建立中";
});
const siteHostname = computed(() =>
  resolveSiteHostname(settings.value.siteUrl, `${requestUrl.protocol}//${requestUrl.host}`),
);

let onlineSocket: WebSocket | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let isOnlineSocketActive = false;

function normalizeOnlineCount(value: unknown): number | null {
  if (typeof value === "number") {
    if (!Number.isFinite(value) || value < 0) return null;
    return Math.floor(value);
  }

  if (typeof value !== "string") return null;
  const text = value.trim();
  if (!text) return null;
  if (!/^\d+(\.\d+)?$/.test(text)) return null;
  const parsed = Number.parseFloat(text);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return Math.floor(parsed);
}

function extractOnlineCountFromRecord(record: Record<string, unknown>): number | null {
  const directCandidates = [record.online, record.onlineCount, record.count, record.value];
  for (const candidate of directCandidates) {
    const normalized = normalizeOnlineCount(candidate);
    if (normalized !== null) return normalized;
  }

  const nestedData = record.data;
  if (!nestedData || typeof nestedData !== "object" || Array.isArray(nestedData)) return null;

  const nested = nestedData as Record<string, unknown>;
  const nestedCandidates = [nested.online, nested.onlineCount, nested.count, nested.value];
  for (const candidate of nestedCandidates) {
    const normalized = normalizeOnlineCount(candidate);
    if (normalized !== null) return normalized;
  }
  return null;
}

function parseOnlineCountMessage(rawText: string): number | null {
  const text = rawText.trim();
  if (!text) return null;

  const direct = normalizeOnlineCount(text);
  if (direct !== null) return direct;

  try {
    const payload: unknown = JSON.parse(text);
    const normalized = normalizeOnlineCount(payload);
    if (normalized !== null) return normalized;
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) return null;
    return extractOnlineCountFromRecord(payload as Record<string, unknown>);
  } catch {
    return null;
  }
}

function resolveOnlineWsBaseUrl() {
  if (!onlineCountEnabled.value) return "";
  const configured = String(runtimeConfig.public.onlineCountWsUrl || "").trim();
  if (configured) return configured;

  const apiBase = String(runtimeConfig.public.settingsApiBase || "").trim();
  if (!apiBase) return "";

  const normalized = apiBase.replace(/\/+$/, "");
  if (/^https?:\/\//i.test(normalized)) {
    return `${normalized.replace(/^http/i, "ws")}/ws/online`;
  }
  if (/^wss?:\/\//i.test(normalized)) {
    return `${normalized}/ws/online`;
  }

  return "";
}

function buildOnlineWsUrl() {
  if (!import.meta.client) return "";
  const baseUrl = resolveOnlineWsBaseUrl();
  if (!baseUrl) return "";

  try {
    const wsUrl = new URL(baseUrl, window.location.origin);
    if (wsUrl.protocol === "http:" || wsUrl.protocol === "https:") {
      wsUrl.protocol = wsUrl.protocol === "https:" ? "wss:" : "ws:";
    }
    if (!["ws:", "wss:"].includes(wsUrl.protocol)) {
      return "";
    }
    if (window.location.protocol === "https:" && wsUrl.protocol === "ws:") {
      wsUrl.protocol = "wss:";
    }
    wsUrl.searchParams.set("page_path", route.path || "/");
    wsUrl.searchParams.set("page_full", route.fullPath || route.path || "/");
    return wsUrl.toString();
  } catch {
    return "";
  }
}

function clearReconnectTimer() {
  if (!reconnectTimer) return;
  clearTimeout(reconnectTimer);
  reconnectTimer = null;
}

function scheduleReconnect() {
  if (!isOnlineSocketActive || !onlineCountEnabled.value) return;
  clearReconnectTimer();
  reconnectTimer = setTimeout(() => {
    connectOnlineSocket();
  }, 5000);
}

function closeOnlineSocket(manual = false) {
  if (!onlineSocket) return;
  const socket = onlineSocket;
  onlineSocket = null;

  if (manual) {
    socket.onopen = null;
    socket.onmessage = null;
    socket.onerror = null;
    socket.onclose = null;
  }

  socket.close();
}

function connectOnlineSocket() {
  if (!import.meta.client || !isOnlineSocketActive || !onlineCountEnabled.value) return;
  if (onlineSocket && [WebSocket.CONNECTING, WebSocket.OPEN].includes(onlineSocket.readyState)) return;

  const wsUrl = buildOnlineWsUrl();
  if (!wsUrl) {
    onlineSocketState.value = "error";
    scheduleReconnect();
    return;
  }

  clearReconnectTimer();
  onlineSocketState.value = "connecting";

  try {
    const socket = new WebSocket(wsUrl);
    onlineSocket = socket;

    socket.onopen = () => {
      if (onlineSocket !== socket) return;
      onlineSocketState.value = "open";
    };

    socket.onmessage = (event) => {
      if (onlineSocket !== socket) return;

      let rawText = "";
      if (typeof event.data === "string") {
        rawText = event.data;
      } else if (event.data instanceof ArrayBuffer) {
        rawText = new TextDecoder().decode(new Uint8Array(event.data));
      } else {
        return;
      }

      const nextOnlineCount = parseOnlineCountMessage(rawText);
      if (nextOnlineCount === null) return;

      onlineCount.value = nextOnlineCount;
      onlineSocketState.value = "open";
    };

    socket.onerror = () => {
      if (onlineSocket !== socket) return;
      onlineSocketState.value = "error";
    };

    socket.onclose = () => {
      if (onlineSocket === socket) {
        onlineSocket = null;
      }
      onlineSocketState.value = "error";
      scheduleReconnect();
    };
  } catch {
    onlineSocketState.value = "error";
    scheduleReconnect();
  }
}

function reconnectOnlineSocket() {
  closeOnlineSocket(true);
  connectOnlineSocket();
}

function isExternalLink(url: string) {
  return isExternalSiteLink(url, siteHostname.value);
}

if (import.meta.client) {
  onMounted(() => {
    if (!onlineCountEnabled.value) return;
    isOnlineSocketActive = true;
    connectOnlineSocket();
  });

  onBeforeUnmount(() => {
    isOnlineSocketActive = false;
    clearReconnectTimer();
    closeOnlineSocket(true);
  });

  watch(
    () => route.fullPath,
    () => {
      if (!isOnlineSocketActive || !onlineCountEnabled.value) return;
      reconnectOnlineSocket();
    },
  );
}
</script>

<template>
  <footer class="site-footer">
    <div class="footer-shell">
      <section class="footer-top">
        <div class="footer-brand">
          <div class="brand-title-row">
            <h3 class="brand-title">{{ settings.siteTitle }}</h3>
            <p v-if="onlineCountEnabled" class="online-status" :class="`is-${onlineSocketState}`" role="status" aria-live="polite">
              <span class="online-status-dot" aria-hidden="true" />
              <span>{{ onlineStatusText }}</span>
            </p>
          </div>
          <p class="brand-motto">{{ settings.siteDesc }}</p>
          <p class="brand-copy">{{ copyrightText }} Powered By <a href="https://github.com/nehex" target="_blank" rel="noopener noreferrer" class="external-link">NeHex</a>&<a href="https://github.com/NeHex/theme-Rei" target="_blank" rel="noopener noreferrer" class="external-link">Rei</a></p>
        </div>

        <nav class="footer-col" aria-label="快捷导航">
          <h4>快捷导航</h4>
          <NuxtLink prefetch="false" to="/">首页</NuxtLink>
          <NuxtLink prefetch="false" to="/article">文章</NuxtLink>
          <NuxtLink prefetch="false" to="/album">相册</NuxtLink>
          <NuxtLink prefetch="false" to="/archive">归档</NuxtLink>
        </nav>

        <nav class="footer-col" aria-label="更多链接">
          <h4>更多</h4>
          <template v-for="item in settings.themeNav" :key="`${item.label}-${item.to}`">
            <a
              v-if="isExternalLink(item.to)"
              :href="item.to"
              class="external-link"
              target="_blank"
              rel="noopener noreferrer"
            >
              {{ item.label }}
            </a>
            <NuxtLink prefetch="false" v-else :to="item.to">
              {{ item.label }}
            </NuxtLink>
          </template>
        </nav>

        <nav class="footer-col" aria-label="联系我">
          <h4>联系我</h4>
          <a
            v-for="item in contactLinks"
            :key="item.label"
            :href="item.href"
            :class="{ 'external-link': isExternalLink(item.href) }"
            :target="isExternalLink(item.href) ? '_blank' : undefined"
            :rel="isExternalLink(item.href) ? 'noopener noreferrer' : undefined"
          >
            {{ item.label }}
          </a>
        </nav>
      </section>

      <section class="footer-bottom">
        <p class="bottom-left">{{ settings.siteUrl }}</p>
        <p class="bottom-right">{{ settings.siteIcp }}</p>
      </section>
    </div>
  </footer>
</template>

<style scoped>
.site-footer {
  position: relative;
  padding: 0.5rem 0 max(0.35rem, env(safe-area-inset-bottom));
  background: #030714;
  overflow: hidden;
}

.footer-shell {
  width: var(--site-max-width);
  margin: 0 auto;
  padding: 0 1rem;
}

.footer-top {
  display: grid;
  grid-template-columns: minmax(0, 1fr) repeat(3, max-content);
  row-gap: 1rem;
  column-gap: clamp(8rem, 2.8vw, 2.6rem);
  padding: 0.85rem 0 1rem;
}

.footer-brand {
  min-width: 0;
}

.brand-title-row {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 0.42rem;
  flex-wrap: wrap;
}

.brand-title {
  margin: 0;
  font-size: 1.42rem;
  color: rgba(236, 246, 255, 0.96);
}

.online-status {
  margin: 0;
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.22rem 0.56rem;
  border-radius: 999px;
  background: rgba(249, 209, 98, 0.1);
  color: rgba(255, 222, 133, 0.95);
  font-size: 0.75rem;
  line-height: 1;
}

.online-status-dot {
  width: 0.46rem;
  height: 0.46rem;
  border-radius: 999px;
  background: #f5c85f;
}

.online-status.is-open {
  background: rgba(74, 218, 138, 0.12);
  color: rgba(152, 248, 191, 0.95);
}

.online-status.is-open .online-status-dot {
  background: #47d985;
}

.online-status.is-error {
  background: rgba(255, 103, 103, 0.12);
  color: rgba(255, 149, 149, 0.95);
}

.online-status.is-error .online-status-dot {
  background: #ff6464;
}

.brand-motto {
  margin: 0.46rem 0 0;
  color: rgba(199, 216, 235, 0.9);
  font-size: 0.86rem;
  line-height: 1.7;
}

.brand-copy {
  margin: 0.56rem 0 0;
  color: rgba(155, 179, 203, 0.82);
  font-size: 0.82rem;
}

.footer-col {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
  justify-self: end;
}

.footer-col h4 {
  margin: 0;
  font-size: 0.78rem;
  color: rgba(200, 219, 239, 0.66);
  font-weight: 600;
}

.footer-col a {
  width: fit-content;
  color: rgba(219, 233, 247, 0.92);
  text-decoration: none;
  font-size: 0.82rem;
}

.footer-col a:hover {
  color: #ffffff;
}

.footer-bottom {
  margin-top: 0.15rem;
  border-top: 1px solid rgba(118, 170, 194, 0.16);
  padding: 0.72rem 0 0.08rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.95rem;
}

.bottom-left,
.bottom-right {
  margin: 0;
  color: rgba(147, 172, 196, 0.72);
  font-size: 0.75rem;
}

.bottom-right {
  white-space: nowrap;
}

@media (max-width: 980px) {
  .footer-top {
    grid-template-columns: 1fr 1fr;
    gap: 1.3rem;
  }

  .footer-col {
    justify-self: start;
  }
}

@media (max-width: 760px) {
  .site-footer {
    padding-top: 0.5rem;
  }

  .footer-col {
    display: flex;
    flex-direction: row;
    gap: 0.45rem;
  }

  .footer-shell {
    width: min(96%, 1560px);
    padding: 0;
  }

  .footer-top {
    grid-template-columns: 1fr;
    gap: 1rem;
    padding-bottom: 0.85rem;
  }

  .footer-bottom {
    padding-top: 0.66rem;
    flex-direction: row;
    align-items: center;
    gap: 0.6rem;
  }

  .bottom-left,
  .bottom-right {
    white-space: nowrap;
    font-size: 0.72rem;
  }

  .bottom-left {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
  }
}
</style>
