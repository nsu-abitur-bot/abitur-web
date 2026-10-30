<script setup lang="ts">
defineProps<{ title?: string }>()
</script>

<template lang="pug">
section.admin-panel
  .admin-section-header(v-if="title || $slots.right")
    h2(v-if="title") {{ title }}
    div(v-if="$slots.right")
      slot(name="right")
  slot
</template>
