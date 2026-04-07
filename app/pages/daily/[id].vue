<script setup lang="ts">
const route = useRoute();
const rawId = String(route.params.id ?? "").trim();
const hash = rawId ? `#daily-${encodeURIComponent(rawId)}` : "";

await navigateTo(`/daily${hash}`, {
  redirectCode: 301,
  replace: true,
});
</script>

<template>
  <div />
</template>
