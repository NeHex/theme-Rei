<script setup lang="ts">
const { settings } = useSiteSettings();

useHead(() => ({
  title: `爱妻墙 - ${settings.value.siteTitle}`,
}));

type WifeCard = {
  id: string;
  cnName: string;
  otherName: string;
  image: string;
};

const DEFAULT_WIFE: WifeCard = {
  id: "wife-default",
  cnName: "暂无",
  otherName: "None",
  image: "/images/loading.gif",
};

const wifeCards = computed(() => {
  const source = settings.value.themeWifes.length
    ? settings.value.themeWifes
    : [DEFAULT_WIFE];

  return Array.from({ length: 8 }, (_, index) => ({
    id: `wife-card-${index + 1}`,
    cnName: source[index % source.length]?.cnName || DEFAULT_WIFE.cnName,
    otherName: source[index % source.length]?.otherName || DEFAULT_WIFE.otherName,
    image: source[index % source.length]?.image || DEFAULT_WIFE.image,
  }));
});

const firstRowCards = computed(() => wifeCards.value.slice(0, 4));
const secondRowCards = computed(() => wifeCards.value.slice(4, 8));

const activeCard = ref<WifeCard | null>(null);

function openCard(card: WifeCard) {
  activeCard.value = card;
}

function closeCard() {
  activeCard.value = null;
}

function onWindowKeydown(event: KeyboardEvent) {
  if (event.key === "Escape" && activeCard.value) {
    closeCard();
  }
}

onMounted(() => {
  window.addEventListener("keydown", onWindowKeydown);
});

onBeforeUnmount(() => {
  window.removeEventListener("keydown", onWindowKeydown);
});
</script>

<template>
  <div class="wives-page">
    <main class="wives-main">
      <section class="hex-stage">
        <div class="hex-grid">
          <div class="hex-row row-1">
            <button
              v-for="card in firstRowCards"
              :key="card.id"
              type="button"
              class="hex-card"
              :aria-label="`查看 ${card.cnName || card.otherName || '爱妻'}`"
              @click="openCard(card)"
            >
              <span class="hex-media">
                <img :src="card.image" alt="爱妻墙卡片" draggable="false" />
              </span>
            </button>
          </div>

          <div class="hex-row row-2">
            <button
              v-for="card in secondRowCards"
              :key="card.id"
              type="button"
              class="hex-card"
              :aria-label="`查看 ${card.cnName || card.otherName || '爱妻'}`"
              @click="openCard(card)"
            >
              <span class="hex-media">
                <img :src="card.image" alt="爱妻墙卡片" draggable="false" />
              </span>
            </button>
          </div>
        </div>
      </section>
    </main>

    <Teleport to="body">
      <Transition name="wife-modal">
        <div v-if="activeCard" class="wife-modal" @click.self="closeCard">
          <article class="wife-modal-card" role="dialog" aria-modal="true" aria-label="爱妻详情">
            <button type="button" class="wife-modal-close" aria-label="关闭弹窗" @click="closeCard">
              ×
            </button>

            <div class="wife-modal-image-wrap">
              <img :src="activeCard.image" :alt="activeCard.cnName || '爱妻图片'" />
            </div>

            <div class="wife-modal-content">
              <h2>{{ activeCard.cnName || "未命名" }}</h2>
              <p>{{ activeCard.otherName || "暂无别名" }}</p>
            </div>
          </article>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.wives-page {
  position: relative;
  isolation: isolate;
  min-height: 100vh;
  padding: 6.5rem 0.8rem 2.2rem;
  overflow: hidden;
  display: flex;
  background: #030714;
}

.wives-page::before {
  content: "";
  position: absolute;
  inset: -42%;
  z-index: 0;
  pointer-events: none;
  background-image:
    linear-gradient(135deg, rgba(7, 28, 54, 0.28), rgba(4, 19, 40, 0.34)),
    url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath fill='%230f9cb8' fill-opacity='0.08' d='M12 21s-6.7-4.35-9.33-7.56C.8 11.2 1.05 7.8 3.74 5.98c2.2-1.48 5.03-1.03 6.93 1.11 1.9-2.14 4.74-2.59 6.93-1.11 2.69 1.82 2.94 5.22 1.07 7.46C18.7 16.65 12 21 12 21z'/%3E%3C/svg%3E");
  background-size:
    100% 100%,
    180px 180px;
  background-position:
    0 0,
    0 0;
  background-repeat: repeat;
  transform: rotate(-16deg) scale(1.06);
  transform-origin: center;
  opacity: 0.94;
  animation: heart-drift-solid 12s linear infinite;
}

.wives-page::after {
  content: "";
  position: absolute;
  inset: -42%;
  z-index: 0;
  pointer-events: none;
  background-image:
    url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath fill='none' stroke='%23a8d8e8' stroke-opacity='0.2' stroke-width='1.55' d='M12 21s-6.7-4.35-9.33-7.56C.8 11.2 1.05 7.8 3.74 5.98c2.2-1.48 5.03-1.03 6.93 1.11 1.9-2.14 4.74-2.59 6.93-1.11 2.69 1.82 2.94 5.22 1.07 7.46C18.7 16.65 12 21 12 21z'/%3E%3C/svg%3E");
  background-size: 260px 260px;
  background-position: 120px 90px;
  background-repeat: repeat;
  transform: rotate(-16deg) scale(1.06);
  transform-origin: center;
  animation: heart-drift-outline 16s linear infinite;
}

.wives-main {
  position: relative;
  z-index: 1;
  flex: 1;
  width: min(var(--site-max-width), 100%);
  margin: 0 auto;
  display: flex;
  justify-content: center;
  align-items: center;
}

@keyframes heart-drift-solid {
  0% {
    background-position:
      0 0,
      0 0;
  }

  100% {
    background-position:
      0 0,
      120px 0;
  }
}

@keyframes heart-drift-outline {
  0% {
    background-position: 120px 90px;
  }

  100% {
    background-position: 260px 90px;
  }
}

.hex-stage {
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
}

.hex-grid {
  --hex-width: clamp(8.5rem, 12.4vw, 11.8rem);
  --hex-height: calc(var(--hex-width) * 1.147);
  --hex-gap: clamp(0.2rem, 0.4vw, 0.38rem);
  --hex-clip: polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%);
  width: fit-content;
}

.hex-row {
  display: grid;
  grid-template-columns: repeat(4, var(--hex-width));
  gap: var(--hex-gap);
}

.row-2 {
  margin-left: calc(var(--hex-width) * 0.5 + var(--hex-gap) * 0.5);
  margin-top: calc(var(--hex-height) * -0.23);
}

.hex-card {
  width: var(--hex-width);
  height: var(--hex-height);
  position: relative;
  border: 0;
  padding: 0;
  cursor: pointer;
  background: linear-gradient(
    145deg,
    rgba(162, 238, 255, 0.95) 0%,
    rgba(88, 172, 255, 0.86) 58%,
    rgba(32, 108, 196, 0.9) 100%
  );
  clip-path: var(--hex-clip);
  box-shadow:
    0 0 0 1px rgba(184, 244, 255, 0.74),
    0 0 22px rgba(87, 184, 255, 0.78),
    0 12px 28px rgba(0, 0, 0, 0.35);
  transition: box-shadow 0.26s cubic-bezier(0.2, 0.86, 0.2, 1);
  isolation: isolate;
}

.hex-card::before {
  content: "";
  position: absolute;
  inset: -7px;
  clip-path: var(--hex-clip);
  background: radial-gradient(circle, rgba(126, 226, 255, 0.64) 0%, rgba(21, 98, 172, 0) 70%);
  filter: blur(9px);
  opacity: 0.92;
  pointer-events: none;
  z-index: 0;
}

.hex-media {
  position: absolute;
  inset: 2px;
  clip-path: var(--hex-clip);
  overflow: hidden;
  z-index: 1;
  background: #061326;
}

.hex-media::after {
  content: "";
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.14) 0%, rgba(0, 0, 0, 0.08) 100%);
  pointer-events: none;
}

.hex-media img {
  width: 100%;
  height: 100%;
  display: block;
  object-fit: cover;
  transform: scale(1.01);
  transition: transform 0.26s cubic-bezier(0.2, 0.86, 0.2, 1);
}

.hex-card:hover {
  box-shadow:
    0 0 0 1px rgba(201, 248, 255, 0.9),
    0 0 30px rgba(109, 208, 255, 0.92),
    0 16px 34px rgba(0, 0, 0, 0.38);
}

.hex-card:hover .hex-media img {
  transform: scale(1.06);
}

.hex-card:focus-visible {
  outline: 2px solid #8de7ff;
  outline-offset: 4px;
}

.wife-modal {
  position: fixed;
  inset: 0;
  z-index: 120;
  display: grid;
  place-items: center;
  padding: 1.2rem;
  background: rgba(2, 10, 24, 0.7);
  backdrop-filter: blur(6px);
}

.wife-modal-card {
  position: relative;
  width: min(25rem, 94vw);
  border-radius: 0.9rem;
  border: 1px solid rgba(120, 201, 255, 0.45);
  background: #081529;
  box-shadow:
    0 0 0 1px rgba(96, 196, 255, 0.2),
    0 22px 48px rgba(0, 0, 0, 0.44);
  overflow: hidden;
}

.wife-modal-close {
  position: absolute;
  top: 0.55rem;
  left: 0.55rem;
  width: 2rem;
  height: 2rem;
  border-radius: 0.5rem;
  border: 1px solid rgba(160, 218, 255, 0.45);
  background: rgba(4, 22, 43, 0.9);
  color: #eaf6ff;
  font-size: 1.18rem;
  line-height: 1;
  cursor: pointer;
  z-index: 2;
}

.wife-modal-close:hover {
  background: rgba(11, 37, 68, 0.95);
}

.wife-modal-image-wrap {
  aspect-ratio: 1 / 1;
  background: #050f1f;
}

.wife-modal-image-wrap img {
  width: 100%;
  height: 100%;
  display: block;
  object-fit: cover;
}

.wife-modal-content {
  padding: 0.9rem 1rem 1rem;
}

.wife-modal-content h2 {
  margin: 0;
  color: #f3f9ff;
  font-size: 1.22rem;
  line-height: 1.2;
}

.wife-modal-content p {
  margin: 0.45rem 0 0;
  color: rgba(227, 241, 255, 0.82);
  font-size: 0.96rem;
}

.wife-modal-enter-active,
.wife-modal-leave-active {
  transition: opacity 0.22s ease;
}

.wife-modal-enter-active .wife-modal-card,
.wife-modal-leave-active .wife-modal-card {
  transition: transform 0.24s cubic-bezier(0.2, 0.86, 0.24, 1);
}

.wife-modal-enter-from,
.wife-modal-leave-to {
  opacity: 0;
}

.wife-modal-enter-from .wife-modal-card,
.wife-modal-leave-to .wife-modal-card {
  transform: translateY(0.6rem) scale(0.98);
}

@media (max-width: 1180px) {
  .hex-grid {
    --hex-width: clamp(7.8rem, 16.8vw, 10rem);
    --hex-gap: 0.28rem;
  }
}

@media (max-width: 760px) {
  .wives-page {
    padding: 6rem 0.4rem 1.8rem;
  }

  .hex-grid {
    --hex-width: clamp(6.8rem, 22vw, 8.2rem);
    --hex-gap: 0.2rem;
  }

  .hex-row {
    grid-template-columns: repeat(4, var(--hex-width));
  }

  .row-2 {
    margin-top: calc(var(--hex-height) * -0.21);
  }

  .wife-modal-content h2 {
    font-size: 1.08rem;
  }
}
</style>
