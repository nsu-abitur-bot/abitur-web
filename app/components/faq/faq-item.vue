<script setup lang="ts">
import type { components } from "../../../types/openapi"

type FaqItem = components["schemas"]["FaqItem"]

const props = defineProps<{
  item: FaqItem
  index: number
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
div(class="border border-gray-200 dark:border-gray-700 rounded-lg p-5 bg-white dark:bg-gray-900 transition-colors hover:border-primary-500/50")
  div(v-if="isEditing")
    faq-form(:initial-data="item" :index="index" @submit="handleUpdated" @cancel="handleCancel")

  div(v-else class="flex flex-col gap-3")
    div(class="flex justify-between items-start gap-4")
      h3(class="text-lg font-medium text-gray-900 dark:text-gray-100") {{ props.item.question }}
      div(class="flex gap-2 shrink-0")
        u-button(
          icon="i-heroicons-pencil-square"
          color="neutral"
          variant="ghost"
          size="sm"
          @click="isEditing = true"
        )
        u-button(
          icon="i-heroicons-trash"
          color="error"
          variant="ghost"
          size="sm"
          @click="emit('delete')"
        )

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
    div(class="relative mt-2 p-4 bg-gray-50 dark:bg-gray-800 rounded-md")
      // Quote icon visual detail
      u-icon(
        name="i-heroicons-chat-bubble-bottom-center-text"
        class="absolute top-4 right-4 text-gray-300 dark:text-gray-600 w-6 h-6"
      )
      p(class="text-gray-700 dark:text-gray-300 whitespace-pre-wrap pr-8") {{ props.item.answer }}
</template>
