<script setup lang="ts">
defineProps<{ title: string, description?: string }>()
</script>

<template lang="pug">
section.admin-page
  header.admin-page-header
    div
      h1 {{ title }}
      p.admin-muted(v-if="description") {{ description }}
    .admin-actions(v-if="$slots.actions")
      slot(name="actions")
  slot
</template>
