<script setup lang="ts">
useHead({
  title: "友链 - NeHex",
});

const friends = [
  { name: "Demo Friend A", url: "https://example.com", desc: "技术与生活杂记" },
  { name: "Demo Friend B", url: "https://example.com", desc: "前端工程与设计实践" },
  { name: "Demo Friend C", url: "https://example.com", desc: "摄影与创作日记" },
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
  padding: 6.3rem 1rem 2.2rem;
  color: var(--theme-text);
}

.simple-main {
  width: var(--site-content-width);
  margin: 0 auto;
}

.simple-card {
  padding: 1.25rem 1.3rem;
  border-radius: 1rem;
  border: 1px solid var(--theme-border);
  background: var(--theme-surface);
  backdrop-filter: blur(8px);
}

h1 {
  margin: 0 0 0.8rem;
  font-size: var(--fs-h1);
  line-height: 1.1;
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
  color: var(--theme-text-soft);
}
</style>
