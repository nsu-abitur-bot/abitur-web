<script setup lang="ts">
import type { Topic } from "~/services/topics"

const props = defineProps<{ topic: Topic }>()

const emit = defineEmits<{
  (e: "save", id: number, label: string, description: string | null): void
  (e: "remove", id: number): void
}>()

const isEditing = ref(false)
const draftLabel = ref(props.topic.label)
const draftDescription = ref(props.topic.description ?? "")

watch(() => props.topic, (next) => {
  draftLabel.value = next.label
  draftDescription.value = next.description ?? ""
})

const onSave = () => {
  const label = draftLabel.value.trim()
  if (!label) {
    return
  }
  emit("save", props.topic.id, label, draftDescription.value.trim() || null)
  isEditing.value = false
}

const onCancel = () => {
  draftLabel.value = props.topic.label
  draftDescription.value = props.topic.description ?? ""
  isEditing.value = false
}
</script>

<template lang="pug">
div(class="flex flex-wrap items-center gap-3 rounded-lg border border-gray-200 dark:border-gray-800 p-3")
  template(v-if="isEditing")
    u-input(v-model="draftLabel" class="flex-1 min-w-40" placeholder="Название темы")
    u-input(v-model="draftDescription" class="flex-1 min-w-40" placeholder="Описание (опционально)")
    div(class="flex gap-2")
      u-button(color="primary" @click="onSave") Сохранить
      u-button(color="neutral" variant="ghost" @click="onCancel") Отмена

  template(v-else)
    div(class="flex-1 min-w-0")
      div(class="text-sm font-medium text-gray-800 dark:text-gray-200") {{ topic.label }}
      div(v-if="topic.description" class="text-xs text-gray-500") {{ topic.description }}
    div(class="flex gap-2")
      u-button(
        icon="i-heroicons-pencil-square"
        color="neutral"
        variant="ghost"
        size="sm"
        @click="isEditing = true"
      )
      u-modal(
        title="Деактивировать тему?"
        description="Тема будет скрыта, но останется в БД для целостности исторических данных."
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
            u-button(color="error" @click="emit('remove', topic.id); close()") Деактивировать
</template>
