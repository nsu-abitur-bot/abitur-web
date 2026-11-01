<script setup lang="ts">
withDefaults(defineProps<{
  title: string
  size?: "compact" | "regular" | "wide"
}>(), { size: "regular" })
const open = defineModel<boolean>("open", { default: false })
</script>

<template lang="pug">
u-modal(v-model:open="open" :title="title" :ui="{ overlay: 'admin-modal-overlay', content: `admin-modal admin-modal-form admin-modal-${size}`, header: 'admin-modal-header', title: 'admin-modal-title', close: 'admin-modal-close', body: 'admin-modal-body space-y-5', footer: 'admin-modal-footer' }")
  template(#body)
    slot(name="body")
  template(v-if="$slots.footer" #footer)
    slot(name="footer")
</template>
