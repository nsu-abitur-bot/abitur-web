<script setup lang="ts">
import type { components } from "#openapi"

type FaqItem = components["schemas"]["FaqItem"]

const props = defineProps<{
  item: FaqItem
}>()

const emit = defineEmits<{
  (e: "delete"): void
  (e: "updated"): void
}>()

const isEditing = ref(false)

const handleCancel = () => {
  isEditing.value = false
}

const handleUpdated = () => {
  isEditing.value = false
  emit("updated")
}
</script>

<template lang="pug">
div(class="py-4")
  div(v-if="isEditing")
    faq-form(:initial-data="item" @submit="handleUpdated" @cancel="handleCancel")

  div(v-else class="flex flex-col gap-3")
    div(class="flex justify-between items-start gap-4")
      h3(class="text-sm font-semibold text-gray-900 dark:text-gray-100") {{ props.item.question }}
      div(class="flex gap-2 shrink-0")
        u-button(
          aria-label="Редактировать"
          icon="i-heroicons-pencil-square"
          color="neutral"
          variant="ghost"
          size="sm"
          @click="isEditing = true"
        )
        u-modal(
          title="Удаление вопроса"
          description="Вы уверены, что хотите удалить этот вопрос? Это действие нельзя отменить."
        )
          u-button(
            aria-label="Удалить"
          icon="i-heroicons-trash"
            color="error"
            variant="ghost"
            size="sm"
          )
          template(#footer="{ close }")
            div(class="flex justify-end gap-2 w-full")
              u-button(color="neutral" variant="ghost" @click="close") Отмена
              u-button(color="error" @click="emit('delete'); close()") Удалить

    // Aliases visually shown
    div(v-if="props.item.aliases && props.item.aliases.length > 0" class="flex flex-wrap gap-2 mt-1")
      u-badge(
        v-for="alias in props.item.aliases"
        :key="alias"
        color="neutral"
        variant="subtle"
        size="sm"
        class="font-normal"
      ) {{ alias }}

    // The Answer block
    div(class="mt-1")
      p(class="text-gray-700 dark:text-gray-300 pre-wrap-anywhere text-sm") {{ props.item.answer }}
</template>
