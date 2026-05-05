<script setup lang="ts">
const { topics } = useStatsSettings()

const newTopicLabel = ref("")

const makeTopicId = () => {
  if (globalThis.crypto?.randomUUID) {
    return `topic-${globalThis.crypto.randomUUID()}`
  }

  return `topic-${Date.now()}-${Math.round(Math.random() * 1000)}`
}

const addTopic = () => {
  const label = newTopicLabel.value.trim()
  if (!label) {
    return
  }

  topics.value = [
    ...topics.value,
    { id: makeTopicId(), label },
  ]

  newTopicLabel.value = ""
}

const removeTopic = (id: string) => {
  topics.value = topics.value.filter(topic => topic.id !== id)
}
</script>

<template lang="pug">
div(class="py-8 w-full space-y-6")
  h1(class="text-3xl font-bold text-gray-900 dark:text-white") Настройки системы

  admin-invite
  admin-list

  div(class="w-full space-y-6")
    ui-box(title="Темы для классификации")
      p(class="text-sm text-gray-500 dark:text-gray-400 mb-4") Эти темы используются в разделе статистики.

      div(class="flex flex-wrap items-end gap-3 mb-4")
        u-form-group(label="Новая тема" class="w-full sm:w-auto flex-1")
          u-input(
            v-model="newTopicLabel"
            placeholder="Например: Общежитие"
            class="w-full"
            @keydown.enter.prevent="addTopic"
          )
        u-button(color="primary" class="h-10" @click="addTopic") Добавить

      div(v-if="topics.length" class="space-y-2")
        div(
          v-for="topic in topics"
          :key="topic.id"
          class="flex flex-wrap items-center gap-3 rounded-lg border border-gray-200 dark:border-gray-800 p-3"
        )
          u-input(v-model="topic.label" class="flex-1" placeholder="Название темы")
          u-button(color="neutral" variant="soft" @click="removeTopic(topic.id)") Удалить

      p(v-else class="text-sm text-gray-500 dark:text-gray-400") Темы пока не добавлены.

    ui-box(title="Общие настройки")
      p(class="text-gray-500 dark:text-gray-400") Дополнительные настройки появятся здесь в будущем.
</template>
