<script setup lang="ts">
import { onMounted, ref, watch } from "vue"

import { deleteRagDocument, listRagDocuments } from "~/services/rag-upload"
import type { RagDocument } from "~/types/rag-upload"

const props = defineProps<{
  refreshTrigger?: number
}>()

const documents = ref<RagDocument[]>([])
const isLoading = ref(false)

const fetchDocuments = async () => {
  isLoading.value = true
  try {
    documents.value = await listRagDocuments()
  } catch (error) {
    console.error("Failed to fetch RAG documents", error)
  } finally {
    isLoading.value = false
  }
}

const handleDelete = async (docId: string) => {
  // eslint-disable-next-line no-alert
  if (confirm(`Вы уверены, что хотите удалить документ "${docId}"?`)) {
    try {
      await deleteRagDocument(docId)
      await fetchDocuments()
    } catch {
      // eslint-disable-next-line no-alert
      alert("Не удалось удалить документ")
    }
  }
}

onMounted(fetchDocuments)

watch(() => props.refreshTrigger, () => {
  fetchDocuments()
})

const formatDate = (dateStr?: string | null) => {
  if (!dateStr) {
    return "—"
  }
  try {
    return new Date(dateStr).toLocaleString("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  } catch {
    return dateStr
  }
}
</script>

<template lang="pug">
div
  div(v-if="isLoading" class="py-10 flex justify-center text-gray-500")
    u-icon(name="i-heroicons-arrow-path" class="animate-spin w-8 h-8")

  div(v-else-if="documents.length === 0" class="py-12 text-center text-gray-500 bg-gray-50 dark:bg-gray-800 rounded-lg border border-dashed border-gray-300 dark:border-gray-700")
    u-icon(name="i-heroicons-document-duplicate" class="w-12 h-12 mx-auto text-gray-400 mb-3")
    p База знаний пуста. Добавьте URL для сканирования выше.

  div(v-else class="overflow-x-auto")
    table(class="min-w-full divide-y divide-gray-200 dark:divide-gray-700")
      thead(class="bg-gray-50 dark:bg-gray-800")
        tr
          th(class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider") ID / Название
          th(class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider") Статус
          th(class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider") Символов
          th(class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider") Создан
          th(class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider") Действия
      tbody(class="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-800")
        tr(v-for="doc in documents" :key="doc.id" class="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors")
          td(class="px-4 py-4 whitespace-nowrap")
            div(class="text-sm font-medium text-gray-900 dark:text-white truncate max-w-xs" :title="doc.id") {{ doc.id }}
            div(v-if="doc.content_summary" class="text-xs text-gray-500 truncate max-w-xs") {{ doc.content_summary }}
          td(class="px-4 py-4 whitespace-nowrap")
            u-badge(:color="doc.status === 'success' || doc.status === 'indexed' ? 'green' : 'amber'" variant="subtle") {{ doc.status }}
          td(class="px-4 py-4 whitespace-nowrap text-sm text-gray-500") {{ doc.content_length || '—' }}
          td(class="px-4 py-4 whitespace-nowrap text-sm text-gray-500") {{ formatDate(doc.created_at) }}
          td(class="px-4 py-4 whitespace-nowrap text-right text-sm font-medium")
            u-button(
              icon="i-heroicons-trash"
              color="red"
              variant="ghost"
              size="xs"
              @click="handleDelete(doc.id)"
            )
</template>
