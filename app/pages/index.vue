<script setup lang="ts">
import { ref } from "vue"

const refreshTrigger = ref(0)

function handleRefresh() {
  refreshTrigger.value++
}
</script>

<template lang="pug">
u-container(class="py-8 space-y-8")
  div(class="grid grid-cols-1 xl:grid-cols-2 gap-8 items-start")
    // Left side: Uploaders
    div(class="space-y-6")
      ui-box(title="Добавить новые знания")
        template(#body)
          rag-parser(@success="handleRefresh")

    // Right side: Document List
    div(class="space-y-6")
      ui-box(title="База знаний (RAG)")
        template(#body)
          rag-list(:refresh-trigger="refreshTrigger")
</template>
