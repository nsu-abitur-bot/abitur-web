<script setup lang="ts">
import type { Topic, TopicCreate, TopicUpdate } from "~/services/topics"
import { createTopic, deleteTopic, listTopics, updateTopic } from "~/services/topics"

const topics = ref<Topic[]>([])
const isLoading = ref(false)
const loadError = ref(false)
async function refresh() {
  isLoading.value = true
  try {
    topics.value = await listTopics()
    loadError.value = false
  } finally {
    isLoading.value = false
  }
}
async function create(payload: TopicCreate) {
  const topic = await createTopic(payload)
  topics.value.push(topic)
}
async function update(id: number, payload: TopicUpdate) {
  const topic = await updateTopic(id, payload)
  topics.value = topics.value.map(item => item.id === id ? topic : item)
}
async function remove(id: number) {
  await deleteTopic(id)
  topics.value = topics.value.map(item => item.id === id ? { ...item, is_active: false } : item)
}

const newTopicLabel = ref("")
const newTopicDescription = ref("")
const toast = useToast()

try {
  await refresh()
} catch {
  loadError.value = true
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
section(class="admin-panel p-6")
  h2(class="text-base font-semibold mb-2") Темы для классификации
  p(class="text-sm admin-muted mb-4")
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

  ui-empty-state(v-if="isLoading && !topics.length" kind="loading" title="Загрузка тем…")
  ui-empty-state(v-else-if="loadError" kind="error" title="Не удалось загрузить темы")
    u-button(color="neutral" variant="outline" @click="refresh().then(() => loadError = false).catch(() => loadError = true)") Повторить
  ui-empty-state(v-else-if="!topics.length" title="Тем пока нет")

  div(v-else class="space-y-2")
    ui-empty-state(v-if="!activeTopics.length" title="Активных тем пока нет")
    settings-topic-item(
      v-for="topic in activeTopics"
      :key="topic.id"
      :topic="topic"
      @save="saveTopic"
      @remove="deactivateTopic"
    )

    details(v-if="inactiveTopics.length" class="mt-4")
      summary(class="text-sm admin-muted cursor-pointer select-none")
        | Деактивированные темы ({{ inactiveTopics.length }})
      div(class="space-y-2 mt-3")
        div(
          v-for="topic in inactiveTopics"
          :key="topic.id"
          class="flex flex-wrap items-center gap-3 rounded-lg border border-gray-200 dark:border-gray-800 p-3 opacity-60"
        )
          div(class="flex-1 min-w-0")
            div(class="text-sm font-medium text-gray-800 dark:text-gray-200") {{ topic.label }}
            div(v-if="topic.description" class="text-xs admin-muted") {{ topic.description }}
          u-button(color="primary" variant="soft" @click="reactivateTopic(topic.id)") Активировать
</template>
