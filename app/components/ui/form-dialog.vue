<script setup lang="ts">
defineProps<{ title: string }>()
const open = defineModel<boolean>("open", { default: false })
</script>

<template lang="pug">
u-modal(v-model:open="open" :title="title" :ui="{ content: 'w-full sm:max-w-2xl max-sm:max-w-none max-sm:h-dvh max-sm:max-h-dvh max-sm:rounded-none', body: 'overflow-y-auto min-h-0 space-y-4', footer: 'shrink-0' }")
  template(#body)
    slot(name="body")
  template(v-if="$slots.footer" #footer)
    slot(name="footer")
</template>
