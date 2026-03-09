<script setup lang="ts">
defineProps<{
  title: string
}>()
</script>

<template lang="pug">
div(class="mb-5 rounded-xl border border-muted bg-neutral-50 dark:bg-neutral-950 p-6 shadow-md")
  div(class="flex justify-between items-start pb-3")
    h2(v-if="title" class="mt-0 text-xl font-bold") {{ title }}
    div(v-if="$slots.right")
      slot(name="right")

  div(class="mt-2")
    slot
</template>
