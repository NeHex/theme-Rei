<script setup lang="ts">
type DragState = {
  pieceId: number;
  pointerId: number;
  x: number;
  y: number;
};

const props = withDefaults(
  defineProps<{
    modelValue: boolean;
    title?: string;
    description?: string;
  }>(),
  {
    title: "安全验证",
    description: "请将右侧缺失图片拖入中间空位，顺序正确后自动验证。",
  },
);

const emit = defineEmits<{
  "update:modelValue": [value: boolean];
  verified: [];
}>();

const TOTAL_PIECES = 9;
const MISSING_PIECES = 3;
const allPieceIds = Array.from({ length: TOTAL_PIECES }, (_, index) => index + 1);

const missingSlotIndexes = ref<number[]>([]);
const slotPieces = ref<Array<number | null>>([]);
const cardOrder = ref<number[]>([]);
const dragState = ref<DragState | null>(null);
const solved = ref(false);
const feedbackType = ref<"" | "success" | "error">("");
const feedbackText = ref("");
let solvedCloseTimer: ReturnType<typeof setTimeout> | null = null;
let dragCaptureEl: HTMLElement | null = null;

const missingSlotSet = computed(() => new Set(missingSlotIndexes.value));
const dragGhostStyle = computed(() => {
  if (!dragState.value) return {};
  return {
    left: `${dragState.value.x}px`,
    top: `${dragState.value.y}px`,
  };
});

function pieceSrc(pieceId: number) {
  return `/verificode/${pieceId}.png`;
}

function shuffle<T>(list: T[]) {
  const result = [...list];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [result[index], result[randomIndex]] = [result[randomIndex], result[index]];
  }
  return result;
}

function pickMissingSlots() {
  return shuffle(Array.from({ length: TOTAL_PIECES }, (_, index) => index))
    .slice(0, MISSING_PIECES)
    .sort((a, b) => a - b);
}

function clearFeedback() {
  feedbackType.value = "";
  feedbackText.value = "";
}

function clearSolvedTimer() {
  if (solvedCloseTimer === null || !import.meta.client) return;
  window.clearTimeout(solvedCloseTimer);
  solvedCloseTimer = null;
}

function isMissingSlot(slotIndex: number) {
  return missingSlotSet.value.has(slotIndex);
}

function getSlotPiece(slotIndex: number) {
  return slotPieces.value[slotIndex] ?? null;
}

function isPiecePlaced(pieceId: number) {
  return slotPieces.value.includes(pieceId);
}

function setupChallenge() {
  clearSolvedTimer();
  solved.value = false;
  clearFeedback();

  const missing = pickMissingSlots();
  missingSlotIndexes.value = missing;
  slotPieces.value = allPieceIds.map((pieceId, slotIndex) => (missing.includes(slotIndex) ? null : pieceId));
  cardOrder.value = shuffle(missing.map((slotIndex) => slotIndex + 1));
}

function closeModal() {
  emit("update:modelValue", false);
}

function cleanupDrag() {
  if (dragCaptureEl && dragState.value) {
    try {
      if (dragCaptureEl.hasPointerCapture?.(dragState.value.pointerId)) {
        dragCaptureEl.releasePointerCapture(dragState.value.pointerId);
      }
    } catch {
      // no-op
    }
  }
  dragCaptureEl = null;
  dragState.value = null;
  if (!import.meta.client) return;
  window.removeEventListener("pointermove", handlePointerMove);
  window.removeEventListener("pointerup", handlePointerUp);
  window.removeEventListener("pointercancel", handlePointerCancel);
}

function evaluateSolved() {
  if (!missingSlotIndexes.value.length) return;
  const allPlaced = missingSlotIndexes.value.every((slotIndex) => Number.isFinite(slotPieces.value[slotIndex] || NaN));
  if (!allPlaced) {
    clearFeedback();
    return;
  }

  const allCorrect = missingSlotIndexes.value.every((slotIndex) => slotPieces.value[slotIndex] === slotIndex + 1);
  if (!allCorrect) {
    feedbackType.value = "error";
    feedbackText.value = "顺序不正确，请调整后再试。";
    return;
  }

  solved.value = true;
  feedbackType.value = "success";
  feedbackText.value = "验证通过，正在提交…";
  clearSolvedTimer();
  if (!import.meta.client) return;
  solvedCloseTimer = window.setTimeout(() => {
    solvedCloseTimer = null;
    emit("verified");
    closeModal();
  }, 420);
}

function placePiece(slotIndex: number, pieceId: number) {
  if (solved.value) return;
  if (!isMissingSlot(slotIndex)) return;
  if (getSlotPiece(slotIndex) !== null) return;
  if (isPiecePlaced(pieceId)) return;

  const next = [...slotPieces.value];
  next[slotIndex] = pieceId;
  slotPieces.value = next;
  clearFeedback();
  evaluateSolved();
}

function removePiece(slotIndex: number) {
  if (solved.value) return;
  if (!isMissingSlot(slotIndex)) return;
  if (getSlotPiece(slotIndex) === null) return;
  const next = [...slotPieces.value];
  next[slotIndex] = null;
  slotPieces.value = next;
  clearFeedback();
}

function handleSlotClick(slotIndex: number) {
  removePiece(slotIndex);
}

function resolveDropSlotIndex(clientX: number, clientY: number) {
  if (!import.meta.client) return -1;
  const target = document.elementFromPoint(clientX, clientY);
  if (!(target instanceof HTMLElement)) return -1;
  const slotElement = target.closest<HTMLElement>("[data-drop-slot='1']");
  if (!slotElement) return -1;
  const rawIndex = slotElement.dataset.slotIndex;
  const parsed = Number(rawIndex);
  if (!Number.isFinite(parsed)) return -1;
  return parsed;
}

function beginDrag(pieceId: number, event: PointerEvent) {
  if (solved.value) return;
  if (!import.meta.client) return;
  if (isPiecePlaced(pieceId)) return;
  if (dragState.value) return;

  const target = event.currentTarget;
  if (target instanceof HTMLElement) {
    dragCaptureEl = target;
    try {
      target.setPointerCapture(event.pointerId);
    } catch {
      // no-op
    }
  }

  dragState.value = {
    pieceId,
    pointerId: event.pointerId,
    x: event.clientX,
    y: event.clientY,
  };

  window.addEventListener("pointermove", handlePointerMove, { passive: true });
  window.addEventListener("pointerup", handlePointerUp, { passive: true });
  window.addEventListener("pointercancel", handlePointerCancel, { passive: true });
}

function handlePointerMove(event: PointerEvent) {
  const state = dragState.value;
  if (!state || state.pointerId !== event.pointerId) return;
  dragState.value = {
    ...state,
    x: event.clientX,
    y: event.clientY,
  };
}

function handlePointerUp(event: PointerEvent) {
  const state = dragState.value;
  if (!state || state.pointerId !== event.pointerId) return;
  const slotIndex = resolveDropSlotIndex(event.clientX, event.clientY);
  if (slotIndex >= 0) {
    placePiece(slotIndex, state.pieceId);
  }
  cleanupDrag();
}

function handlePointerCancel(event: PointerEvent) {
  const state = dragState.value;
  if (!state || state.pointerId !== event.pointerId) return;
  cleanupDrag();
}

function handleEscape(event: KeyboardEvent) {
  if (event.key !== "Escape" || !props.modelValue) return;
  closeModal();
}

function refreshChallenge() {
  setupChallenge();
}

watch(
  () => props.modelValue,
  (open) => {
    cleanupDrag();
    clearSolvedTimer();
    if (open) {
      setupChallenge();
      if (import.meta.client) {
        window.addEventListener("keydown", handleEscape);
      }
      return;
    }

    if (import.meta.client) {
      window.removeEventListener("keydown", handleEscape);
    }
  },
  { immediate: true },
);

onBeforeUnmount(() => {
  cleanupDrag();
  clearSolvedTimer();
  if (import.meta.client) {
    window.removeEventListener("keydown", handleEscape);
  }
});
</script>

<template>
  <Teleport to="body">
    <Transition name="captcha-modal">
      <div v-if="modelValue" class="captcha-mask" role="dialog" aria-modal="true" :aria-label="title" @click.self="closeModal">
        <section class="captcha-modal">
          <header class="captcha-head">
            <div>
              <h3>{{ title }}</h3>
              <p>{{ description }}</p>
            </div>
            <button type="button" class="captcha-close" @click="closeModal">关闭</button>
          </header>

          <div class="captcha-layout">
            <article class="captcha-panel">
              <h4>拼图区</h4>
              <div class="captcha-grid">
                <button
                  v-for="slotIndex in TOTAL_PIECES"
                  :key="`slot-${slotIndex}`"
                  type="button"
                  class="captcha-slot"
                  :class="{
                    'is-missing': isMissingSlot(slotIndex - 1),
                    'is-filled': Boolean(getSlotPiece(slotIndex - 1)),
                    'is-fixed': !isMissingSlot(slotIndex - 1),
                  }"
                  :data-drop-slot="isMissingSlot(slotIndex - 1) ? '1' : undefined"
                  :data-slot-index="isMissingSlot(slotIndex - 1) ? String(slotIndex - 1) : undefined"
                  :title="isMissingSlot(slotIndex - 1) ? '点击可撤回该图块' : undefined"
                  @click="handleSlotClick(slotIndex - 1)"
                >
                  <img
                    v-if="getSlotPiece(slotIndex - 1)"
                    :src="pieceSrc(getSlotPiece(slotIndex - 1)!)"
                    :alt="`验证码图块 ${getSlotPiece(slotIndex - 1)}`"
                    draggable="false"
                    @dragstart.prevent
                  >
                  <span v-else class="captcha-slot-placeholder">缺失</span>
                </button>
              </div>
            </article>

            <article class="captcha-panel">
              <h4>拖动图块</h4>
              <div class="captcha-card-list">
                <button
                  v-for="pieceId in cardOrder"
                  :key="`card-${pieceId}`"
                  type="button"
                  class="captcha-card"
                  :class="{ 'is-used': isPiecePlaced(pieceId) }"
                  :disabled="isPiecePlaced(pieceId) || solved"
                  @pointerdown.prevent="beginDrag(pieceId, $event)"
                  @dragstart.prevent
                >
                  <img
                    :src="pieceSrc(pieceId)"
                    :alt="`可拖动图块 ${pieceId}`"
                    draggable="false"
                    @dragstart.prevent
                  >
                  <span>{{ isPiecePlaced(pieceId) ? "已放置" : "拖动到中间" }}</span>
                </button>
              </div>
            </article>
          </div>

          <p class="captcha-feedback" :class="feedbackType ? `is-${feedbackType}` : ''">
            {{ feedbackText || "将右侧图块拖入中间缺失位置，全部正确后自动验证。" }}
          </p>

          <footer class="captcha-foot">
            <button type="button" class="captcha-refresh" :disabled="solved" @click="refreshChallenge">换一组</button>
          </footer>

          <div v-if="dragState" class="captcha-drag-ghost" :style="dragGhostStyle" aria-hidden="true">
            <img :src="pieceSrc(dragState.pieceId)" :alt="`拖拽图块 ${dragState.pieceId}`" draggable="false">
          </div>
        </section>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.captcha-mask {
  position: fixed;
  inset: 0;
  z-index: 2147483000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  background: rgba(2, 11, 23, 0.72);
  backdrop-filter: blur(12px) saturate(1.08);
  -webkit-backdrop-filter: blur(12px) saturate(1.08);
}

.captcha-modal {
  position: relative;
  width: min(96vw, 68rem);
  border-radius: 1rem;
  border: 1px solid rgba(138, 194, 226, 0.3);
  background: rgba(8, 20, 36, 0.96);
  box-shadow: 0 22px 52px rgba(0, 0, 0, 0.44);
  padding: 0.95rem;
}

.captcha-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.8rem;
}

.captcha-head h3 {
  margin: 0;
  color: rgba(240, 248, 255, 0.98);
  font-size: 1.1rem;
}

.captcha-head p {
  margin: 0.42rem 0 0;
  color: rgba(178, 206, 227, 0.9);
  font-size: 0.84rem;
  line-height: 1.55;
}

.captcha-close {
  border: 1px solid rgba(151, 203, 230, 0.32);
  border-radius: 0.62rem;
  background: rgba(255, 255, 255, 0.08);
  color: rgba(231, 243, 252, 0.94);
  min-height: 1.95rem;
  padding: 0 0.72rem;
  cursor: pointer;
}

.captcha-layout {
  margin-top: 0.92rem;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.62rem;
}

.captcha-panel {
  border-radius: 0.82rem;
  border: 1px solid rgba(120, 182, 213, 0.22);
  background: rgba(7, 17, 31, 0.78);
  padding: 0.62rem;
}

.captcha-panel h4 {
  margin: 0;
  color: rgba(219, 236, 250, 0.95);
  font-size: 0.88rem;
}

.captcha-grid {
  margin-top: 0.52rem;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.16rem;
}

.captcha-slot {
  position: relative;
  border: 1px solid rgba(136, 196, 227, 0.22);
  border-radius: 0.44rem;
  overflow: hidden;
  width: 100%;
  aspect-ratio: 1 / 1;
  background: rgba(7, 19, 34, 0.88);
  display: grid;
  place-items: center;
  padding: 0;
}

.captcha-slot.is-missing {
  border-style: dashed;
  border-color: rgba(135, 207, 240, 0.58);
  background: rgba(22, 58, 86, 0.32);
  cursor: pointer;
}

.captcha-slot.is-missing.is-filled {
  border-style: solid;
  border-color: rgba(124, 224, 248, 0.74);
}

.captcha-slot.is-fixed {
  cursor: default;
}

.captcha-slot img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  user-select: none;
  -webkit-user-drag: none;
}

.captcha-slot-placeholder {
  color: rgba(181, 216, 240, 0.86);
  font-size: 0.74rem;
}

.captcha-card-list {
  margin-top: 0.52rem;
  display: grid;
  gap: 0.36rem;
}

.captcha-card {
  width: 100%;
  display: grid;
  grid-template-columns: 3.2rem minmax(0, 1fr);
  align-items: center;
  gap: 0.58rem;
  border: 1px solid rgba(135, 197, 228, 0.34);
  border-radius: 0.56rem;
  background: rgba(12, 31, 50, 0.82);
  color: rgba(226, 241, 252, 0.94);
  min-height: 3.4rem;
  padding: 0.34rem 0.44rem;
  cursor: grab;
  touch-action: none;
  user-select: none;
  -webkit-touch-callout: none;
}

.captcha-card:disabled {
  cursor: not-allowed;
}

.captcha-card.is-used {
  opacity: 0.42;
}

.captcha-card img {
  width: 100%;
  aspect-ratio: 1 / 1;
  border-radius: 0.38rem;
  object-fit: cover;
  display: block;
  pointer-events: none;
  user-select: none;
  -webkit-user-drag: none;
}

.captcha-card span {
  text-align: left;
  font-size: 0.8rem;
  line-height: 1.45;
}

.captcha-feedback {
  margin: 0.75rem 0 0;
  border-radius: 0.66rem;
  border: 1px solid rgba(125, 185, 217, 0.26);
  background: rgba(7, 20, 35, 0.75);
  color: rgba(176, 207, 229, 0.92);
  font-size: 0.82rem;
  line-height: 1.6;
  padding: 0.5rem 0.62rem;
}

.captcha-feedback.is-success {
  border-color: rgba(125, 217, 174, 0.46);
  background: rgba(22, 93, 63, 0.22);
  color: #c9f7de;
}

.captcha-feedback.is-error {
  border-color: rgba(240, 158, 158, 0.46);
  background: rgba(110, 27, 27, 0.24);
  color: #ffd2d2;
}

.captcha-foot {
  margin-top: 0.7rem;
  display: flex;
  justify-content: flex-end;
}

.captcha-refresh {
  border: 1px solid rgba(150, 203, 229, 0.36);
  border-radius: 0.58rem;
  background: rgba(255, 255, 255, 0.08);
  color: rgba(228, 242, 252, 0.95);
  min-height: 1.9rem;
  padding: 0 0.72rem;
  cursor: pointer;
}

.captcha-refresh:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.captcha-drag-ghost {
  position: fixed;
  z-index: 2147483002;
  width: 3.6rem;
  height: 3.6rem;
  border-radius: 0.46rem;
  border: 1px solid rgba(131, 214, 239, 0.74);
  box-shadow: 0 14px 24px rgba(0, 0, 0, 0.36);
  pointer-events: none;
  overflow: hidden;
  transform: translate(-50%, -50%);
}

.captcha-drag-ghost img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.captcha-modal-enter-active,
.captcha-modal-leave-active {
  transition: opacity 0.2s ease;
}

.captcha-modal-enter-from,
.captcha-modal-leave-to {
  opacity: 0;
}

.captcha-modal-enter-active .captcha-modal,
.captcha-modal-leave-active .captcha-modal {
  transition: transform 0.22s cubic-bezier(0.2, 0.86, 0.24, 1);
}

.captcha-modal-enter-from .captcha-modal,
.captcha-modal-leave-to .captcha-modal {
  transform: translateY(0.5rem) scale(0.985);
}

@media (max-width: 980px) {
  .captcha-layout {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 760px) {
  .captcha-modal {
    width: 100%;
    max-height: min(94svh, 42rem);
    overflow-y: auto;
    padding: 0.78rem;
  }

  .captcha-card {
    grid-template-columns: 3rem minmax(0, 1fr);
    min-height: 3.2rem;
  }
}
</style>
