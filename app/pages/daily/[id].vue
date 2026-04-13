<script setup lang="ts">
const route = useRoute();
const rawId = String(route.params.id ?? "").trim();
const hash = rawId ? `#daily-${encodeURIComponent(rawId)}` : "";
const targetPath = `/daily${hash}`;

if (import.meta.client) {
  await navigateTo(targetPath, {
    replace: true,
  });
}
</script>

<template>
  <main class="daily-legacy-forward">
    <p>正在跳转到日常页面...</p>
    <NuxtLink :to="targetPath">
      若未自动跳转，点此继续
    </NuxtLink>
  </main>
</template>
