<script setup lang="ts">
const refreshTrigger = ref(0)
const adding = ref(false)
</script>

<template lang="pug">
ui-page(title="Материалы")
  template(#actions)
    u-button(icon="i-lucide-plus" @click="adding = !adding") {{ adding ? 'Закрыть' : 'Добавить материал' }}
  ui-box(v-show="adding" title="Добавить материал")
    rag-parser(@success="refreshTrigger++")
  rag-list(:refresh-trigger="refreshTrigger")
</template>
