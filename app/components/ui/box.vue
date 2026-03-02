<script setup lang="ts">
defineProps<{
  title: string
}>()
</script>

<template lang="pug">
div(class="mb-5 rounded-xl border border-muted bg-neutral-50 dark:bg-neutral-950 p-6 shadow-md")
  h2(v-if="title" class="mt-0 pb-3 text-xl") {{ title }}
  div
    slot
</template>
