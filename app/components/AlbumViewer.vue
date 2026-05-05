<script setup lang="ts">
type ViewerAlbum = {
  id: string;
  title: string;
  category: string;
  likes: number;
  createdAt: string;
  updatedAt: string;
};

const props = withDefaults(
  defineProps<{
    modelValue: boolean;
    album: ViewerAlbum | null;
    images: string[];
    startIndex?: number;
  }>(),
  {
    startIndex: 0,
  },
);

const emit = defineEmits<{
  "update:modelValue": [value: boolean];
}>();

const stageRef = ref<HTMLElement | null>(null);
const currentIndex = ref(0);
const zoomFactor = ref(1);
const fitScale = ref(1);
const translateX = ref(0);
const translateY = ref(0);
const isDragging = ref(false);
const activePointerId = ref<number | null>(null);
const dragStartX = ref(0);
const dragStartY = ref(0);
const dragOriginX = ref(0);
const dragOriginY = ref(0);
const imageNaturalWidth = ref(0);
const imageNaturalHeight = ref(0);
const MIN_ZOOM_FACTOR = 1;
const MAX_ZOOM_FACTOR = 4;
const ZOOM_STEP_RATIO = 1.2;
const SCALE_EPSILON = 0.0001;
const DISPLAY_TIME_ZONE = "Asia/Shanghai";
const { lockScroll, unlockScroll } = useScrollLock();
const isViewerLocked = ref(false);
let stageResizeObserver: ResizeObserver | null = null;

const currentImage = computed(() => props.images[currentIndex.value] || "");
const currentScale = computed(() => fitScale.value * zoomFactor.value);
const canPan = computed(() => currentScale.value - fitScale.value > SCALE_EPSILON);
const canZoomIn = computed(() => zoomFactor.value < MAX_ZOOM_FACTOR - SCALE_EPSILON);
const canZoomOut = computed(() => zoomFactor.value > MIN_ZOOM_FACTOR + SCALE_EPSILON);
const zoomPercent = computed(() => `${Math.round(zoomFactor.value * 100)}%`);
const readableUpdatedTime = computed(() => formatDateTime(props.album?.updatedAt || ""));
const readableCreatedTime = computed(() => formatDateTime(props.album?.createdAt || ""));
const imageFileName = computed(() => {
  const image = currentImage.value;
  if (!image) return "-";
  const last = image.split("/").pop() || image;
  try {
    return decodeURIComponent(last);
  } catch {
    return last;
  }
});

watch(
  () => props.modelValue,
  (open) => {
    if (open) {
      currentIndex.value = clampIndex(props.startIndex);
      resetTransform();
      clearImageMetrics();
      lockBodyScroll();
      nextTick(() => {
        updateFitScale(true);
      });
      return;
    }

    unlockBodyScroll();
    releaseDragging();
  },
  { immediate: true },
);

watch(
  () => props.startIndex,
  (nextIndex) => {
    if (!props.modelValue) return;
    currentIndex.value = clampIndex(nextIndex);
    resetTransform();
    clearImageMetrics();
  },
);

watch(
  () => props.images,
  () => {
    currentIndex.value = clampIndex(currentIndex.value);
    resetTransform();
    clearImageMetrics();
  },
);

watch(currentIndex, () => {
  resetTransform();
  clearImageMetrics();
});

onMounted(() => {
  window.addEventListener("keydown", handleKeyDown);

  if ("ResizeObserver" in window) {
    stageResizeObserver = new ResizeObserver(() => {
      updateFitScale();
    });
    if (stageRef.value) {
      stageResizeObserver.observe(stageRef.value);
    }
  }
});

onBeforeUnmount(() => {
  window.removeEventListener("keydown", handleKeyDown);
  unlockBodyScroll();
  stageResizeObserver?.disconnect();
  stageResizeObserver = null;
});

watch(
  stageRef,
  (next, prev) => {
    if (!stageResizeObserver) return;
    if (prev) stageResizeObserver.unobserve(prev);
    if (next) {
      stageResizeObserver.observe(next);
      updateFitScale();
    }
  },
  { flush: "post" },
);

function clampIndex(value: number) {
  if (!props.images.length) return 0;
  if (value < 0) return 0;
  if (value > props.images.length - 1) return props.images.length - 1;
  return value;
}

function clearImageMetrics() {
  imageNaturalWidth.value = 0;
  imageNaturalHeight.value = 0;
  fitScale.value = 1;
}

function closeViewer() {
  emit("update:modelValue", false);
}

function nextImage() {
  if (!props.images.length) return;
  currentIndex.value = (currentIndex.value + 1) % props.images.length;
}

function prevImage() {
  if (!props.images.length) return;
  currentIndex.value = (currentIndex.value - 1 + props.images.length) % props.images.length;
}

function resetTransform() {
  zoomFactor.value = MIN_ZOOM_FACTOR;
  translateX.value = 0;
  translateY.value = 0;
}

function clampTranslate() {
  if (!stageRef.value || !imageNaturalWidth.value || !imageNaturalHeight.value) {
    translateX.value = 0;
    translateY.value = 0;
    return;
  }

  const rect = stageRef.value.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return;

  const renderedWidth = imageNaturalWidth.value * currentScale.value;
  const renderedHeight = imageNaturalHeight.value * currentScale.value;

  const maxOffsetX = Math.max(0, (renderedWidth - rect.width) / 2);
  const maxOffsetY = Math.max(0, (renderedHeight - rect.height) / 2);

  if (maxOffsetX <= SCALE_EPSILON) {
    translateX.value = 0;
  } else {
    translateX.value = clamp(translateX.value, -maxOffsetX, maxOffsetX);
  }

  if (maxOffsetY <= SCALE_EPSILON) {
    translateY.value = 0;
  } else {
    translateY.value = clamp(translateY.value, -maxOffsetY, maxOffsetY);
  }
}

function handleKeyDown(event: KeyboardEvent) {
  if (!props.modelValue) return;

  if (event.key === "Escape") {
    event.preventDefault();
    closeViewer();
    return;
  }

  if (event.key === "ArrowRight") {
    event.preventDefault();
    nextImage();
    return;
  }

  if (event.key === "ArrowLeft") {
    event.preventDefault();
    prevImage();
    return;
  }

  if (event.key === "+" || event.key === "=") {
    event.preventDefault();
    zoomIn();
    return;
  }

  if (event.key === "-" || event.key === "_") {
    event.preventDefault();
    zoomOut();
    return;
  }

  if (event.key === "0") {
    event.preventDefault();
    resetTransform();
  }
}

function onWheel(event: WheelEvent) {
  if (!props.modelValue) return;
  if (!stageRef.value) return;
  if (!currentImage.value) return;
  if (!imageNaturalWidth.value || !imageNaturalHeight.value) return;

  const previousScale = currentScale.value;
  const previousZoom = zoomFactor.value;
  const delta = -event.deltaY * 0.0012;
  const nextZoom = clamp(previousZoom * (1 + delta), MIN_ZOOM_FACTOR, MAX_ZOOM_FACTOR);
  if (Math.abs(nextZoom - previousZoom) <= SCALE_EPSILON) return;

  const nextScale = fitScale.value * nextZoom;

  const rect = stageRef.value.getBoundingClientRect();
  const cursorX = event.clientX - rect.left - rect.width / 2;
  const cursorY = event.clientY - rect.top - rect.height / 2;
  const ratio = nextScale / previousScale;

  translateX.value = cursorX - ratio * (cursorX - translateX.value);
  translateY.value = cursorY - ratio * (cursorY - translateY.value);
  zoomFactor.value = nextZoom;
  clampTranslate();
}

function setZoomFactor(nextZoom: number) {
  if (!imageNaturalWidth.value || !imageNaturalHeight.value) return;
  const clampedZoom = clamp(nextZoom, MIN_ZOOM_FACTOR, MAX_ZOOM_FACTOR);
  if (Math.abs(clampedZoom - zoomFactor.value) <= SCALE_EPSILON) return;

  zoomFactor.value = clampedZoom;
  if (clampedZoom <= MIN_ZOOM_FACTOR + SCALE_EPSILON) {
    translateX.value = 0;
    translateY.value = 0;
    return;
  }
  clampTranslate();
}

function zoomIn() {
  setZoomFactor(zoomFactor.value * ZOOM_STEP_RATIO);
}

function zoomOut() {
  setZoomFactor(zoomFactor.value / ZOOM_STEP_RATIO);
}

function onPointerDown(event: PointerEvent) {
  if (!props.modelValue) return;
  if (!stageRef.value) return;
  if (!currentImage.value) return;
  if (!canPan.value) return;

  isDragging.value = true;
  activePointerId.value = event.pointerId;
  dragStartX.value = event.clientX;
  dragStartY.value = event.clientY;
  dragOriginX.value = translateX.value;
  dragOriginY.value = translateY.value;
  stageRef.value.setPointerCapture(event.pointerId);
}

function onPointerMove(event: PointerEvent) {
  if (!isDragging.value) return;
  if (activePointerId.value !== event.pointerId) return;

  const distanceX = event.clientX - dragStartX.value;
  const distanceY = event.clientY - dragStartY.value;
  translateX.value = dragOriginX.value + distanceX;
  translateY.value = dragOriginY.value + distanceY;
  clampTranslate();
}

function onPointerUp(event: PointerEvent) {
  if (activePointerId.value !== event.pointerId) return;
  releaseDragging();
}

function releaseDragging() {
  if (stageRef.value && activePointerId.value !== null && stageRef.value.hasPointerCapture(activePointerId.value)) {
    stageRef.value.releasePointerCapture(activePointerId.value);
  }
  isDragging.value = false;
  activePointerId.value = null;
}

function updateFitScale(forceReset = false) {
  if (!stageRef.value) return;
  if (!imageNaturalWidth.value || !imageNaturalHeight.value) return;

  const rect = stageRef.value.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return;

  const nextFitScale = Math.min(
    rect.width / imageNaturalWidth.value,
    rect.height / imageNaturalHeight.value,
  );
  if (!Number.isFinite(nextFitScale) || nextFitScale <= 0) return;

  fitScale.value = nextFitScale;

  if (forceReset || zoomFactor.value <= MIN_ZOOM_FACTOR + SCALE_EPSILON) {
    resetTransform();
    return;
  }

  clampTranslate();
}

function onImageLoad(event: Event) {
  const element = event.target as HTMLImageElement | null;
  if (!element) return;

  imageNaturalWidth.value = element.naturalWidth || 0;
  imageNaturalHeight.value = element.naturalHeight || 0;
  nextTick(() => {
    updateFitScale(true);
  });
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function formatDateTime(input: string) {
  if (!input) return "-";
  const date = new Date(input);
  if (Number.isNaN(date.getTime())) return input;
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    timeZone: DISPLAY_TIME_ZONE,
  }).format(date);
}

function lockBodyScroll() {
  if (isViewerLocked.value) return;
  lockScroll();
  isViewerLocked.value = true;
}

function unlockBodyScroll() {
  if (!isViewerLocked.value) return;
  unlockScroll();
  isViewerLocked.value = false;
}
</script>

<template>
  <Teleport to="body">
    <Transition name="viewer-fade">
      <div v-if="modelValue" class="viewer-overlay" @click.self="closeViewer">
        <button class="viewer-close" type="button" aria-label="关闭相册" @click="closeViewer">
          ×
        </button>

        <div class="viewer-layout">
          <section class="viewer-stage-wrap">
            <div
              ref="stageRef"
              class="viewer-stage"
              :class="{ dragging: isDragging, pannable: canPan }"
              @wheel.prevent="onWheel"
              @pointerdown="onPointerDown"
              @pointermove="onPointerMove"
              @pointerup="onPointerUp"
              @pointercancel="onPointerUp"
              @dblclick="resetTransform"
            >
              <img
                v-if="currentImage"
                :src="currentImage"
                :alt="album?.title || '相册图片'"
                draggable="false"
                @load="onImageLoad"
                :style="{
                  transform: `translate(-50%, -50%) translate(${translateX}px, ${translateY}px) scale(${currentScale})`,
                }"
              />

              <div v-else class="viewer-empty">暂无图片</div>
            </div>
          </section>

          <aside class="viewer-panel">
            <h3>{{ album?.title || "相册" }}</h3>
            <p class="panel-time">{{ readableUpdatedTime }}</p>

            <div class="panel-lines">
              <p>分类：{{ album?.category || "-" }}</p>
              <p>喜欢：{{ album?.likes ?? 0 }}</p>
              <p>创建时间：{{ readableCreatedTime }}</p>
              <p>更新时间：{{ readableUpdatedTime }}</p>
              <p>序号：{{ currentIndex + 1 }} / {{ images.length }}</p>
              <p>文件：{{ imageFileName }}</p>
            </div>

            <div class="viewer-zoom-controls">
              <button
                type="button"
                class="panel-chip panel-chip-btn"
                :disabled="!canZoomOut"
                aria-label="缩小图片"
                @click="zoomOut"
              >
                缩小
              </button>
              <span class="panel-chip panel-chip-value">{{ zoomPercent }}</span>
              <button
                type="button"
                class="panel-chip panel-chip-btn"
                :disabled="!canZoomIn"
                aria-label="放大图片"
                @click="zoomIn"
              >
                放大
              </button>
              <button
                type="button"
                class="panel-chip panel-chip-btn"
                :disabled="!canZoomIn && !canZoomOut"
                aria-label="重置缩放与位置"
                @click="resetTransform"
              >
                复位
              </button>
            </div>

            <div class="panel-cards">
              <div class="panel-chip">滚轮缩放</div>
              <div class="panel-chip">拖拽平移</div>
              <div class="panel-chip">双击复位</div>
              <div class="panel-chip">+ / - 缩放</div>
            </div>

            <p class="panel-note">转载请注释出处</p>
          </aside>
        </div>

        <footer class="viewer-strip">
          <button class="strip-nav" type="button" aria-label="上一张" @click="prevImage">
            ‹
          </button>

          <div class="strip-track">
            <button
              v-for="(image, index) in images"
              :key="`${image}-${index}`"
              class="strip-item"
              :class="{ active: index === currentIndex }"
              type="button"
              @click="currentIndex = index"
            >
              <img :src="image" :alt="`缩略图 ${index + 1}`" draggable="false" />
            </button>
          </div>

          <button class="strip-nav" type="button" aria-label="下一张" @click="nextImage">
            ›
          </button>
        </footer>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.viewer-overlay {
  position: fixed;
  inset: 0;
  z-index: 90;
  background: rgba(2, 13, 22, 0.9);
  backdrop-filter: blur(8px);
  display: grid;
  grid-template-rows: 1fr auto;
}

.viewer-close {
  position: absolute;
  left: 0.9rem;
  top: 0.9rem;
  z-index: 20;
  width: 2rem;
  height: 2rem;
  border-radius: 0.5rem;
  border: 1px solid rgba(149, 196, 219, 0.25);
  background: rgba(1, 10, 18, 0.75);
  color: rgba(239, 246, 255, 0.9);
  font-size: 1.3rem;
  line-height: 1;
  cursor: pointer;
}

.viewer-layout {
  height: 100%;
  min-height: 0;
  padding: 1rem 1rem 0.4rem;
  display: grid;
  grid-template-columns: minmax(0, 1fr) 14rem;
  gap: 1rem;
}

.viewer-stage-wrap {
  min-width: 0;
  min-height: 0;
  display: grid;
}

.viewer-stage {
  position: relative;
  min-height: 0;
  height: 100%;
  border-radius: 0.65rem;
  overflow: hidden;
  background: rgba(2, 36, 43, 0.7);
  display: grid;
  place-items: center;
  touch-action: none;
  cursor: grab;
}

.viewer-stage.dragging {
  cursor: grabbing;
}

.viewer-stage img {
  position: absolute;
  left: 50%;
  top: 50%;
  max-width: none;
  max-height: none;
  width: auto;
  height: auto;
  display: block;
  object-fit: contain;
  transform-origin: center center;
  will-change: transform;
  user-select: none;
  pointer-events: none;
  transition: transform 0.04s linear;
}

.viewer-empty {
  color: rgba(205, 226, 238, 0.7);
  font-size: 0.95rem;
}

.viewer-panel {
  border-radius: 0.62rem;
  border: 1px solid rgba(137, 186, 206, 0.2);
  background: rgba(34, 34, 36, 0.88);
  padding: 0.95rem 0.8rem;
  color: rgba(233, 243, 255, 0.9);
  overflow-y: auto;
}

.viewer-panel h3 {
  margin: 0;
  font-size: 1.25rem;
}

.panel-time {
  margin: 0.5rem 0 0;
  color: rgba(184, 204, 223, 0.72);
  font-size: 0.85rem;
}

.panel-lines {
  margin-top: 0.9rem;
  display: flex;
  flex-direction: column;
  gap: 0.34rem;
  font-size: 0.84rem;
}

.panel-lines p {
  margin: 0;
}

.viewer-zoom-controls {
  margin-top: 0.85rem;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0.38rem;
}

.panel-cards {
  margin-top: 1rem;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.4rem;
}

.panel-chip {
  border-radius: 0.4rem;
  border: 1px solid rgba(122, 170, 193, 0.25);
  background: rgba(255, 255, 255, 0.06);
  padding: 0.34rem 0.42rem;
  font-size: 0.78rem;
  color: rgba(214, 232, 244, 0.86);
}

.panel-chip-btn {
  cursor: pointer;
  transition: border-color 0.2s ease, background-color 0.2s ease;
}

.panel-chip-btn:hover:not(:disabled) {
  border-color: rgba(167, 218, 242, 0.45);
  background: rgba(255, 255, 255, 0.14);
}

.panel-chip-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.panel-chip-value {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
}

.panel-note {
  margin: 1rem 0 0;
  color: rgba(181, 201, 218, 0.7);
  font-size: 0.75rem;
  line-height: 1.6;
}

.viewer-strip {
  height: 4.9rem;
  padding: 0.45rem 0.8rem;
  display: grid;
  grid-template-columns: 2rem minmax(0, 1fr) 2rem;
  align-items: center;
  gap: 0.45rem;
  background: rgba(6, 55, 58, 0.62);
  border-top: 1px solid rgba(119, 173, 193, 0.2);
}

.strip-nav {
  width: 2rem;
  height: 2.8rem;
  border-radius: 0.45rem;
  border: 1px solid rgba(139, 188, 209, 0.3);
  background: rgba(7, 24, 36, 0.58);
  color: rgba(230, 243, 255, 0.95);
  font-size: 1.5rem;
  cursor: pointer;
}

.strip-track {
  min-width: 0;
  display: flex;
  gap: 0.36rem;
  overflow-x: auto;
  padding-bottom: 0.14rem;
  scrollbar-width: thin;
  scrollbar-color: rgba(42, 212, 225, 0.82) rgba(4, 24, 40, 0.72);
}

.strip-track::-webkit-scrollbar {
  height: 0.5rem;
}

.strip-track::-webkit-scrollbar-track {
  border-radius: 999px;
  background: linear-gradient(
    90deg,
    rgba(4, 24, 40, 0.82) 0%,
    rgba(8, 38, 61, 0.78) 100%
  );
  border: 1px solid rgba(81, 145, 176, 0.25);
}

.strip-track::-webkit-scrollbar-thumb {
  border-radius: 999px;
  background: linear-gradient(
    90deg,
    rgba(15, 156, 184, 0.92) 0%,
    rgba(69, 223, 236, 0.92) 100%
  );
  border: 1px solid rgba(204, 244, 255, 0.35);
  box-shadow: 0 0 8px rgba(42, 212, 225, 0.34);
}

.strip-track::-webkit-scrollbar-thumb:hover {
  background: linear-gradient(
    90deg,
    rgba(14, 170, 203, 0.96) 0%,
    rgba(114, 243, 250, 0.96) 100%
  );
}

.strip-item {
  flex: 0 0 auto;
  width: 3rem;
  height: 3rem;
  border-radius: 0.4rem;
  padding: 0;
  border: 1px solid transparent;
  overflow: hidden;
  cursor: pointer;
  background: rgba(2, 8, 14, 0.48);
}

.strip-item img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.strip-item.active {
  border-color: rgba(112, 220, 233, 0.95);
  box-shadow: 0 0 0 1px rgba(112, 220, 233, 0.35);
}

.viewer-fade-enter-active,
.viewer-fade-leave-active {
  transition: opacity 0.22s ease;
}

.viewer-fade-enter-from,
.viewer-fade-leave-to {
  opacity: 0;
}

@media (max-width: 980px) {
  .viewer-layout {
    grid-template-columns: 1fr;
    grid-template-rows: minmax(0, 1fr) auto;
  }

  .viewer-panel {
    max-height: 12rem;
  }

  .viewer-strip {
    height: 4.5rem;
  }

  .strip-item {
    width: 2.7rem;
    height: 2.7rem;
  }
}
</style>
