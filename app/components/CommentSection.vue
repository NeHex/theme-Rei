<script setup lang="ts">
import { md5Hex } from "~/utils/md5";
import { readAdminMarker, syncAdminMarker as requestAdminMarkerSync } from "~/composables/useAdminMarker";

type CommentItem = {
  id: number;
  parent_id: number;
  target_type: string;
  target_id: number;
  content: string;
  nickname: string;
  email: string | null;
  website: string | null;
  like_count: number;
  status: number;
  is_admin?: boolean;
  ip: string | null;
  create_time: string;
  update_time: string;
  avatar_url?: string | null;
  replies: CommentItem[];
};

type CommentViewItem = Omit<CommentItem, "replies"> & {
  avatar_url: string;
  replies: CommentViewItem[];
};

type CommentListResponse = {
  data: CommentItem[];
};

type CommentCreateResponse = {
  data: CommentItem;
};

type MemeItem = {
  code: string;
  url: string;
};

type MemeGroup = {
  key: string;
  cover: string;
  items: MemeItem[];
};

type CommentContentSegment =
  | {
      type: "text";
      text: string;
      key: string;
    }
  | {
      type: "meme";
      code: string;
      url: string;
      key: string;
    };

const props = withDefaults(
  defineProps<{
    articleId?: string;
    targetType?: string;
    targetId?: string | number;
    allowInput?: boolean;
  }>(),
  {
    articleId: "",
    targetType: "article",
    targetId: "",
    allowInput: true,
  },
);

const emit = defineEmits<{
  submit: [payload: { content: string; targetType: string; targetId: number; parentId: number }];
}>();

const DEFAULT_AVATAR = "/images/head.jpg";
const GRAVATAR_SIZE = 96;

const comments = ref<CommentViewItem[]>([]);
const loading = ref(false);
const loadError = ref("");

const draftNickname = ref("");
const draftEmail = ref("");
const draftWebsite = ref("");
const draftContent = ref("");
const draftContentRef = ref<HTMLTextAreaElement | null>(null);
const memePanelRef = ref<HTMLElement | null>(null);
const replyTo = ref<CommentViewItem | null>(null);
const memePanelOpen = ref(false);
const activeMemeGroupKey = ref("");
const isSending = ref(false);
const sendError = ref("");
const likeError = ref("");
const gravatarCache = new Map<string, string>();
const { settings } = useSiteSettings();
const runtimeConfig = useRuntimeConfig();
const adminMarkerCookieName = String(runtimeConfig.public.adminMarkerCookieName || "nehex_admin_marker")
  .trim() || "nehex_admin_marker";
const adminMarkerCookie = useCookie<string>(adminMarkerCookieName, {
  sameSite: "lax",
  default: () => "",
});
const likedCommentCookie = useCookie<string>("comment_liked_ids", {
  sameSite: "lax",
  maxAge: 60 * 60 * 24 * 365,
  default: () => "",
});
const likedCommentIds = ref<Set<number>>(new Set());
const mountedOnClient = ref(false);
const syncedAdminMarker = ref("");
let syncAdminMarkerTask: Promise<string> | null = null;
let delayedRefreshTimer: ReturnType<typeof setTimeout> | null = null;
const isAdminCommenter = computed(() => {
  if (!mountedOnClient.value) return false;
  return Boolean(getResolvedAdminMarker());
});

const resolvedTargetId = computed(() => {
  const value = props.targetId || props.articleId;
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
});

const canLoad = computed(() => Boolean(props.targetType) && resolvedTargetId.value > 0);
const memeGroups = computed<MemeGroup[]>(() => {
  const source = settings.value.commentMemes || {};
  return Object.entries(source)
    .map(([groupKey, groupRecord]) => {
      const items = Object.entries(groupRecord || {})
        .map(([code, url]) => ({
          code: String(code || "").trim(),
          url: String(url || "").trim(),
        }))
        .filter((item) => item.code && item.url);
      if (!items.length) return null;

      return {
        key: String(groupKey || "").trim(),
        cover: items[0]!.url,
        items,
      } satisfies MemeGroup;
    })
    .filter((item): item is MemeGroup => Boolean(item && item.key));
});
const hasMemeGroups = computed(() => memeGroups.value.length > 0);
const activeMemeGroup = computed(() =>
  memeGroups.value.find((group) => group.key === activeMemeGroupKey.value) || memeGroups.value[0] || null,
);
const activeMemeItems = computed(() => activeMemeGroup.value?.items || []);
const memeLookup = computed(() => {
  const entries: Array<[string, string]> = [];
  for (const group of memeGroups.value) {
    for (const item of group.items) {
      entries.push([item.code, item.url]);
    }
  }
  return new Map<string, string>(entries);
});

const totalCount = computed(() => {
  const walk = (items: CommentViewItem[]) =>
    items.reduce((sum, item) => sum + 1 + walk(item.replies ?? []), 0);
  return walk(comments.value);
});

function getDefaultNickname() {
  return "游客";
}

function normalizeOptional(value: string) {
  const normalized = value.trim();
  return normalized || undefined;
}

function closeMemePanel() {
  memePanelOpen.value = false;
}

function toggleMemePanel() {
  if (!hasMemeGroups.value) return;
  memePanelOpen.value = !memePanelOpen.value;
}

function selectMemeGroup(groupKey: string) {
  activeMemeGroupKey.value = groupKey;
}

function insertMemeCode(code: string) {
  const normalizedCode = String(code || "").trim();
  if (!normalizedCode) return;

  const token = `::${normalizedCode}`;
  const textarea = draftContentRef.value;
  if (!textarea || !import.meta.client) {
    draftContent.value = `${draftContent.value}${token}`;
    closeMemePanel();
    return;
  }

  const currentValue = draftContent.value;
  const start = textarea.selectionStart ?? currentValue.length;
  const end = textarea.selectionEnd ?? start;
  const prefix = start > 0 && /\S/.test(currentValue[start - 1] || "") ? " " : "";
  const suffix = end < currentValue.length && /\S/.test(currentValue[end] || "") ? " " : "";
  const insertText = `${prefix}${token}${suffix}`;

  draftContent.value = `${currentValue.slice(0, start)}${insertText}${currentValue.slice(end)}`;
  closeMemePanel();

  nextTick(() => {
    const nextCursor = start + insertText.length;
    textarea.focus();
    textarea.setSelectionRange(nextCursor, nextCursor);
  });
}

function parseCommentContent(content: string): CommentContentSegment[] {
  const text = String(content || "");
  const segments: CommentContentSegment[] = [];
  const regex = /::([A-Za-z0-9_]+)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null = null;

  while ((match = regex.exec(text)) !== null) {
    const code = String(match[1] || "").trim();
    const url = memeLookup.value.get(code);
    if (!url) continue;

    if (match.index > lastIndex) {
      segments.push({
        type: "text",
        text: text.slice(lastIndex, match.index),
        key: `text-${lastIndex}`,
      });
    }

    segments.push({
      type: "meme",
      code,
      url,
      key: `meme-${match.index}-${code}`,
    });
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    segments.push({
      type: "text",
      text: text.slice(lastIndex),
      key: `text-${lastIndex}`,
    });
  }

  if (!segments.length) {
    segments.push({
      type: "text",
      text,
      key: "text-0",
    });
  }

  return segments;
}

function getResolvedAdminMarker() {
  const markerFromSyncedState = String(syncedAdminMarker.value || "").trim();
  if (markerFromSyncedState) return markerFromSyncedState;

  const markerFromCookie = String(adminMarkerCookie.value || "").trim();
  if (markerFromCookie) return markerFromCookie;

  if (!import.meta.client) return "";
  return readAdminMarker();
}

async function syncAdminMarkerFromConsole() {
  if (!import.meta.client) return "";
  if (syncAdminMarkerTask) return syncAdminMarkerTask;

  syncAdminMarkerTask = (async () => {
    const syncedMarker = String((await requestAdminMarkerSync()) || "").trim();
    if (syncedMarker) {
      syncedAdminMarker.value = syncedMarker;
      return syncedMarker;
    }

    const fallbackMarker = String(readAdminMarker() || adminMarkerCookie.value || "").trim();
    syncedAdminMarker.value = fallbackMarker;
    return fallbackMarker;
  })().finally(() => {
    syncAdminMarkerTask = null;
  });

  return syncAdminMarkerTask;
}

function parseLikedCommentIds(rawValue: string | null | undefined) {
  const result = new Set<number>();
  const chunks = String(rawValue || "").split(",");
  for (const chunk of chunks) {
    const value = chunk.trim();
    if (!value || !/^\d+$/.test(value)) continue;
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0) continue;
    result.add(parsed);
  }
  return result;
}

function syncLikedCommentsFromCookie() {
  likedCommentIds.value = parseLikedCommentIds(likedCommentCookie.value);
}

function persistLikedCommentsToCookie() {
  likedCommentCookie.value = Array.from(likedCommentIds.value).join(",");
}

function hasLikedComment(commentId: number) {
  return likedCommentIds.value.has(commentId);
}

function markCommentLiked(commentId: number) {
  if (likedCommentIds.value.has(commentId)) return;
  likedCommentIds.value.add(commentId);
  persistLikedCommentsToCookie();
}

function updateCommentLikeCount(commentId: number, likeCount: number) {
  const walk = (items: CommentViewItem[]): boolean => {
    for (const item of items) {
      if (item.id === commentId) {
        item.like_count = likeCount;
        return true;
      }
      if (item.replies?.length && walk(item.replies)) {
        return true;
      }
    }
    return false;
  };

  walk(comments.value);
}

function formatDateTime(dateString: string) {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return dateString;

  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function getGravatarUrl(email: string | null) {
  const normalized = String(email || "").trim().toLowerCase();
  if (!normalized) return DEFAULT_AVATAR;

  const cached = gravatarCache.get(normalized);
  if (cached) return cached;

  const hash = md5Hex(normalized);
  if (!hash) return DEFAULT_AVATAR;

  const url = `https://cn.gravatar.com/avatar/${hash}?s=${GRAVATAR_SIZE}&d=mp`;
  gravatarCache.set(normalized, url);
  return url;
}

function resolveAvatarUrl(item: CommentItem) {
  const backendAvatar = String(item.avatar_url || "").trim();
  if (backendAvatar) return backendAvatar;
  return getGravatarUrl(item.email);
}

function mapCommentView(item: CommentItem): CommentViewItem {
  const replies = (item.replies || []).map((reply) => mapCommentView(reply));
  const avatarUrl = resolveAvatarUrl(item);

  return {
    ...item,
    is_admin: Boolean(item.is_admin),
    avatar_url: avatarUrl,
    replies,
  };
}

function toCommentViewList(items: CommentItem[]) {
  return (items || []).map((item) => mapCommentView(item));
}

function hasCommentById(items: CommentViewItem[], commentId: number): boolean {
  for (const item of items) {
    if (item.id === commentId) return true;
    if (item.replies?.length && hasCommentById(item.replies, commentId)) return true;
  }
  return false;
}

function findCommentById(items: CommentViewItem[], commentId: number): CommentViewItem | null {
  for (const item of items) {
    if (item.id === commentId) return item;
    if (item.replies?.length) {
      const found = findCommentById(item.replies, commentId);
      if (found) return found;
    }
  }
  return null;
}

function insertCreatedComment(createdComment: CommentItem, parentId: number) {
  const mapped = mapCommentView(createdComment);
  if (hasCommentById(comments.value, mapped.id)) return;

  if (parentId > 0) {
    const parent = findCommentById(comments.value, parentId);
    if (parent) {
      parent.replies = [...(parent.replies || []), mapped];
      return;
    }
  }

  comments.value = [...comments.value, mapped];
}

function scheduleDelayedRefresh(delayMs = 35000) {
  if (!import.meta.client) return;
  if (delayedRefreshTimer !== null) {
    window.clearTimeout(delayedRefreshTimer);
  }

  delayedRefreshTimer = window.setTimeout(() => {
    delayedRefreshTimer = null;
    void loadComments();
  }, delayMs);
}

async function loadComments() {
  if (!canLoad.value) {
    comments.value = [];
    return;
  }

  loading.value = true;
  loadError.value = "";

  try {
    const response = await $fetch<CommentListResponse>("/api/comment", {
      method: "GET",
      query: {
        target_type: props.targetType,
        target_id: resolvedTargetId.value,
      },
    });

    comments.value = toCommentViewList(response.data || []);
  } catch (error: any) {
    comments.value = [];
    loadError.value = String(error?.statusMessage || "评论加载失败");
  } finally {
    loading.value = false;
  }
}

async function handleSubmit() {
  if (isSending.value || !canLoad.value) return;

  const content = draftContent.value.trim();
  if (!content) return;

  sendError.value = "";
  isSending.value = true;

  const parentId = replyTo.value?.id || 0;

  try {
    if (!getResolvedAdminMarker()) {
      await syncAdminMarkerFromConsole();
    }
    const adminMarker = getResolvedAdminMarker();
    const submitNickname = isAdminCommenter.value
      ? String(settings.value.userName || "").trim() || "站长"
      : draftNickname.value.trim() || getDefaultNickname();

    const response = await $fetch<CommentCreateResponse>("/api/comment", {
      method: "POST",
      headers: adminMarker
        ? {
            "x-nehex-admin-marker": adminMarker,
          }
        : undefined,
      body: {
        parent_id: parentId,
        target_type: props.targetType,
        target_id: resolvedTargetId.value,
        content,
        nickname: submitNickname,
        email: isAdminCommenter.value ? undefined : normalizeOptional(draftEmail.value),
        website: isAdminCommenter.value ? undefined : normalizeOptional(draftWebsite.value),
      },
    });
    if (response?.data) {
      insertCreatedComment(response.data, parentId);
    }
    scheduleDelayedRefresh();

    emit("submit", {
      content,
      targetType: props.targetType,
      targetId: resolvedTargetId.value,
      parentId,
    });

    draftContent.value = "";
    if (isAdminCommenter.value) {
      draftNickname.value = "";
      draftEmail.value = "";
      draftWebsite.value = "";
    }
    replyTo.value = null;

  } catch (error: any) {
    sendError.value = String(error?.statusMessage || "评论提交失败");
  } finally {
    isSending.value = false;
  }
}

async function handleLike(comment: CommentViewItem) {
  if (hasLikedComment(comment.id)) return;

  likeError.value = "";
  const previousLikeCount = comment.like_count;
  comment.like_count += 1;

  try {
    const response = await $fetch<CommentCreateResponse>(`/api/comment/${comment.id}/like`, {
      method: "POST",
    });

    updateCommentLikeCount(comment.id, response.data.like_count);
    markCommentLiked(comment.id);
  } catch (error: any) {
    comment.like_count = previousLikeCount;
    const statusCode = Number(error?.statusCode || error?.response?.status || 500);

    if (statusCode === 409) {
      markCommentLiked(comment.id);
      return;
    }

    likeError.value = String(error?.statusMessage || "点赞失败，请稍后再试");
  }
}

function startReply(comment: CommentViewItem) {
  replyTo.value = comment;
}

function cancelReply() {
  replyTo.value = null;
}

function handleGlobalPointerDown(event: PointerEvent) {
  if (!memePanelOpen.value) return;
  const target = event.target;
  if (!(target instanceof Node)) return;
  if (memePanelRef.value?.contains(target)) return;
  if (target instanceof HTMLElement && target.closest(".comment-meme-toggle")) return;
  closeMemePanel();
}

function handleGlobalKeydown(event: KeyboardEvent) {
  if (event.key !== "Escape") return;
  closeMemePanel();
}

watch(
  memeGroups,
  (groups) => {
    if (!groups.length) {
      activeMemeGroupKey.value = "";
      closeMemePanel();
      return;
    }

    const hasMatched = groups.some((group) => group.key === activeMemeGroupKey.value);
    if (!hasMatched) {
      activeMemeGroupKey.value = groups[0]!.key;
    }
  },
  { immediate: true },
);

watch([() => props.targetType, resolvedTargetId], () => {
  loadComments();
}, { immediate: true });

onMounted(() => {
  mountedOnClient.value = true;
  syncLikedCommentsFromCookie();
  syncedAdminMarker.value = String(readAdminMarker() || adminMarkerCookie.value || "").trim();
  void syncAdminMarkerFromConsole();
  if (import.meta.client) {
    window.addEventListener("pointerdown", handleGlobalPointerDown);
    window.addEventListener("keydown", handleGlobalKeydown);
  }
});

onBeforeUnmount(() => {
  if (delayedRefreshTimer !== null && import.meta.client) {
    window.clearTimeout(delayedRefreshTimer);
  }
  if (import.meta.client) {
    window.removeEventListener("pointerdown", handleGlobalPointerDown);
    window.removeEventListener("keydown", handleGlobalKeydown);
  }
});
</script>

<template>
  <section class="comment-section" aria-label="评论区">
    <header class="comment-header">
      <h2>评论</h2>
      <span class="comment-count">{{ totalCount }} 条</span>
    </header>

    <form v-if="allowInput" class="comment-editor" @submit.prevent="handleSubmit">
      <div v-if="!isAdminCommenter" class="comment-editor-grid">
        <input v-model="draftNickname" type="text" class="comment-input" placeholder="昵称（必填）" maxlength="100" />
        <input v-model="draftEmail" type="email" class="comment-input" placeholder="邮箱（选填）" maxlength="255" />
        <input v-model="draftWebsite" type="url" class="comment-input comment-input-full" placeholder="网站（选填）" maxlength="255" />
      </div>
      <p v-else class="comment-admin-hint">已识别站长身份，无需填写昵称、邮箱和网站。</p>

      <div class="comment-textarea-wrap">
        <textarea
          ref="draftContentRef"
          v-model="draftContent"
          class="comment-textarea"
          :placeholder="replyTo ? `回复 ${replyTo.nickname}...` : '写点什么吧...'"
          maxlength="1200"
        />
        <div class="comment-meme-entry">
          <button
            type="button"
            class="comment-meme-toggle"
            :disabled="!hasMemeGroups"
            :aria-expanded="memePanelOpen"
            @click="toggleMemePanel"
          >
            😀 表情
          </button>

          <Transition name="comment-meme-panel">
            <div
              v-if="memePanelOpen && hasMemeGroups"
              ref="memePanelRef"
              class="comment-meme-panel"
              role="dialog"
              aria-label="选择表情包"
            >
              <div class="comment-meme-panel-body">
                <button
                  v-for="item in activeMemeItems"
                  :key="item.code"
                  type="button"
                  class="comment-meme-pick"
                  :title="`::${item.code}`"
                  @click="insertMemeCode(item.code)"
                >
                  <img :src="item.url" :alt="item.code" loading="lazy" />
                </button>
                <p v-if="!activeMemeItems.length" class="comment-meme-empty">此分组暂无表情包。</p>
              </div>

              <div class="comment-meme-group-tabs">
                <button
                  v-for="group in memeGroups"
                  :key="group.key"
                  type="button"
                  class="comment-meme-group-btn"
                  :class="{ 'is-active': activeMemeGroup?.key === group.key }"
                  :title="group.key"
                  @click="selectMemeGroup(group.key)"
                >
                  <img :src="group.cover" :alt="group.key" loading="lazy" />
                </button>
              </div>
            </div>
          </Transition>
        </div>
      </div>

      <div v-if="replyTo" class="comment-replying">
        正在回复：{{ replyTo.nickname }}
        <button type="button" @click="cancelReply">取消</button>
      </div>

      <div class="comment-editor-foot">
        <p class="comment-tip">评论会按时间排序显示，支持楼中楼回复。</p>
        <button class="comment-submit" type="submit" :disabled="!draftContent.trim() || isSending">
          {{ isSending ? "发送中..." : "发送评论" }}
        </button>
      </div>

      <p v-if="sendError" class="comment-error">{{ sendError }}</p>
      <p v-if="likeError" class="comment-error">{{ likeError }}</p>
    </form>

    <p v-if="loading" class="comment-state">评论加载中...</p>
    <p v-else-if="loadError" class="comment-error">{{ loadError }}</p>

    <ol v-else class="comment-list">
      <li v-for="comment in comments" :key="comment.id" class="comment-item">
        <article class="comment-card">
          <header class="comment-meta">
            <img
              class="comment-avatar"
              :src="comment.avatar_url"
              :alt="`${comment.nickname} 的头像`"
            />

            <div class="comment-author-wrap">
              <h3>
                <span>{{ comment.nickname }}</span>
                <span v-if="comment.is_admin" class="comment-admin-badge">站长</span>
              </h3>
              <time :datetime="comment.create_time">{{ formatDateTime(comment.create_time) }}</time>
            </div>
          </header>

          <p class="comment-content comment-content-rich">
            <template v-for="segment in parseCommentContent(comment.content)" :key="segment.key">
              <span v-if="segment.type === 'text'" class="comment-content-text">{{ segment.text }}</span>
              <img
                v-else
                class="comment-content-meme"
                :src="segment.url"
                :alt="segment.code"
                loading="lazy"
              >
            </template>
          </p>

          <footer class="comment-actions">
            <button
              type="button"
              class="comment-action-btn"
              :class="{ 'is-liked': hasLikedComment(comment.id) }"
              :disabled="hasLikedComment(comment.id)"
              @click="handleLike(comment)"
            >
              👍 {{ comment.like_count }}
            </button>
            <button type="button" class="comment-action-btn" @click="startReply(comment)">回复</button>
          </footer>

          <ul v-if="comment.replies?.length" class="reply-list">
            <li v-for="reply in comment.replies" :key="reply.id" class="reply-item">
              <article class="reply-card">
                <header class="reply-meta">
                  <img
                    class="comment-avatar is-reply"
                    :src="reply.avatar_url"
                    :alt="`${reply.nickname} 的头像`"
                  />

                  <div class="comment-author-wrap">
                    <h4>
                      <span>{{ reply.nickname }}</span>
                      <span v-if="reply.is_admin" class="comment-admin-badge">站长</span>
                    </h4>
                    <time :datetime="reply.create_time">{{ formatDateTime(reply.create_time) }}</time>
                  </div>
                </header>

                <p class="comment-content comment-content-rich">
                  <template v-for="segment in parseCommentContent(reply.content)" :key="segment.key">
                    <span v-if="segment.type === 'text'" class="comment-content-text">{{ segment.text }}</span>
                    <img
                      v-else
                      class="comment-content-meme"
                      :src="segment.url"
                      :alt="segment.code"
                      loading="lazy"
                    >
                  </template>
                </p>

                <footer class="comment-actions">
                  <button
                    type="button"
                    class="comment-action-btn"
                    :class="{ 'is-liked': hasLikedComment(reply.id) }"
                    :disabled="hasLikedComment(reply.id)"
                    @click="handleLike(reply)"
                  >
                    👍 {{ reply.like_count }}
                  </button>
                  <button type="button" class="comment-action-btn" @click="startReply(reply)">回复</button>
                </footer>
              </article>
            </li>
          </ul>
        </article>
      </li>

      <li v-if="!comments.length" class="comment-empty">暂无评论，来做第一个留言的人吧。</li>
    </ol>
  </section>
</template>

<style scoped>
.comment-section {
  margin-top: 1rem;
  padding: 1.15rem;
  border-radius: 1rem;
  border: 1px solid var(--theme-border);
  background: var(--theme-surface);
  backdrop-filter: blur(8px);
}

.comment-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.8rem;
}

.comment-header h2 {
  margin: 0;
  color: rgba(230, 243, 255, 0.95);
  font-size: clamp(1.3rem, 2vw, 1.7rem);
}

.comment-count {
  color: rgba(178, 204, 224, 0.84);
  font-size: 0.9rem;
}

.comment-editor {
  position: relative;
  overflow: visible;
  isolation: isolate;
  z-index: 6;
  margin-top: 0.85rem;
  padding: 0.78rem;
  border-radius: 0.8rem;
  border: 1px solid rgba(118, 170, 194, 0.22);
  background: rgba(4, 14, 27, 0.62);
  transition: border-color 0.24s ease, box-shadow 0.24s ease;
}

.comment-editor::before {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: inherit;
  z-index: 0;
  pointer-events: none;
  opacity: 0;
  transform: translateX(10%);
  background:
    linear-gradient(
      120deg,
      rgba(72, 194, 228, 0.05) 8%,
      rgba(95, 234, 248, 0.2) 48%,
      rgba(68, 167, 229, 0.08) 82%
    );
  transition: opacity 0.28s ease, transform 0.32s ease;
}

.comment-editor:focus-within {
  border-color: rgba(93, 208, 238, 0.46);
  box-shadow: 0 0 0 1px rgba(63, 186, 220, 0.24);
}

.comment-editor:focus-within::before {
  opacity: 1;
  transform: translateX(0);
}

.comment-editor > * {
  position: relative;
  z-index: 1;
}

.comment-editor-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.5rem;
  margin-bottom: 0.6rem;
}

.comment-admin-hint {
  margin: 0 0 0.6rem;
  color: rgba(171, 198, 219, 0.9);
  font-size: 0.82rem;
}

.comment-input {
  width: 100%;
  border: 1px solid rgba(118, 170, 194, 0.24);
  border-radius: 0.55rem;
  background:
    linear-gradient(
      112deg,
      rgba(14, 39, 59, 0.35) 0%,
      rgba(18, 61, 86, 0.56) 45%,
      rgba(9, 25, 42, 0.36) 100%
    ),
    rgba(7, 17, 32, 0.75);
  background-size: 220% 220%;
  background-position: 100% 50%;
  color: rgba(225, 239, 252, 0.95);
  padding: 0.48rem 0.65rem;
  transition:
    border-color 0.24s ease,
    box-shadow 0.24s ease,
    background-position 0.36s ease,
    background-color 0.24s ease;
}

.comment-input-full {
  grid-column: 1 / -1;
}

.comment-input:focus {
  outline: none;
  border-color: rgba(86, 203, 236, 0.5);
  box-shadow: 0 0 0 2px rgba(64, 182, 216, 0.18);
  background-position: 0% 50%;
}

.comment-textarea {
  width: 100%;
  min-height: 7.2rem;
  resize: vertical;
  border: 1px solid rgba(118, 170, 194, 0.24);
  border-radius: 0.64rem;
  background:
    linear-gradient(
      112deg,
      rgba(14, 39, 59, 0.35) 0%,
      rgba(18, 61, 86, 0.56) 45%,
      rgba(9, 25, 42, 0.36) 100%
    ),
    rgba(7, 17, 32, 0.75);
  background-size: 220% 220%;
  background-position: 100% 50%;
  color: rgba(225, 239, 252, 0.95);
  padding: 0.72rem 0.8rem 2.75rem;
  line-height: 1.72;
  transition:
    border-color 0.24s ease,
    box-shadow 0.24s ease,
    background-position 0.36s ease,
    background-color 0.24s ease;
}

.comment-textarea:focus {
  outline: none;
  border-color: rgba(86, 203, 236, 0.5);
  box-shadow: 0 0 0 2px rgba(64, 182, 216, 0.18);
  background-position: 0% 50%;
}

.comment-textarea-wrap {
  position: relative;
}

.comment-meme-entry {
  position: absolute;
  left: 0.7rem;
  bottom: 0.55rem;
  z-index: 12;
}

.comment-meme-toggle {
  border: 1px solid rgba(118, 170, 194, 0.28);
  border-radius: 999px;
  background: rgba(10, 30, 48, 0.78);
  color: rgba(216, 234, 247, 0.92);
  font-size: 0.76rem;
  line-height: 1;
  padding: 0.28rem 0.6rem;
  cursor: pointer;
  transition: border-color 0.24s ease, background-color 0.24s ease, transform 0.2s ease;
}

.comment-meme-toggle:hover:not(:disabled) {
  border-color: rgba(136, 212, 242, 0.56);
  background: rgba(16, 46, 72, 0.88);
  transform: translateY(-1px);
}

.comment-meme-toggle:disabled {
  opacity: 0.52;
  cursor: not-allowed;
}

.comment-meme-panel {
  --meme-size: 4.2rem;
  --meme-gap: 0.4rem;
  --meme-panel-padding: 0.62rem;
  position: absolute;
  left: 0;
  bottom: calc(100% + 0.5rem);
  z-index: 20;
  width: calc(var(--meme-size) * 5 + var(--meme-gap) * 4 + var(--meme-panel-padding) * 2);
  border-radius: 0.78rem;
  border: 1px solid rgba(113, 176, 205, 0.36);
  background: rgba(5, 16, 31, 0.95);
  box-shadow: 0 16px 32px rgba(0, 0, 0, 0.4);
  overflow: hidden;
  backdrop-filter: blur(12px);
}

.comment-meme-panel-body {
  max-height: none;
  padding: var(--meme-panel-padding);
  overflow: visible;
  display: grid;
  grid-template-columns: repeat(5, var(--meme-size));
  grid-auto-rows: var(--meme-size);
  gap: var(--meme-gap);
  justify-content: start;
}

.comment-meme-pick {
  width: var(--meme-size);
  height: var(--meme-size);
  border: 1px solid rgba(113, 176, 205, 0.32);
  border-radius: 0.55rem;
  padding: 0;
  overflow: hidden;
  background: rgba(12, 28, 45, 0.88);
  cursor: pointer;
  transition: border-color 0.2s ease, transform 0.2s ease;
}

.comment-meme-pick:hover {
  border-color: rgba(136, 212, 242, 0.64);
  transform: translateY(-1px);
}

.comment-meme-pick img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.comment-meme-empty {
  margin: 0.35rem 0;
  grid-column: 1 / -1;
  color: rgba(171, 198, 219, 0.8);
  font-size: 0.82rem;
}

.comment-meme-group-tabs {
  border-top: 1px solid rgba(113, 176, 205, 0.24);
  padding: 0.52rem;
  display: flex;
  gap: 0.4rem;
  overflow-x: auto;
}

.comment-meme-group-btn {
  width: 2.8rem;
  height: 2.8rem;
  border: 1px solid rgba(118, 170, 194, 0.34);
  border-radius: 0.56rem;
  background: rgba(10, 30, 48, 0.78);
  flex: 0 0 auto;
  padding: 0;
  overflow: hidden;
  cursor: pointer;
  transition: border-color 0.2s ease, transform 0.2s ease;
}

.comment-meme-group-btn img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.comment-meme-group-btn:hover {
  border-color: rgba(136, 212, 242, 0.6);
  transform: translateY(-1px);
}

.comment-meme-group-btn.is-active {
  border-color: rgba(127, 228, 247, 0.76);
  box-shadow: 0 0 0 1px rgba(102, 203, 228, 0.3) inset;
}

.comment-meme-panel-enter-active,
.comment-meme-panel-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.comment-meme-panel-enter-from,
.comment-meme-panel-leave-to {
  opacity: 0;
  transform: translateY(8px);
}

.comment-replying {
  margin-top: 0.5rem;
  color: rgba(171, 198, 219, 0.9);
  font-size: 0.82rem;
}

.comment-replying button {
  margin-left: 0.55rem;
  border: 0;
  background: transparent;
  color: #7cdce8;
  cursor: pointer;
}

.comment-editor-foot {
  margin-top: 0.62rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.7rem;
}

.comment-tip {
  margin: 0;
  color: rgba(171, 198, 219, 0.76);
  font-size: 0.82rem;
}

.comment-submit {
  border: 1px solid rgba(109, 207, 236, 0.45);
  border-radius: 999px;
  background: rgba(18, 71, 112, 0.76);
  color: rgba(240, 250, 255, 0.98);
  padding: 0.42rem 0.95rem;
  cursor: pointer;
}

.comment-submit:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.comment-state,
.comment-empty {
  margin: 0.9rem 0 0;
  color: rgba(171, 198, 219, 0.9);
}

.comment-error {
  margin: 0.7rem 0 0;
  color: #f89da5;
  font-size: 0.86rem;
}

.comment-list {
  margin: 0.92rem 0 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 0.72rem;
}

.comment-card,
.reply-card {
  padding: 0.8rem 0.85rem;
  border-radius: 0.72rem;
  border: 1px solid rgba(118, 170, 194, 0.2);
  background: rgba(8, 17, 30, 0.65);
}

.comment-meta,
.reply-meta {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}

.comment-avatar {
  width: 2.2rem;
  height: 2.2rem;
  border-radius: 50%;
  object-fit: cover;
  border: 1px solid rgba(144, 191, 220, 0.45);
}

.comment-avatar.is-reply {
  width: 1.8rem;
  height: 1.8rem;
}

.comment-author-wrap {
  min-width: 0;
  display: grid;
  gap: 0.06rem;
}

.comment-author-wrap h3,
.comment-author-wrap h4 {
  display: flex;
  align-items: center;
  gap: 0.42rem;
  margin: 0;
  font-size: 0.96rem;
  color: rgba(231, 243, 255, 0.96);
}

.comment-author-wrap h4 {
  font-size: 0.9rem;
}

.comment-author-wrap time {
  color: rgba(168, 196, 217, 0.72);
  font-size: 0.78rem;
}

.comment-admin-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  border: 1px solid rgba(110, 226, 255, 0.5);
  background: rgba(27, 132, 170, 0.35);
  color: rgba(213, 245, 255, 0.98);
  font-size: 0.68rem;
  line-height: 1;
  padding: 0.16rem 0.42rem;
}

.comment-content {
  margin: 0.62rem 0 0;
  color: rgba(208, 225, 241, 0.9);
  line-height: 1.8;
  white-space: pre-wrap;
}

.comment-content-rich {
  display: flex;
  align-items: flex-end;
  flex-wrap: wrap;
  gap: 0.28rem 0.34rem;
}

.comment-content-text {
  white-space: pre-wrap;
}

.comment-content-meme {
  width: 4.2rem;
  height: 4.2rem;
  border-radius: 0.44rem;
  object-fit: cover;
  border: 1px solid rgba(126, 176, 204, 0.38);
  background: rgba(8, 17, 30, 0.65);
  vertical-align: bottom;
}

.comment-actions {
  margin-top: 0.55rem;
  display: flex;
  gap: 0.5rem;
}

.comment-action-btn {
  border: 1px solid rgba(118, 170, 194, 0.24);
  border-radius: 999px;
  background: rgba(10, 26, 44, 0.56);
  color: rgba(203, 225, 241, 0.88);
  font-size: 0.78rem;
  padding: 0.16rem 0.56rem;
  cursor: pointer;
}

.comment-action-btn.is-liked {
  border-color: rgba(118, 215, 232, 0.55);
  background: rgba(26, 92, 124, 0.62);
  color: rgba(230, 249, 255, 0.96);
}

.comment-action-btn:disabled {
  opacity: 0.88;
  cursor: default;
}

.reply-list {
  margin: 0.75rem 0 0;
  padding: 0 0 0 0.85rem;
  list-style: none;
  border-left: 1px dashed rgba(118, 170, 194, 0.35);
  display: grid;
  gap: 0.55rem;
}

@media (max-width: 760px) {
  .comment-section {
    padding: 0.95rem;
  }

  .comment-editor {
    padding: 0.66rem;
  }

  .comment-editor-grid {
    grid-template-columns: 1fr;
  }

  .comment-input-full {
    grid-column: auto;
  }

  .comment-editor-foot {
    flex-direction: column;
    align-items: flex-start;
  }

  .comment-meme-panel {
    --meme-size: 3.7rem;
    --meme-gap: 0.3rem;
    width: calc(var(--meme-size) * 5 + var(--meme-gap) * 4 + var(--meme-panel-padding) * 2);
  }

  .comment-meme-panel-body {
    grid-template-columns: repeat(5, var(--meme-size));
    grid-auto-rows: var(--meme-size);
  }

  .comment-meme-pick {
    width: var(--meme-size);
    height: var(--meme-size);
  }

  .comment-content-meme {
    width: 3.7rem;
    height: 3.7rem;
  }
}
</style>
