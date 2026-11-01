<script setup lang="ts">
import type { Topic } from "~/services/topics"

const props = defineProps<{ topic: Topic, save: (id: number, label: string, description: string | null) => Promise<boolean> }>()

const emit = defineEmits<{
  (e: "remove", id: number): void
}>()

const saving = ref(false)
const isEditing = ref(false)
const draftLabel = ref(props.topic.label)
const draftDescription = ref(props.topic.description ?? "")

watch(() => props.topic, (next) => {
  if (isEditing.value) {
    return
  }
  draftLabel.value = next.label
  draftDescription.value = next.description ?? ""
})

const onSave = async () => {
  const label = draftLabel.value.trim()
  if (!label || saving.value) {
    return
  }
  saving.value = true
  try {
    if (await props.save(props.topic.id, label, draftDescription.value.trim() || null)) {
      isEditing.value = false
    }
  } finally {
    saving.value = false
  }
}

const onCancel = () => {
  draftLabel.value = props.topic.label
  draftDescription.value = props.topic.description ?? ""
  isEditing.value = false
}
</script>

<template lang="pug">
div(class="flex flex-wrap items-center gap-3 rounded-lg border border-gray-200 dark:border-gray-800 p-3")
  ui-form-dialog(v-model:open="isEditing" size="compact" title="Редактирование темы")
    template(#body)
      div(class="space-y-4")
        u-form-field(label="Название темы")
          u-input(v-model="draftLabel" class="w-full" placeholder="Название темы" aria-label="Название темы")
        u-form-field(label="Описание")
          u-input(v-model="draftDescription" class="w-full" placeholder="Опционально" aria-label="Описание темы")
    template(#footer)
      div(class="flex justify-end gap-2 w-full")
        u-button(color="neutral" variant="ghost" :disabled="saving" @click="onCancel") Отмена
        u-button(color="primary" :loading="saving" @click="onSave") Сохранить

  div(class="contents")
    div(class="flex-1 min-w-0")
      div(class="text-sm font-medium text-gray-800 dark:text-gray-200") {{ topic.label }}
      div(v-if="topic.description" class="text-xs text-gray-500") {{ topic.description }}
    div(class="flex gap-2")
      u-button(
        icon="i-heroicons-pencil-square"
        :aria-label="`Редактировать тему ${topic.label}`"
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
          :aria-label="`Деактивировать тему ${topic.label}`"
          color="error"
          variant="ghost"
          size="sm"
        )
        template(#footer="{ close }")
          div(class="flex justify-end gap-2 w-full")
            u-button(color="neutral" variant="ghost" @click="close") Отмена
            u-button(color="error" @click="emit('remove', topic.id); close()") Деактивировать
</template>
