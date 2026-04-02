<script setup lang="ts">
const { settings } = useSiteSettings();

useHead(() => ({
  title: `关于本站 - ${settings.value.siteTitle}`,
}));
</script>

<template>
  <div class="simple-page">
    <main class="simple-main">
      <section class="simple-card">
        <h1>关于本站</h1>
        <p>
          这里是 NeHex 的实验与记录空间，聚焦技术、创作与长期主义。页面风格强调沉浸感与模块化，后续会持续扩展更多栏目与内容。
        </p>
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
  margin: 0 0 0.7rem;
  font-size: var(--fs-h1);
  line-height: 1.1;
}

p {
  margin: 0;
  line-height: 1.75;
  color: var(--theme-text-soft);
}
</style>
