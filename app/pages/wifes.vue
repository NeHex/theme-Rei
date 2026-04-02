<script setup lang="ts">
const { settings } = useSiteSettings();

useHead(() => ({
  title: `爱妻墙 - ${settings.value.siteTitle}`,
}));

const DEFAULT_WIFE_IMAGE = "/images/wifes/takagi3-half.png";

const wifeCards = computed(() => {
  const source = settings.value.themeWifes.length
    ? settings.value.themeWifes
    : [DEFAULT_WIFE_IMAGE];

  return Array.from({ length: 8 }, (_, index) => ({
    id: `wife-card-${index + 1}`,
    image: source[index % source.length] || DEFAULT_WIFE_IMAGE,
  }));
});

const firstRowCards = computed(() => wifeCards.value.slice(0, 4));
const secondRowCards = computed(() => wifeCards.value.slice(4, 8));
</script>

<template>
  <div class="wives-page">
    <main class="wives-main">
      <section class="hex-stage">
        <div class="hex-grid">
          <div class="hex-row row-1">
            <article v-for="card in firstRowCards" :key="card.id" class="hex-card">
              <span class="hex-media">
                <img :src="card.image" alt="爱妻墙卡片" draggable="false" />
              </span>
            </article>
          </div>

          <div class="hex-row row-2">
            <article v-for="card in secondRowCards" :key="card.id" class="hex-card">
              <span class="hex-media">
                <img :src="card.image" alt="爱妻墙卡片" draggable="false" />
              </span>
            </article>
          </div>
        </div>
      </section>
    </main>
  </div>
</template>

<style scoped>
.wives-page {
  min-height: 100vh;
  padding: 6.5rem 0.8rem 2.2rem;
  overflow-x: clip;
  display: flex;
}

.wives-main {
  flex: 1;
  width: min(var(--site-max-width), 100%);
  margin: 0 auto;
  display: flex;
  justify-content: center;
  align-items: center;
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
  clip-path: var(--hex-clip);
  background: linear-gradient(145deg, rgba(162, 238, 255, 0.95) 0%, rgba(88, 172, 255, 0.86) 58%, rgba(32, 108, 196, 0.9) 100%);
  box-shadow:
    0 0 0 1px rgba(184, 244, 255, 0.68),
    0 0 18px rgba(87, 184, 255, 0.62),
    0 12px 28px rgba(0, 0, 0, 0.35);
  transition:
    transform 0.26s cubic-bezier(0.2, 0.86, 0.2, 1),
    box-shadow 0.26s cubic-bezier(0.2, 0.86, 0.2, 1);
  isolation: isolate;
}

.hex-card::before {
  content: "";
  position: absolute;
  inset: -7px;
  clip-path: var(--hex-clip);
  background: radial-gradient(circle, rgba(126, 226, 255, 0.64) 0%, rgba(21, 98, 172, 0) 70%);
  filter: blur(9px);
  opacity: 0.9;
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
  transform: translateY(-0.18rem) scale(1.018);
  box-shadow:
    0 0 0 1px rgba(201, 248, 255, 0.8),
    0 0 24px rgba(109, 208, 255, 0.86),
    0 16px 34px rgba(0, 0, 0, 0.38);
}

.hex-card:hover .hex-media img {
  transform: scale(1.06);
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
}
</style>
