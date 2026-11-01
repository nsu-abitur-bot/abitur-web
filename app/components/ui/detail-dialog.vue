<script setup lang="ts">
defineProps<{
  title: string
  description?: string
}>()

const open = defineModel<boolean>("open", { default: false })
</script>

<template lang="pug">
u-modal(v-model:open="open" :title="title" :description="description" :ui="{ content: 'w-[calc(100%-2rem)] sm:max-w-5xl max-h-[calc(100dvh-2rem)]', header: 'shrink-0 min-w-0', description: 'break-anywhere', body: 'overflow-y-auto min-h-0 min-w-0 break-anywhere', footer: 'shrink-0' }")
  template(#body)
    slot
  template(v-if="$slots.footer" #footer="{ close }")
    slot(name="footer" :close="close")
</template>
