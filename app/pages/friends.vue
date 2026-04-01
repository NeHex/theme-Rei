<script setup lang="ts">
useHead({
  title: "友链 - NeHex",
});

const friends = [
  { name: "Demo Friend A", url: "https://example.com", desc: "技术与生活杂记" },
  { name: "Demo Friend B", url: "https://example.com", desc: "前端工程与设计实践" },
  { name: "Demo Friend C", url: "https://example.com", desc: "摄影与创作日志" },
];
</script>

<template>
  <div class="simple-page">
    <main class="simple-main">
      <section class="simple-card">
        <h1>友链</h1>
        <ul class="friend-list">
          <li v-for="item in friends" :key="item.name" class="friend-item">
            <a :href="item.url" target="_blank" rel="noopener noreferrer">{{ item.name }}</a>
            <p>{{ item.desc }}</p>
          </li>
        </ul>
      </section>
    </main>
  </div>
</template>

<style scoped>
.simple-page {
  min-height: 100vh;
  padding: 6.3rem 1rem 3rem;
  color: #e8f1ff;
  background:
    linear-gradient(180deg, rgba(3, 12, 24, 0.74), rgba(3, 8, 18, 0.92)),
    url("/images/background.png") center / cover no-repeat fixed;
}

.simple-main {
  width: min(92%, 980px);
  margin: 0 auto;
}

.simple-card {
  padding: 1.25rem 1.3rem;
  border-radius: 1rem;
  border: 1px solid rgba(118, 170, 194, 0.2);
  background: rgba(8, 15, 27, 0.86);
  backdrop-filter: blur(8px);
}

h1 {
  margin: 0 0 0.8rem;
}

.friend-list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 0.7rem;
}

.friend-item {
  padding: 0.72rem 0.78rem;
  border-radius: 0.72rem;
  background: rgba(255, 255, 255, 0.05);
}

.friend-item a {
  color: #bfe9ff;
  text-decoration: none;
  font-weight: 700;
}

.friend-item p {
  margin: 0.35rem 0 0;
  color: rgba(194, 213, 230, 0.82);
}
</style>
