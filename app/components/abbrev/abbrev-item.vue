<script setup lang="ts">
import type { AbbrevItem } from "~/types/abbrev"

const props = defineProps<{
  item: AbbrevItem
}>()

const emit = defineEmits<{
  (e: "delete"): void
  (e: "updated"): void
}>()

const isEditing = ref(false)

const handleUpdated = () => {
  isEditing.value = false
  emit("updated")
}
</script>

<template lang="pug">
div(class="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-white dark:bg-gray-900 transition-colors hover:border-primary-500/50")
  div(v-if="isEditing")
    abbrev-form(:initial-data="item" @submit="handleUpdated" @cancel="isEditing = false")

  div(v-else class="flex items-center gap-4")
    div(class="shrink-0")
      u-badge(color="primary" variant="subtle" size="lg" class="font-mono font-semibold text-base") {{ props.item.short }}
    div(class="flex-1 text-gray-700 dark:text-gray-300") {{ props.item.full }}
    div(class="flex gap-2 shrink-0")
      u-button(
        icon="i-heroicons-pencil-square"
        color="neutral"
        variant="ghost"
        size="sm"
        @click="isEditing = true"
      )
      u-modal(
        title="Удаление аббревиатуры"
        description="Вы уверены, что хотите удалить эту аббревиатуру? Это действие нельзя отменить."
      )
        u-button(
          icon="i-heroicons-trash"
          color="error"
          variant="ghost"
          size="sm"
        )
        template(#footer="{ close }")
          div(class="flex justify-end gap-2 w-full")
            u-button(color="neutral" variant="ghost" @click="close") Отмена
            u-button(color="error" @click="emit('delete'); close()") Удалить
</template>
