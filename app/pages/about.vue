<script setup lang="ts">
useHead({
  title: "关于本站 - NeHex",
});
</script>

<template>
  <div class="simple-page">
    <main class="simple-main">
      <section class="simple-card">
        <h1>关于本站</h1>
        <p>
          这里是 NeHex 的实验与记录空间，聚焦技术、创作和长期主义。页面风格强调沉浸感与模块化，后续会持续扩展更多栏目。
        </p>
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
  margin: 0 0 0.7rem;
}

p {
  margin: 0;
  line-height: 1.75;
}
</style>
