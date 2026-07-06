<script setup lang="ts">
const { topics, isLoading, refresh, create, update, remove } = useTopics()

const newTopicLabel = ref("")
const newTopicDescription = ref("")
const toast = useToast()

try {
  await refresh()
} catch {
  if (import.meta.client) {
    toast.add({
      title: "Ошибка",
      description: "Не удалось загрузить темы",
      color: "error",
    })
  }
}

const activeTopics = computed(() => topics.value.filter(t => t.is_active))
const inactiveTopics = computed(() => topics.value.filter(t => !t.is_active))

const addTopic = async () => {
  const label = newTopicLabel.value.trim()
  if (!label) {
    return
  }

  try {
    await create({
      label,
      description: newTopicDescription.value.trim() || null,
      is_active: true,
    })
    newTopicLabel.value = ""
    newTopicDescription.value = ""
    toast.add({ title: "Тема добавлена", color: "success" })
  } catch {
    toast.add({ title: "Ошибка", description: "Не удалось добавить тему", color: "error" })
  }
}

const saveTopic = async (id: number, label: string, description?: string | null) => {
  try {
    await update(id, { label, description: description ?? null })
    toast.add({ title: "Тема обновлена", color: "success" })
  } catch {
    toast.add({ title: "Ошибка", description: "Не удалось обновить тему", color: "error" })
  }
}

const deactivateTopic = async (id: number) => {
  try {
    await remove(id)
    toast.add({ title: "Тема деактивирована", color: "success" })
  } catch {
    toast.add({ title: "Ошибка", description: "Не удалось удалить тему", color: "error" })
  }
}

const reactivateTopic = async (id: number) => {
  try {
    await update(id, { is_active: true })
    toast.add({ title: "Тема активирована", color: "success" })
  } catch {
    toast.add({ title: "Ошибка", description: "Не удалось активировать тему", color: "error" })
  }
}
</script>

<template lang="pug">
div(class="py-8 w-full space-y-6")
  h1(class="text-3xl font-bold text-gray-900 dark:text-white") Настройки системы

  admin-invite
  admin-list

  div(class="w-full space-y-6")
    settings-rate-limit-settings

    settings-crag-settings

    ui-box(title="Темы для классификации")
      p(class="text-sm text-gray-500 dark:text-gray-400 mb-4")
        | Темы используются для классификации сообщений и в разделе статистики.

      div(class="flex flex-wrap items-end gap-3 mb-4")
        u-form-field(label="Новая тема" class="w-full sm:w-auto flex-1 min-w-40")
          u-input(
            v-model="newTopicLabel"
            placeholder="Например: Общежитие"
            class="w-full"
            @keydown.enter.prevent="addTopic"
          )
        u-form-field(label="Описание" class="w-full sm:w-auto flex-1 min-w-40")
          u-input(
            v-model="newTopicDescription"
            placeholder="Опционально"
            class="w-full"
          )
        u-button(color="primary" class="h-10" @click="addTopic") Добавить

      div(v-if="isLoading && !topics.length" class="py-6 flex justify-center text-gray-500")
        u-icon(name="i-heroicons-arrow-path" class="animate-spin w-8 h-8")

      div(v-else-if="!topics.length" class="text-sm text-gray-500 dark:text-gray-400") Темы пока не добавлены.

      div(v-else class="space-y-2")
        settings-topic-item(
          v-for="topic in activeTopics"
          :key="topic.id"
          :topic="topic"
          @save="saveTopic"
          @remove="deactivateTopic"
        )

        details(v-if="inactiveTopics.length" class="mt-4")
          summary(class="text-sm text-gray-500 cursor-pointer select-none")
            | Деактивированные темы ({{ inactiveTopics.length }})
          div(class="space-y-2 mt-3")
            div(
              v-for="topic in inactiveTopics"
              :key="topic.id"
              class="flex flex-wrap items-center gap-3 rounded-lg border border-gray-200 dark:border-gray-800 p-3 opacity-60"
            )
              div(class="flex-1 min-w-0")
                div(class="text-sm font-medium text-gray-800 dark:text-gray-200") {{ topic.label }}
                div(v-if="topic.description" class="text-xs text-gray-500") {{ topic.description }}
              u-button(color="primary" variant="soft" @click="reactivateTopic(topic.id)") Активировать

    ui-box(title="Общие настройки")
      p(class="text-gray-500 dark:text-gray-400") Дополнительные настройки появятся здесь в будущем.
</template>
