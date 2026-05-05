<script setup lang="ts">
const refreshTrigger = ref(0)

function handleRefresh() {
  refreshTrigger.value++
}
</script>

<template lang="pug">
u-container(class="py-8 space-y-8")
  div(class="grid grid-cols-1 gap-8 items-start")
    div(class="space-y-6")
      ui-box(title="Добавить источник")
        rag-parser(@success="handleRefresh")
    div(class="space-y-6")
      ui-box(title="Индексированные источники")
        rag-list(:refresh-trigger="refreshTrigger")
</template>
