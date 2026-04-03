<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from "vue";
import "maplibre-gl/dist/maplibre-gl.css";

const { settings } = useSiteSettings();

useHead(() => ({
  title: `关于本站 - ${settings.value.siteTitle}`,
}));

const mapCard = ref<HTMLElement | null>(null);
const mapContainer = ref<HTMLElement | null>(null);
const isMapLoaded = ref(false);

let map: import("maplibre-gl").Map | null = null;

const footprintPoints = [
  { label: "天津", coords: [117.200983, 39.084158] as [number, number] },
  { label: "山东", coords: [118.000923, 36.675807] as [number, number] },
];

function setMapInteractive(enabled: boolean) {
  if (!map) return;

  if (enabled) {
    map.dragPan.enable();
    map.scrollZoom.enable();
    map.doubleClickZoom.enable();
    map.touchZoomRotate.enable();
  } else {
    map.dragPan.disable();
    map.scrollZoom.disable();
    map.doubleClickZoom.disable();
    map.touchZoomRotate.disable();
  }
}

function handleCardEnter() {
  setMapInteractive(true);
}

function handleCardLeave() {
  setMapInteractive(false);
}

function handleMapResize() {
  map?.resize();
}

onMounted(async () => {
  if (!mapContainer.value) return;

  const maplibregl = await import("maplibre-gl");

  map = new maplibregl.Map({
    container: mapContainer.value,
    style: {
      version: 8,
      sources: {
        osm: {
          type: "raster",
          tiles: [
            "https://a.tile.openstreetmap.org/{z}/{x}/{y}.png",
            "https://b.tile.openstreetmap.org/{z}/{x}/{y}.png",
            "https://c.tile.openstreetmap.org/{z}/{x}/{y}.png",
          ],
          tileSize: 256,
          attribution: "© OpenStreetMap contributors",
        },
      },
      layers: [
        {
          id: "osm-base",
          type: "raster",
          source: "osm",
        },
      ],
    },
    center: [105.0, 34.0],
    zoom: 3.1,
    attributionControl: false,
    dragRotate: false,
    pitchWithRotate: false,
  });

  setMapInteractive(false);

  map.on("load", () => {
    footprintPoints.forEach((point) => {
      const popup = new maplibregl.Popup({ offset: 18, closeButton: false }).setText(point.label);
      new maplibregl.Marker({ color: "#2ad4e1", scale: 0.9 }).setLngLat(point.coords).setPopup(popup).addTo(map!);
    });

    map?.resize();
    isMapLoaded.value = true;
  });

  map.on("mouseenter", () => {
    const canvas = map?.getCanvas();
    if (canvas) canvas.style.cursor = "grab";
  });

  map.on("mousedown", () => {
    const canvas = map?.getCanvas();
    if (canvas) canvas.style.cursor = "grabbing";
  });

  map.on("mouseup", () => {
    const canvas = map?.getCanvas();
    if (canvas) canvas.style.cursor = "grab";
  });

  mapCard.value?.addEventListener("mouseenter", handleCardEnter);
  mapCard.value?.addEventListener("mouseleave", handleCardLeave);
  window.addEventListener("resize", handleMapResize, { passive: true });
});

onBeforeUnmount(() => {
  mapCard.value?.removeEventListener("mouseenter", handleCardEnter);
  mapCard.value?.removeEventListener("mouseleave", handleCardLeave);
  window.removeEventListener("resize", handleMapResize);
  map?.remove();
  map = null;
});
</script>

<template>
  <div class="about-page">
    <main class="about-main">
      <section class="about-hero">
        <div class="avatar-column">
          <div class="avatar-shell">
            <img class="about-avatar" :src="settings.userHeadpic" :alt="`${settings.userName} 头像`" />
            <img class="avatar-frame" src="/images/headborder.webp" alt="" aria-hidden="true" />
          </div>
        </div>

        <h1 class="about-title">关于本站</h1>
      </section>

      <section class="about-modules">
        <article ref="mapCard" class="module-card footprint-card">
          <h2 class="footprint-title">足迹</h2>
          <div ref="mapContainer" class="footprint-map" />
          <p class="footprint-hint">
            {{ isMapLoaded ? "鼠标移入卡片后可拖拽地图和滚轮缩放" : "地图加载中..." }}
          </p>
        </article>
      </section>
    </main>
  </div>
</template>

<style scoped>
.about-page {
  min-height: 100vh;
  padding: 6.3rem 1rem 2.8rem;
  color: var(--theme-text);
}

.about-main {
  width: var(--site-max-width);
  margin: 0 auto;
}

.about-hero {
  padding: 1.3rem 0.5rem 0.5rem;
  display: grid;
  justify-items: center;
}

.avatar-column {
  display: grid;
  place-items: center;
}

.avatar-shell {
  position: relative;
  width: clamp(12rem, 22vw, 17rem);
  aspect-ratio: 1 / 1;
  display: grid;
  place-items: center;
}

.about-avatar {
  width: 82%;
  height: 82%;
  object-fit: cover;
  border-radius: 50%;
  border: 3px solid rgba(233, 240, 251, 0.9);
  box-shadow: 0 16px 36px rgba(0, 0, 0, 0.4);
}

.avatar-frame {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: contain;
  pointer-events: none;
  filter: drop-shadow(0 12px 22px rgba(0, 0, 0, 0.32));
}

.about-title {
  margin: 1rem 0 0;
  text-align: center;
  font-size: clamp(2.4rem, 5.1vw, 4.2rem);
  line-height: 1;
  letter-spacing: 0.015em;
  color: rgba(244, 249, 255, 0.97);
  text-shadow: 0 10px 26px rgba(0, 0, 0, 0.28);
}

.about-modules {
  margin-top: 2rem;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1rem;
}

.module-card {
  position: relative;
  border-radius: 1rem;
  border: 1px solid rgba(118, 170, 194, 0.26);
  background:
    linear-gradient(155deg, rgba(17, 29, 48, 0.86) 0%, rgba(7, 14, 25, 0.92) 100%),
    rgba(8, 16, 29, 0.82);
  backdrop-filter: blur(10px) saturate(112%);
  -webkit-backdrop-filter: blur(10px) saturate(112%);
  overflow: hidden;
}

.footprint-card {
  grid-column: 1 / 2;
  min-height: 26rem;
  box-shadow: 0 18px 30px rgba(0, 0, 0, 0.24);
}

.footprint-title {
  position: absolute;
  top: 0.95rem;
  left: 1rem;
  margin: 0;
  z-index: 2;
  font-size: 1.28rem;
  font-weight: 700;
  color: rgba(238, 247, 255, 0.95);
  text-shadow: 0 3px 16px rgba(1, 5, 12, 0.56);
  pointer-events: none;
}

.footprint-map {
  width: 100%;
  min-height: 23.8rem;
  height: 100%;
}

.footprint-hint {
  margin: 0;
  position: absolute;
  left: 1rem;
  bottom: 0.85rem;
  z-index: 2;
  font-size: 0.84rem;
  color: rgba(212, 230, 245, 0.88);
  background: rgba(4, 12, 23, 0.48);
  padding: 0.3rem 0.65rem;
  border-radius: 0.55rem;
  backdrop-filter: blur(3px);
  -webkit-backdrop-filter: blur(3px);
  pointer-events: none;
}

.footprint-card::after {
  content: "";
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: linear-gradient(180deg, rgba(2, 6, 14, 0.08) 0%, rgba(3, 8, 16, 0.32) 100%);
}

.footprint-card :deep(.maplibregl-ctrl-bottom-right) {
  margin: 0 0.48rem 0.52rem 0;
}

.footprint-card :deep(.maplibregl-ctrl-group) {
  background: rgba(6, 15, 27, 0.72);
  border: 1px solid rgba(96, 145, 172, 0.34);
  box-shadow: 0 5px 16px rgba(0, 0, 0, 0.24);
}

.footprint-card :deep(.maplibregl-ctrl-group button) {
  filter: brightness(1.08);
}

.footprint-card :deep(.maplibregl-popup-content) {
  border-radius: 0.58rem;
  padding: 0.36rem 0.52rem;
  color: #eaf4ff;
  background: rgba(5, 16, 29, 0.95);
  border: 1px solid rgba(88, 149, 182, 0.38);
  box-shadow: 0 9px 18px rgba(0, 0, 0, 0.35);
  font-size: 0.82rem;
}

.footprint-card :deep(.maplibregl-popup-tip) {
  border-top-color: rgba(5, 16, 29, 0.95);
}

@media (max-width: 1080px) {
  .about-modules {
    grid-template-columns: 1fr;
  }

  .footprint-card {
    grid-column: 1;
  }
}

@media (max-width: 900px) {
  .about-page {
    padding-top: 6rem;
  }

  .avatar-shell {
    width: clamp(11.2rem, 44vw, 15rem);
  }

  .about-title {
    margin-top: 0.9rem;
  }
}

@media (max-width: 560px) {
  .about-page {
    padding-inline: 0.65rem;
  }

  .about-hero {
    padding-inline: 0;
  }

  .avatar-shell {
    width: clamp(10.2rem, 58vw, 13.5rem);
  }

  .footprint-card {
    min-height: 22.6rem;
  }

  .footprint-map {
    min-height: 20.7rem;
  }
}
</style>
