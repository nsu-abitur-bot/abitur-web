<script setup lang="ts">
import { useRagParserStore } from "~/stores/rag-parser"

const refreshTrigger = ref(0)
const adding = ref(false)
const parserStore = useRagParserStore()

watch(() => parserStore.uploadingFiles, (uploading, wasUploading) => {
  if (wasUploading && !uploading) {
    refreshTrigger.value++
  }
})
</script>

<template lang="pug">
ui-page(title="Материалы")
  template(#actions)
    u-button(icon="i-lucide-refresh-cw" color="neutral" variant="outline" aria-label="Обновить материалы" @click="refreshTrigger++") Обновить
    u-button(icon="i-lucide-plus" @click="adding = true") Добавить материал
  ui-form-dialog(v-model:open="adding" title="Добавить материал")
    template(#body)
      rag-parser(@success="refreshTrigger++")
  rag-list(:refresh-trigger="refreshTrigger")
</template>
