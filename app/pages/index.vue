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
    div(class="space-y-6 order-2 xl:order-1")
      ui-box(title="База знаний (RAG)")
        rag-list(:refresh-trigger="refreshTrigger")
    div(class="space-y-6 order-1 xl:order-2")
      ui-box(title="Добавить новые знания")
        rag-parser(@success="handleRefresh")
</template>
