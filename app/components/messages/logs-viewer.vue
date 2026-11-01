<script setup lang="ts">
const props = defineProps<{
  sessionId: string
}>()

const { data, status, error, refresh } = useApi("/api/v1/logs/session/{session_id}", {
  path: {
    session_id: props.sessionId,
  },
  query: {
    limit: 100,
  },
})

const logs = computed(() => data.value?.logs ?? [])

const { topics, error: topicsError, refresh: refreshTopics } = useTopics()

onMounted(async () => {
  if (!topics.value.length) {
    await refreshTopics().catch(() => {})
  }
})

const getTopicLabel = (topicId?: number | null): string | null => {
  if (typeof topicId !== "number") {
    return null
  }
  const topic = topics.value.find(t => t.id === topicId)
  return topic ? topic.label : `Тема #${topicId}`
}

const getLogTypeLabel = (type: string) => {
  switch (type) {
    case "user_input": return "Вопрос"
    case "rag_context": return "Контекст базы знаний"
    case "llm_response": return "Ответ модели"
    case "faq_match": return "Совпадение с частыми вопросами"
    default: return type
  }
}

const formatDate = (dateString: string) => {
  const date = new Date(dateString)
  return date.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit", second: "2-digit" })
}
</script>

<template lang="pug">
div(class="min-w-0")
  p(class="admin-muted text-xs mb-5") Последние 100 записей сессии.
  p(v-if="topicsError" class="admin-muted text-xs mb-3" role="status") {{ topicsError }}. Названия тем могут быть устаревшими.
  ui-empty-state(v-if="status === 'pending'" kind="loading" title="Загрузка логов…")
  ui-empty-state(v-else-if="error" kind="error" title="Не удалось загрузить логи сессии")
    u-button(color="neutral" variant="outline" @click="() => refresh()") Повторить
  ui-empty-state(v-else-if="!logs.length" title="Логов сессии пока нет")
  div(v-else)
    article.session-log(v-for="log in logs" :key="log.id")
      header.session-log-heading
        h3(class="font-semibold text-sm") {{ getLogTypeLabel(log.message_type) }}
        span(v-if="getTopicLabel(log.topic_id)" class="admin-muted text-xs") {{ getTopicLabel(log.topic_id) }}
        time(:datetime="log.created_at") {{ formatDate(log.created_at) }}
      div.session-log-content {{ log.content }}
      details.modal-disclosure(v-if="log.message_metadata && Object.keys(log.message_metadata).length")
        summary Метаданные
        pre {{ JSON.stringify(log.message_metadata, null, 2) }}
</template>
