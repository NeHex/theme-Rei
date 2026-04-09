<script setup lang="ts">
import { md5Hex } from "~/utils/md5";

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
const replyTo = ref<CommentViewItem | null>(null);
const isSending = ref(false);
const sendError = ref("");
const likeError = ref("");
const gravatarCache = new Map<string, string>();
const { settings } = useSiteSettings();
const adminMarkerCookie = useCookie<string>("nehex_admin_marker", {
  sameSite: "lax",
  default: () => "",
});
const likedCommentCookie = useCookie<string>("comment_liked_ids", {
  sameSite: "lax",
  maxAge: 60 * 60 * 24 * 365,
  default: () => "",
});
const likedCommentIds = ref<Set<number>>(new Set());
const isAdminCommenter = computed(() => Boolean(String(adminMarkerCookie.value || "").trim()));

const resolvedTargetId = computed(() => {
  const value = props.targetId || props.articleId;
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
});

const canLoad = computed(() => Boolean(props.targetType) && resolvedTargetId.value > 0);

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
    const submitNickname = isAdminCommenter.value
      ? String(settings.value.userName || "").trim() || "站长"
      : draftNickname.value.trim() || getDefaultNickname();

    await $fetch<CommentCreateResponse>("/api/comment", {
      method: "POST",
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

    await loadComments();
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

watch([() => props.targetType, resolvedTargetId], () => {
  loadComments();
}, { immediate: true });

onMounted(() => {
  syncLikedCommentsFromCookie();
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

      <textarea
        v-model="draftContent"
        class="comment-textarea"
        :placeholder="replyTo ? `回复 ${replyTo.nickname}...` : '写点什么吧...'"
        maxlength="1200"
      />

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

          <p class="comment-content">{{ comment.content }}</p>

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

                <p class="comment-content">{{ reply.content }}</p>

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
  margin-top: 0.85rem;
  padding: 0.78rem;
  border-radius: 0.8rem;
  border: 1px solid rgba(118, 170, 194, 0.22);
  background: rgba(4, 14, 27, 0.62);
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
  background: rgba(7, 17, 32, 0.75);
  color: rgba(225, 239, 252, 0.95);
  padding: 0.48rem 0.65rem;
}

.comment-input-full {
  grid-column: 1 / -1;
}

.comment-input:focus {
  outline: none;
  border-color: rgba(86, 203, 236, 0.5);
  box-shadow: 0 0 0 2px rgba(64, 182, 216, 0.18);
}

.comment-textarea {
  width: 100%;
  min-height: 7.2rem;
  resize: vertical;
  border: 1px solid rgba(118, 170, 194, 0.24);
  border-radius: 0.64rem;
  background: rgba(7, 17, 32, 0.75);
  color: rgba(225, 239, 252, 0.95);
  padding: 0.72rem 0.8rem;
  line-height: 1.72;
}

.comment-textarea:focus {
  outline: none;
  border-color: rgba(86, 203, 236, 0.5);
  box-shadow: 0 0 0 2px rgba(64, 182, 216, 0.18);
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
}
</style>
