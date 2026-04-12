<script setup lang="ts">
import type { FriendStatus, FriendViewItem } from "~/composables/useFriends";
import { isExternalSiteLink, resolveSiteHostname } from "~/utils/link";

const requestUrl = useRequestURL();
const { settings } = useSiteSettings();
const siteHostname = computed(() =>
  resolveSiteHostname(settings.value.siteUrl, `${requestUrl.protocol}//${requestUrl.host}`),
);
const siteBaseUrl = computed(() => {
  const configured = String(settings.value.siteUrl || "").trim();
  if (configured) return configured.replace(/\/+$/, "");
  return `${requestUrl.protocol}//${requestUrl.host}`;
});
const canonicalUrl = computed(() => `${siteBaseUrl.value}/friends`);
const seoDescription = computed(() => `友情链接与站点交换信息 - ${settings.value.siteDesc}`);
const ogImage = computed(() => {
  const input = String(settings.value.userHeadpic || "/images/head.jpg").trim();
  if (!input) return "";
  if (/^https?:\/\//i.test(input)) return input;
  return `${siteBaseUrl.value}${input.startsWith("/") ? input : `/${input}`}`;
});
const friendsSchema = computed(() => ({
  "@context": "https://schema.org",
  "@type": "CollectionPage",
  name: `友链 - ${settings.value.siteTitle}`,
  description: seoDescription.value,
  url: canonicalUrl.value,
}));

useHead(() => ({
  title: `友链 - ${settings.value.siteTitle}`,
  link: [
    {
      rel: "canonical",
      href: canonicalUrl.value,
    },
  ],
  meta: [
    {
      name: "description",
      content: seoDescription.value,
    },
    {
      property: "og:type",
      content: "website",
    },
    {
      property: "og:title",
      content: `友链 - ${settings.value.siteTitle}`,
    },
    {
      property: "og:description",
      content: seoDescription.value,
    },
    {
      property: "og:url",
      content: canonicalUrl.value,
    },
    {
      property: "og:image",
      content: ogImage.value,
    },
  ],
  script: [
    {
      type: "application/ld+json",
      key: "friends-schema",
      children: JSON.stringify(friendsSchema.value),
    },
  ],
}));

type FriendGroupMeta = {
  label: string;
  description: string;
};

const STATUS_ORDER: FriendStatus[] = ["ok", "missing", "blocked"];

const STATUS_META: Record<FriendStatus, FriendGroupMeta> = {
  ok: {
    label: "正常友链",
    description: "目前可访问并正常展示的站点",
  },
  missing: {
    label: "失联友链",
    description: "暂时无法访问，保留记录",
  },
  blocked: {
    label: "屏蔽友链",
    description: "已屏蔽，不在导航推荐",
  },
};

const { friends, pending, error } = useFriends();
const isClientMounted = ref(false);

function shuffleFriends(items: FriendViewItem[]) {
  const shuffled = [...items];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[index]];
  }
  return shuffled;
}

const shuffledFriendsByStatus = ref<Record<FriendStatus, FriendViewItem[]>>({
  ok: [],
  missing: [],
  blocked: [],
});

watch(
  friends,
  (items) => {
    const next: Record<FriendStatus, FriendViewItem[]> = {
      ok: [],
      missing: [],
      blocked: [],
    };

    for (const item of items) {
      next[item.status].push(item);
    }

    for (const status of STATUS_ORDER) {
      next[status] = isClientMounted.value
        ? shuffleFriends(next[status])
        : [...next[status]];
    }

    shuffledFriendsByStatus.value = next;
  },
  { immediate: true },
);

const groupedFriends = computed(() =>
  STATUS_ORDER.map((status) => ({
    status,
    ...STATUS_META[status],
    items: shuffledFriendsByStatus.value[status],
  })),
);

function getCardStyle(item: FriendViewItem) {
  const fallback =
    "radial-gradient(circle at 74% 50%, rgba(10, 66, 108, 0.4), rgba(13, 22, 40, 0.95) 65%)";
  const cover = item.favicon
    ? `url("${item.favicon.replace(/"/g, '\\"')}")`
    : fallback;
  return {
    "--friend-cover": cover,
  } as Record<string, string>;
}

function getStatusTag(status: FriendStatus) {
  if (status === "ok") return "正常";
  if (status === "missing") return "失联";
  return "屏蔽";
}

function isExternalLink(url: string) {
  return isExternalSiteLink(url, siteHostname.value);
}

type FriendApplyStep = 1 | 2;

const FRIEND_APPLY_REQUIREMENTS = [
  "站点可在中国大陆稳定访问，且内容合法合规。",
  "请先添加本站友链，并保证在可见位置展示。",
  "站点有持续更新，不收录纯广告、采集或违规内容。",
];
const FRIENDS_COMMENT_TARGET_TYPE = "friend_page";
const FRIENDS_COMMENT_TARGET_ID = 1;
const { lockScroll, unlockScroll } = useScrollLock();
const isApplyModalLocked = ref(false);

const applyModalVisible = ref(false);
const applyStep = ref<FriendApplyStep>(1);
const applyRequirementChecked = ref(false);
const applySubmitting = ref(false);
const applyFeedback = ref("");
const applyFeedbackType = ref<"success" | "error" | "">("");

const applyForm = reactive({
  siteTitle: "",
  siteUrl: "",
  siteDescription: "",
  siteIcon: "",
});

const localSiteInfo = computed(() => ({
  title: settings.value.siteTitle,
  url: settings.value.siteUrl,
  description: settings.value.siteDesc,
  icon: settings.value.siteFavicon || "/favicon.ico",
}));

function isValidHttpUrl(value: string) {
  const input = value.trim();
  if (!input) return false;
  try {
    const parsed = new URL(input);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

const canApplyNext = computed(() => applyRequirementChecked.value);

const canApplySubmit = computed(() => {
  const title = applyForm.siteTitle.trim();
  const description = applyForm.siteDescription.trim();
  const icon = applyForm.siteIcon.trim();
  return (
    Boolean(title)
    && Boolean(description)
    && isValidHttpUrl(applyForm.siteUrl)
    && (!icon || isValidHttpUrl(icon))
  );
});

function resetApplyDialog() {
  applyStep.value = 1;
  applyRequirementChecked.value = false;
  applySubmitting.value = false;
  applyFeedback.value = "";
  applyFeedbackType.value = "";
  applyForm.siteTitle = "";
  applyForm.siteUrl = "";
  applyForm.siteDescription = "";
  applyForm.siteIcon = "";
}

function openApplyDialog() {
  resetApplyDialog();
  applyModalVisible.value = true;
}

function closeApplyDialog() {
  applyModalVisible.value = false;
}

function goApplyStepTwo() {
  if (!canApplyNext.value) return;
  applyStep.value = 2;
  applyFeedback.value = "";
  applyFeedbackType.value = "";
}

function goApplyStepOne() {
  applyStep.value = 1;
  applyFeedback.value = "";
  applyFeedbackType.value = "";
}

async function submitFriendApply() {
  if (!canApplySubmit.value || applySubmitting.value) return;
  applySubmitting.value = true;
  applyFeedback.value = "";
  applyFeedbackType.value = "";

  try {
    await $fetch("/api/friend-apply", {
      method: "POST",
      body: {
        site_title: applyForm.siteTitle.trim(),
        site_url: applyForm.siteUrl.trim(),
        site_description: applyForm.siteDescription.trim(),
        site_icon: applyForm.siteIcon.trim() || null,
        contact: "",
      },
    });

    applyFeedbackType.value = "success";
    applyFeedback.value = "申请已提交，等待站长审核。";
  } catch (error: any) {
    applyFeedbackType.value = "error";
    applyFeedback.value = String(error?.statusMessage || "申请提交失败，请稍后重试。");
  } finally {
    applySubmitting.value = false;
  }
}

function onApplyDialogKeydown(event: KeyboardEvent) {
  if (event.key === "Escape" && applyModalVisible.value) {
    closeApplyDialog();
  }
}

watch(applyModalVisible, (visible) => {
  if (visible && !isApplyModalLocked.value) {
    lockScroll();
    isApplyModalLocked.value = true;
    return;
  }

  if (!visible && isApplyModalLocked.value) {
    unlockScroll();
    isApplyModalLocked.value = false;
  }
});

onMounted(() => {
  isClientMounted.value = true;
  const reshuffled: Record<FriendStatus, FriendViewItem[]> = {
    ok: shuffleFriends(shuffledFriendsByStatus.value.ok),
    missing: shuffleFriends(shuffledFriendsByStatus.value.missing),
    blocked: shuffleFriends(shuffledFriendsByStatus.value.blocked),
  };
  shuffledFriendsByStatus.value = reshuffled;
  window.addEventListener("keydown", onApplyDialogKeydown);
});

onBeforeUnmount(() => {
  if (isApplyModalLocked.value) {
    unlockScroll();
    isApplyModalLocked.value = false;
  }
  window.removeEventListener("keydown", onApplyDialogKeydown);
});
</script>

<template>
  <div class="friends-page">
    <main class="friends-main">
      <section class="friends-hero">
        <h1 class="friends-title">友链</h1>
        <p class="friends-subtitle">
          记录一路同行的朋友们，愿每次点击都能遇见新的灵感。
        </p>
      </section>

      <p v-if="pending" class="friends-state">正在加载友链…</p>
      <p v-else-if="error" class="friends-state friends-state-error">友链加载失败，请稍后重试。</p>

      <section
        v-for="(group, groupIndex) in groupedFriends"
        :key="group.status"
        class="friends-group"
      >
        <header class="friends-group-head">
          <h2>{{ group.label }}</h2>
          <p>{{ group.description }} · {{ group.items.length }} 个</p>
        </header>

        <div v-if="group.items.length" class="friends-grid">
          <component
            :is="group.status === 'ok' ? 'a' : 'div'"
            v-for="(item, itemIndex) in group.items"
            :key="item.id"
            class="friend-card friend-card-reveal"
            :class="{ 'is-disabled': group.status !== 'ok' }"
            :href="group.status === 'ok' ? item.url : undefined"
            :target="group.status === 'ok' && isExternalLink(item.url) ? '_blank' : undefined"
            :rel="group.status === 'ok' && isExternalLink(item.url) ? 'noopener noreferrer' : undefined"
            :style="{
              ...getCardStyle(item),
              '--friend-order': groupIndex * 20 + itemIndex,
            }"
          >
            <img
              v-if="item.favicon"
              class="friend-avatar"
              :src="item.favicon"
              :alt="`${item.title} 图标`"
              loading="lazy"
            >
            <div v-else class="friend-avatar friend-avatar-fallback">
              {{ item.title.slice(0, 1).toUpperCase() }}
            </div>

            <div class="friend-info">
              <h3 class="friend-title">{{ item.title }}</h3>
              <p class="friend-description">{{ item.description }}</p>
              <div class="friend-meta">
                <span class="friend-tag">{{ item.category }}</span>
                <span class="friend-tag friend-status">{{ getStatusTag(item.status) }}</span>
              </div>
            </div>
          </component>
        </div>

        <p v-else class="friends-empty">这个分组还没有友链。</p>
      </section>

      <section class="friend-apply-entry">
        <article class="local-site-card">
          <header class="local-site-head">
            <h2>本站信息</h2>
            <span>欢迎交换友链</span>
          </header>

          <div class="local-site-main">
            <img
              class="local-site-icon"
              :src="localSiteInfo.icon"
              :alt="`${localSiteInfo.title} 图标`"
            >
            <div class="local-site-meta">
              <h3>{{ localSiteInfo.title }}</h3>
              <a
                :href="localSiteInfo.url"
                :class="{ 'external-link': isExternalLink(localSiteInfo.url) }"
                :target="isExternalLink(localSiteInfo.url) ? '_blank' : undefined"
                :rel="isExternalLink(localSiteInfo.url) ? 'noopener noreferrer' : undefined"
              >{{ localSiteInfo.url }}</a>
              <p>{{ localSiteInfo.description }}</p>
            </div>
          </div>
        </article>

        <button
          type="button"
          class="friend-apply-open-btn"
          @click="openApplyDialog"
        >
          申请友链
        </button>
      </section>

      <section class="friends-comment-shell">
        <header class="friends-comment-head">
          <h2>留言评论</h2>
          <p>欢迎留下你的看法与建议。</p>
        </header>
        <CommentSection
          :target-type="FRIENDS_COMMENT_TARGET_TYPE"
          :target-id="FRIENDS_COMMENT_TARGET_ID"
        />
      </section>
    </main>

    <Transition name="friend-apply-modal">
      <div
        v-if="applyModalVisible"
        class="friend-apply-modal-mask"
        role="dialog"
        aria-modal="true"
        aria-label="申请友链"
        @click.self="closeApplyDialog"
      >
        <article class="friend-apply-modal">
          <header class="friend-apply-modal-head">
            <h3>申请友链</h3>
            <p>步骤 {{ applyStep }} / 2</p>
          </header>

          <section v-if="applyStep === 1" class="friend-apply-step">
            <h4>申请条件</h4>
            <ul class="friend-apply-rule-list">
              <li v-for="(rule, index) in FRIEND_APPLY_REQUIREMENTS" :key="`${rule}-${index}`">{{ rule }}</li>
            </ul>

            <label class="friend-apply-check">
              <input v-model="applyRequirementChecked" type="checkbox">
              <span>我已阅读并确认符合以上要求</span>
            </label>
          </section>

          <section v-else class="friend-apply-step">
            <h4>填写友链信息</h4>
            <form class="friend-apply-form" @submit.prevent="submitFriendApply">
              <label class="friend-apply-field">
                <span>站点标题</span>
                <input
                  v-model="applyForm.siteTitle"
                  type="text"
                  maxlength="100"
                  placeholder="例如：NeHex"
                  required
                >
              </label>

              <label class="friend-apply-field">
                <span>站点链接</span>
                <input
                  v-model="applyForm.siteUrl"
                  type="url"
                  maxlength="255"
                  placeholder="https://example.com"
                  required
                >
              </label>

              <label class="friend-apply-field">
                <span>站点描述</span>
                <textarea
                  v-model="applyForm.siteDescription"
                  rows="3"
                  maxlength="240"
                  placeholder="简要介绍你的站点内容"
                  required
                />
              </label>

              <label class="friend-apply-field">
                <span>站点图标（可选）</span>
                <input
                  v-model="applyForm.siteIcon"
                  type="url"
                  maxlength="255"
                  placeholder="https://example.com/favicon.ico"
                >
              </label>

              <p v-if="applyFeedback" class="friend-apply-feedback" :class="`is-${applyFeedbackType || 'error'}`">
                {{ applyFeedback }}
              </p>
            </form>
          </section>

          <footer class="friend-apply-modal-actions">
            <button type="button" class="friend-apply-btn friend-apply-btn-ghost" @click="closeApplyDialog">
              取消
            </button>
            <button
              v-if="applyStep === 2"
              type="button"
              class="friend-apply-btn friend-apply-btn-ghost"
              @click="goApplyStepOne"
            >
              上一步
            </button>
            <button
              v-if="applyStep === 1"
              type="button"
              class="friend-apply-btn friend-apply-btn-primary"
              :disabled="!canApplyNext"
              @click="goApplyStepTwo"
            >
              下一步
            </button>
            <button
              v-else
              type="button"
              class="friend-apply-btn friend-apply-btn-primary"
              :disabled="!canApplySubmit || applySubmitting"
              @click="submitFriendApply"
            >
              {{ applySubmitting ? "提交中..." : "提交申请" }}
            </button>
          </footer>
        </article>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.friends-page {
  min-height: 100vh;
  padding: 6.7rem 1rem 3.2rem;
}

.friends-main {
  width: var(--site-max-width);
  margin: 0 auto;
}

.friends-hero {
  margin-bottom: 1.55rem;
}

.friends-title {
  margin: 0;
  font-size: var(--fs-display);
  color: #0f9cb8;
  line-height: 1.02;
}

.friends-subtitle {
  margin: 0.7rem 0 0;
  color: var(--theme-text-soft);
  font-size: 1.02rem;
}

.friend-apply-entry {
  margin: 1.35rem 0 0;
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 1rem;
  align-items: stretch;
}

.local-site-card {
  border-radius: 0.88rem;
  border: 1px solid rgba(118, 170, 194, 0.28);
  background: linear-gradient(140deg, rgba(9, 22, 40, 0.92), rgba(7, 16, 30, 0.9));
  box-shadow: 0 10px 26px rgba(0, 0, 0, 0.2);
  padding: 0.95rem 1rem;
}

.local-site-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.8rem;
}

.local-site-head h2 {
  margin: 0;
  font-size: 1rem;
  color: rgba(236, 247, 255, 0.96);
}

.local-site-head span {
  display: inline-flex;
  align-items: center;
  height: 1.25rem;
  padding: 0 0.48rem;
  border-radius: 999px;
  font-size: 0.72rem;
  color: rgba(196, 232, 255, 0.94);
  background: rgba(17, 79, 125, 0.56);
}

.local-site-main {
  margin-top: 0.72rem;
  display: grid;
  grid-template-columns: max-content minmax(0, 1fr);
  align-items: stretch;
  gap: 0.88rem;
}

.local-site-icon {
  height: 100%;
  width: auto;
  aspect-ratio: 1 / 1;
  align-self: stretch;
  border-radius: 0.72rem;
  object-fit: cover;
  border: 1px solid rgba(153, 206, 236, 0.3);
  background: rgba(255, 255, 255, 0.08);
}

.local-site-meta {
  min-width: 0;
}

.local-site-meta h3 {
  margin: 0;
  font-size: 1.03rem;
  color: rgba(235, 246, 255, 0.96);
}

.local-site-meta a {
  margin-top: 0.22rem;
  display: inline-block;
  max-width: 100%;
  color: #77ccf7;
  overflow-wrap: anywhere;
}

.local-site-meta p {
  margin: 0.42rem 0 0;
  color: var(--theme-text-soft);
  font-size: 0.9rem;
  line-height: 1.6;
}

.friend-apply-open-btn {
  min-width: 8.5rem;
  border: 1px solid rgba(120, 189, 229, 0.45);
  border-radius: 0.84rem;
  background: linear-gradient(145deg, rgba(16, 102, 148, 0.92), rgba(11, 71, 113, 0.96));
  color: rgba(239, 248, 255, 0.98);
  font-size: 0.94rem;
  font-weight: 700;
  letter-spacing: 0.01em;
  cursor: pointer;
  padding: 0 1.15rem;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.friend-apply-open-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 10px 22px rgba(7, 60, 99, 0.42);
}

.friend-apply-modal-mask {
  position: fixed;
  inset: 0;
  z-index: 120;
  display: grid;
  place-items: center;
  padding: 1rem;
  background: rgba(2, 11, 23, 0.68);
  backdrop-filter: blur(9px);
  -webkit-backdrop-filter: blur(9px);
}

.friend-apply-modal {
  width: min(95vw, 34rem);
  border-radius: 1rem;
  border: 1px solid rgba(139, 194, 226, 0.26);
  background: rgba(8, 19, 34, 0.95);
  box-shadow: 0 22px 52px rgba(0, 0, 0, 0.42);
  padding: 1rem 1rem 0.95rem;
}

.friend-apply-modal-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.75rem;
}

.friend-apply-modal-head h3 {
  margin: 0;
  font-size: 1.2rem;
  color: rgba(239, 248, 255, 0.98);
}

.friend-apply-modal-head p {
  margin: 0;
  font-size: 0.82rem;
  color: var(--theme-text-mute);
}

.friend-apply-step {
  margin-top: 0.92rem;
}

.friend-apply-step h4 {
  margin: 0;
  font-size: 0.95rem;
  color: rgba(231, 243, 255, 0.95);
}

.friend-apply-rule-list {
  margin: 0.72rem 0 0;
  padding: 0 0 0 1rem;
  color: var(--theme-text-soft);
  font-size: 0.9rem;
  line-height: 1.7;
}

.friend-apply-rule-list li + li {
  margin-top: 0.35rem;
}

.friend-apply-check {
  margin-top: 0.88rem;
  display: inline-flex;
  align-items: flex-start;
  gap: 0.56rem;
  color: rgba(226, 239, 250, 0.95);
  font-size: 0.88rem;
  cursor: pointer;
}

.friend-apply-check input {
  margin-top: 0.13rem;
  accent-color: #45b4ea;
}

.friend-apply-form {
  margin-top: 0.78rem;
  display: grid;
  gap: 0.72rem;
}

.friend-apply-field {
  display: grid;
  gap: 0.38rem;
}

.friend-apply-field span {
  color: rgba(210, 228, 242, 0.9);
  font-size: 0.84rem;
}

.friend-apply-field input,
.friend-apply-field textarea {
  width: 100%;
  border: 1px solid rgba(117, 172, 204, 0.34);
  border-radius: 0.66rem;
  background: rgba(3, 14, 26, 0.92);
  color: rgba(236, 246, 255, 0.95);
  font-size: 0.9rem;
  line-height: 1.5;
  padding: 0.56rem 0.68rem;
  outline: none;
}

.friend-apply-field textarea {
  resize: vertical;
}

.friend-apply-field input:focus,
.friend-apply-field textarea:focus {
  border-color: rgba(132, 202, 240, 0.72);
  box-shadow: 0 0 0 2px rgba(78, 167, 221, 0.18);
}

.friend-apply-feedback {
  margin: 0.1rem 0 0;
  padding: 0.55rem 0.66rem;
  border-radius: 0.6rem;
  font-size: 0.84rem;
  line-height: 1.55;
}

.friend-apply-feedback.is-success {
  color: #b8f2ce;
  background: rgba(30, 123, 79, 0.24);
  border: 1px solid rgba(110, 214, 163, 0.38);
}

.friend-apply-feedback.is-error {
  color: #ffd0d0;
  background: rgba(136, 41, 41, 0.26);
  border: 1px solid rgba(231, 132, 132, 0.34);
}

.friend-apply-modal-actions {
  margin-top: 0.9rem;
  display: flex;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: 0.55rem;
}

.friend-apply-btn {
  height: 2rem;
  padding: 0 0.85rem;
  border-radius: 0.62rem;
  border: 1px solid transparent;
  cursor: pointer;
  font-size: 0.85rem;
  font-weight: 600;
}

.friend-apply-btn-ghost {
  color: rgba(227, 241, 253, 0.9);
  background: rgba(255, 255, 255, 0.07);
  border-color: rgba(160, 204, 233, 0.24);
}

.friend-apply-btn-primary {
  color: rgba(241, 249, 255, 0.98);
  background: linear-gradient(145deg, rgba(15, 113, 168, 0.94), rgba(10, 79, 129, 0.98));
  border-color: rgba(142, 204, 240, 0.44);
}

.friend-apply-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.friend-apply-modal-enter-active,
.friend-apply-modal-leave-active {
  transition: opacity 0.2s ease;
}

.friend-apply-modal-enter-from,
.friend-apply-modal-leave-to {
  opacity: 0;
}

.friend-apply-modal-enter-active .friend-apply-modal,
.friend-apply-modal-leave-active .friend-apply-modal {
  transition: transform 0.24s cubic-bezier(0.2, 0.86, 0.24, 1);
}

.friend-apply-modal-enter-from .friend-apply-modal,
.friend-apply-modal-leave-to .friend-apply-modal {
  transform: translateY(0.5rem) scale(0.98);
}

.friends-state {
  margin: 0 0 1rem;
  color: var(--theme-text-soft);
}

.friends-state-error {
  color: #f7a8a8;
}

.friends-group {
  margin-top: 1.3rem;
}

.friends-comment-shell {
  margin-top: 1.7rem;
}

.friends-comment-head {
  margin: 0 0 0.8rem;
}

.friends-comment-head h2 {
  margin: 0;
  font-size: clamp(1.1rem, 1.7vw, 1.45rem);
  color: rgba(227, 240, 253, 0.96);
}

.friends-comment-head p {
  margin: 0.35rem 0 0;
  color: var(--theme-text-mute);
  font-size: 0.9rem;
}

.friends-group-head {
  margin-bottom: 0.78rem;
}

.friends-group-head h2 {
  margin: 0;
  font-size: clamp(1.1rem, 1.7vw, 1.45rem);
  color: rgba(227, 240, 253, 0.96);
}

.friends-group-head p {
  margin: 0.35rem 0 0;
  color: var(--theme-text-mute);
  font-size: 0.9rem;
}

.friends-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 1.02rem;
}

.friend-card {
  position: relative;
  z-index: 0;
  isolation: isolate;
  display: flex;
  align-items: center;
  min-height: 7.5rem;
  border-radius: 0.78rem;
  overflow: clip;
  padding: 0 0.95rem;
  text-decoration: none !important;
  background-image: none !important;
  background-size: 0 0 !important;
  color: #162339 !important;
  border: 1px solid rgba(147, 185, 221, 0.28);
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.16);
  transition: transform 0.28s cubic-bezier(0.2, 0.8, 0.24, 1), box-shadow 0.28s ease;
}

.friend-card-reveal {
  opacity: 0;
  transform: translateY(-0.7rem);
  animation: friend-card-drop-in 560ms cubic-bezier(0.2, 0.86, 0.24, 1) both;
  animation-delay: calc(var(--friend-order, 0) * 54ms + 80ms);
}

.friend-card::before {
  content: "";
  position: absolute;
  inset: 0;
  z-index: -2;
  background-image: var(--friend-cover);
  background-size: cover;
  background-position: center;
  opacity: 0.9;
}

.friend-card::after {
  content: "";
  position: absolute;
  inset: 0;
  z-index: -1;
  background: linear-gradient(
    to left,
    rgba(252, 254, 255, 0.08) 0%,
    rgba(252, 254, 255, 0.46) 23%,
    rgba(252, 254, 255, 0.9) 45%,
    rgba(252, 254, 255, 0.98) 68%,
    rgba(252, 254, 255, 1) 100%
  );
}

.friend-card:hover {
  transform: scale(1.05);
  box-shadow: 0 14px 24px rgba(0, 0, 0, 0.2);
  color: #0f1c31 !important;
}

.friend-card.is-disabled {
  cursor: default;
}

.friend-avatar {
  width: 4.15rem;
  height: 4.15rem;
  min-width: 4.15rem;
  border-radius: 999px;
  object-fit: cover;
  border: 2px solid rgba(255, 255, 255, 0.95);
  box-shadow: 0 3px 10px rgba(0, 0, 0, 0.18);
}

.friend-avatar-fallback {
  display: grid;
  place-items: center;
  font-size: 1.4rem;
  font-weight: 700;
  color: #ffffff;
  background: linear-gradient(140deg, #2a80b7, #1f4f86);
}

.friend-info {
  margin-left: 0.86rem;
  min-width: 0;
}

.friend-title {
  margin: 0;
  font-size: 1.08rem;
  line-height: 1.25;
  color: #152236;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.friend-description {
  margin: 0.33rem 0 0;
  font-size: 0.85rem;
  line-height: 1.45;
  color: rgba(21, 34, 54, 0.8);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.friend-meta {
  margin-top: 0.52rem;
  display: flex;
  gap: 0.4rem;
  flex-wrap: wrap;
}

.friend-tag {
  display: inline-flex;
  align-items: center;
  height: 1.26rem;
  padding: 0 0.48rem;
  border-radius: 999px;
  font-size: 0.72rem;
  color: rgba(17, 35, 56, 0.88);
  background: rgba(214, 233, 252, 0.82);
}

.friend-status {
  background: rgba(179, 214, 248, 0.82);
}

.friends-empty {
  margin: 0;
  padding: 1rem 0.9rem;
  border-radius: 0.72rem;
  border: 1px dashed rgba(125, 170, 196, 0.36);
  color: var(--theme-text-soft);
}

@keyframes friend-card-drop-in {
  from {
    opacity: 0;
    transform: translateY(-0.7rem);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (max-width: 1120px) {
  .friend-apply-entry {
    grid-template-columns: 1fr;
  }

  .friend-apply-open-btn {
    min-height: 2.6rem;
  }

  .friends-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 760px) {
  .friends-page {
    margin-top:2em;
    padding: 5.9rem 0.68rem 2.8rem;
  }

  .local-site-main {
    align-items: stretch;
  }

  .friend-apply-open-btn {
    width: 100%;
  }

  .friend-apply-modal {
    width: min(96vw, 34rem);
    padding: 0.9rem 0.85rem;
  }

  .friends-grid {
    grid-template-columns: 1fr;
  }
}

@media (prefers-reduced-motion: reduce) {
  .friend-card-reveal {
    opacity: 1;
    transform: none;
    animation: none !important;
  }

  .friend-apply-modal-enter-active .friend-apply-modal,
  .friend-apply-modal-leave-active .friend-apply-modal {
    transition: none;
  }
}
</style>
