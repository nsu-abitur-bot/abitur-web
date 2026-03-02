<script setup lang="ts">
defineProps<{
  title: string
}>()
</script>

<template lang="pug">
div(class="mb-5 rounded-xl border border-gray-200 bg-white p-6 shadow-md")
  h2(v-if="title" class="mt-0 mb-5 border-b border-gray-100 pb-3 text-xl text-gray-900") {{ title }}
  div
    slot
</template>
