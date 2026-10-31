<script setup lang="ts">
const props = withDefaults(defineProps<{
  title: string
  description?: string
  kind?: "empty" | "no-results" | "loading" | "error"
}>(), { kind: "empty" })

const icon = computed(() => ({
  "empty": "i-lucide-inbox",
  "no-results": "i-lucide-search",
  "loading": "i-lucide-loader-circle",
  "error": "i-lucide-triangle-alert",
})[props.kind])
</script>

<template>
  <div class="admin-empty" :data-state="kind" :role="kind === 'error' ? 'alert' : 'status'">
    <u-icon :name="icon" class="admin-empty-icon" :class="{ 'animate-spin': kind === 'loading' }" aria-hidden="true" />
    <p class="admin-empty-title">{{ title }}</p>
    <p v-if="description" class="admin-empty-description">{{ description }}</p>
    <div v-if="$slots.default" class="admin-empty-actions"><slot /></div>
  </div>
</template>
