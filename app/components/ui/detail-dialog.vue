<script setup lang="ts">
withDefaults(defineProps<{
  title: string
  description?: string
  size?: "compact" | "regular" | "wide"
}>(), { size: "wide" })

const open = defineModel<boolean>("open", { default: false })
</script>

<template lang="pug">
u-modal(v-model:open="open" :title="title" :description="description" :ui="{ overlay: 'admin-modal-overlay', content: `admin-modal admin-modal-${size}`, header: 'admin-modal-header', title: 'admin-modal-title', description: 'admin-modal-description', close: 'admin-modal-close', body: 'admin-modal-body', footer: 'admin-modal-footer' }")
  template(#body)
    slot
  template(v-if="$slots.footer" #footer="{ close }")
    slot(name="footer" :close="close")
</template>
