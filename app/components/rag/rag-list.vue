<script setup lang="ts">
import { deleteRagDocuments, listRagDocuments, rebuildRagIndices, refreshRagDocument } from "~/services/rag-upload"
import type { RagDocument } from "~/types/rag-upload"

const props = defineProps<{
  refreshTrigger?: number
}>()

const documents = ref<RagDocument[]>([])
const isLoading = ref(false)
const selectedIds = ref<Set<string>>(new Set())
const toast = useToast()

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

onMounted(fetchDocuments)

watch(() => props.refreshTrigger, () => {
  fetchDocuments()
})

const formatDate = (dateStr?: string | null) => {
  if (!dateStr) {
    return "—"
  }
  try {
    const date = new Date(dateStr)
    return date.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "2-digit" })
  } catch {
    return dateStr
  }
}

// --- Selection Logic ---
const isAllSelected = computed(() => documents.value.length > 0 && selectedIds.value.size === documents.value.length)

const toggleSelectAll = () => {
  if (isAllSelected.value) {
    selectedIds.value.clear()
  } else {
    selectedIds.value = new Set(documents.value.map(d => d.id))
  }
}

const toggleSelection = (id: string) => {
  if (selectedIds.value.has(id)) {
    selectedIds.value.delete(id)
  } else {
    selectedIds.value.add(id)
  }
}

// --- Actions ---
const handleBatchDelete = async () => {
  if (selectedIds.value.size === 0) {
    return
  }
  // eslint-disable-next-line no-alert
  if (!confirm(`Удалить выбранные документы (${selectedIds.value.size})?`)) {
    return
  }

  isLoading.value = true
  try {
    await deleteRagDocuments([...selectedIds.value])
    toast.add({ title: "Удалено", description: "Документы успешно удалены", color: "success" })
    selectedIds.value.clear()
    await fetchDocuments()
  } catch {
    toast.add({ title: "Ошибка", description: "Не удалось удалить документы", color: "error" })
  } finally {
    isLoading.value = false
  }
}

const handleBatchRefresh = async () => {
  if (selectedIds.value.size === 0) {
    return
  }
  toast.add({ title: "Обновление", description: "Запрос на обновление отправлен", color: "neutral" })
  // In reality, this might open an editor for each or just trigger background refresh
  for (const id of selectedIds.value) {
    await refreshRagDocument(id)
  }
}

const handleRebuild = async () => {
  // eslint-disable-next-line no-alert
  if (!confirm("Вы уверены, что хотите полностью перестроить индексы? Это может занять время.")) {
    return
  }
  isLoading.value = true
  try {
    await rebuildRagIndices()
    toast.add({ title: "Запущено", description: "Перестройка индексов началась", color: "success" })
  } finally {
    isLoading.value = false
  }
}

// Mock extra status for demonstration (matching mockup)
const getDocStatusExtra = (doc: RagDocument) => {
  if (doc.id.includes("document2")) {
    return "удален"
  }
  if (doc.id.includes("document1")) {
    return "устарел (26.04.24)"
  }
  return null
}
</script>

<template lang="pug">
div(class="space-y-4")
  // Toolbar Panel
  div(class="flex items-center justify-between bg-gray-50 dark:bg-gray-800/50 p-3 rounded-lg border dark:border-gray-800")
    div(class="flex items-center gap-2")
      u-button(
        variant="outline"
        color="neutral"
        size="sm"
        @click="toggleSelectAll"
      ) Выделить все

      u-button(
        variant="outline"
        color="neutral"
        size="sm"
        :disabled="selectedIds.size === 0"
        @click="handleBatchRefresh"
      ) Обновить

      u-button(
        variant="outline"
        color="neutral"
        size="sm"
        :disabled="selectedIds.size === 0"
        @click="handleBatchDelete"
      ) Удалить

    div
      u-button(
        variant="solid"
        color="neutral"
        size="sm"
        @click="handleRebuild"
      ) Перестроить индексы

  // Table
  div(v-if="isLoading && documents.length === 0" class="py-10 flex justify-center text-gray-500")
    u-icon(name="i-heroicons-arrow-path" class="animate-spin w-8 h-8")

  div(v-else-if="documents.length === 0" class="py-12 text-center text-gray-500 bg-gray-50 dark:bg-gray-800 rounded-lg border border-dashed border-gray-300 dark:border-gray-700")
    u-icon(name="i-heroicons-document-duplicate" class="w-12 h-12 mx-auto text-gray-400 mb-3")
    p База знаний пуста. Добавьте URL выше.

  div(v-else class="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden shadow-sm")
    div(class="overflow-x-auto")
      table(class="min-w-full divide-y divide-gray-200 dark:divide-gray-700")
        tbody(class="divide-y divide-gray-100 dark:divide-gray-800")
          tr(
            v-for="doc in documents"
            :key="doc.id"
            class="group hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
            :class="{ 'bg-primary-50/30 dark:bg-primary-900/5': selectedIds.has(doc.id) }"
          )
            // Checkbox Column
            td(class="pl-4 py-4 w-10")
              u-checkbox(
                :model-value="selectedIds.has(doc.id)"
                @update:model-value="toggleSelection(doc.id)"
              )

            // Content Column
            td(class="px-4 py-4 min-w-[300px]")
              div(class="flex flex-col gap-0.5")
                div(class="flex items-center gap-2")
                  span(class="text-sm font-semibold truncate text-gray-900 dark:text-white" :title="doc.id") {{ doc.id }}
                  div(v-if="getDocStatusExtra(doc)" class="text-[10px] text-error-500 font-medium") — {{ getDocStatusExtra(doc) }}
                div(class="text-[11px] text-gray-500 truncate max-w-lg")
                  a(:href="doc.url" target="_blank" class="hover:underline hover:text-primary-600 flex items-center gap-1")
                    u-icon(name="i-heroicons-link" class="w-3 h-3")
                    | {{ doc.id }}
                div(v-if="doc.content_summary" class="text-[10px] text-gray-400 italic mt-1 line-clamp-1") {{ doc.content_summary }}

            // Meta/Status Column
            td(class="px-4 py-4 whitespace-nowrap text-right")
              div(class="flex flex-col items-end gap-1 px-4")
                div(class="text-[11px] font-medium text-gray-500") ({{ formatDate(doc.created_at) }})
                u-badge(
                  v-if="doc.status !== 'indexed'"
                  :color="doc.status === 'success' ? 'success' : 'warning'"
                  variant="subtle"
                  size="sm"
                ) {{ doc.status }}

            // Actions Column
            td(class="pr-4 py-4 whitespace-nowrap text-right w-20")
              u-button(
                icon="i-heroicons-eye"
                variant="ghost"
                color="neutral"
                size="md"
                :to="`/rag/document/${encodeURIComponent(doc.id)}`"
                title="Просмотреть"
              )
</template>
