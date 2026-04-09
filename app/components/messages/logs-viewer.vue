<script setup lang="ts">
const props = defineProps<{
  sessionId: string
}>()

const apiBaseUrl = useRuntimeConfig().public.apiBaseUrl

const { data, status } = await useMyApi("/api/v1/logs/session/{session_id}", {
  baseURL: apiBaseUrl,
  path: {
    session_id: props.sessionId,
  },
  query: {
    limit: 100,
  },
})

const logs = computed(() => data.value?.logs ?? [])

const getLogTypeColor = (type: string) => {
  switch (type) {
    case "user_input": return "primary"
    case "rag_context": return "success"
    case "llm_response": return "secondary"
    case "faq_match": return "warning"
    default: return "neutral"
  }
}

const getLogTypeLabel = (type: string) => {
  switch (type) {
    case "user_input": return "Вопрос"
    case "rag_context": return "RAG Контекст"
    case "llm_response": return "LLM Ответ"
    case "faq_match": return "FAQ Совпадение"
    default: return type
  }
}

const formatDate = (dateString: string) => {
  const date = new Date(dateString)
  return date.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit", second: "2-digit" })
}
</script>

<template lang="pug">
div(class="flex flex-col h-full")
  div(v-if="status === 'pending'" class="flex flex-col items-center justify-center py-20 text-gray-500")
    u-icon(name="i-heroicons-arrow-path" class="animate-spin w-8 h-8 mb-4")
    p Загрузка логов...

  div(v-else-if="!logs || logs.length === 0" class="flex flex-col items-center justify-center py-20 text-gray-500")
    u-icon(name="i-heroicons-information-circle" class="w-12 h-12 mb-4 text-gray-300")
    p Логов для этой сессии не найдено.

  div(v-else class="flex-1 overflow-y-auto pr-2 custom-scrollbar")
    div(class="space-y-6 pb-6")
      div(v-for="log in logs" :key="log.id" class="relative pl-6 border-l-2" :class="`border-${getLogTypeColor(log.message_type)}-500` ")
        div(class="absolute -left-[9px] top-0 w-4 h-4 rounded-full border-2 bg-white dark:bg-gray-900" :class="`border-${getLogTypeColor(log.message_type)}-500` ")

        div(class="flex items-center gap-2 mb-2")
          u-badge(:color="getLogTypeColor(log.message_type)" variant="subtle" size="sm")
            | {{ getLogTypeLabel(log.message_type) }}
          span(class="text-xs text-gray-400 font-mono")
            | {{ formatDate(log.created_at) }}

        div(class="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 text-sm")
          div(class="whitespace-pre-wrap leading-relaxed text-gray-700 dark:text-gray-300 mb-3")
            | {{ log.content }}

          div(v-if="log.message_metadata && Object.keys(log.message_metadata).length > 0" class="mt-2")
            details(class="group border-t border-gray-200 dark:border-gray-700 pt-2 mt-2")
              summary(class="text-xs text-gray-500 cursor-pointer hover:text-gray-700 dark:hover:text-gray-300 transition-colors list-none flex items-center gap-1")
                u-icon(name="i-heroicons-chevron-right" class="w-3 h-3 transition-transform group-open:rotate-90")
                span Метаданные
              pre(class="mt-2 text-[10px] bg-black/5 dark:bg-black/20 p-2 rounded overflow-x-auto font-mono text-gray-600 dark:text-gray-400")
                | {{ JSON.stringify(log.message_metadata, null, 2) }}
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 4px;
}

.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}

.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #e2e8f0;
  border-radius: 10px;
}

.dark .custom-scrollbar::-webkit-scrollbar-thumb {
  background: #334155;
}
</style>
