<script setup lang="ts">
const refreshTrigger = ref(0)
const adding = ref(false)
</script>

<template lang="pug">
ui-page(title="Материалы")
  template(#actions)
    u-button(icon="i-lucide-plus" @click="adding = true") Добавить материал
  ui-form-dialog(v-model:open="adding" title="Добавить материал")
    template(#body)
      rag-parser(@success="refreshTrigger++; adding = false")
  rag-list(:refresh-trigger="refreshTrigger")
</template>
