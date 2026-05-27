<script setup lang="ts">
import {
  checkRagDocuments,
  clearRagCache,
  deleteRagDocuments,
  listRagDocuments,
  updateChangedRagDocuments,
} from "~/services/rag-upload"
import type { DocumentCheckResult, RagDocument } from "~/types/rag-upload"

const props = defineProps<{
  refreshTrigger?: number
}>()

const documents = ref<RagDocument[]>([])
const isLoading = ref(false)
const isChecking = ref(false)
const isUpdating = ref(false)
const selectedIds = ref<Set<string>>(new Set())
const checkResults = ref<DocumentCheckResult[]>([])
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

const selectedIdsList = computed(() => [...selectedIds.value])
const selectedIdsForRequest = computed(() => selectedIdsList.value.length ? selectedIdsList.value : undefined)

const handleCheckDocuments = async () => {
  isChecking.value = true
  try {
    const result = await checkRagDocuments(selectedIdsForRequest.value)
    checkResults.value = result.results
    toast.add({
      title: "Проверка завершена",
      description: `Проверено: ${result.checked_count}. Изменено: ${result.changed_count}.`,
      color: result.changed_count > 0 ? "warning" : "success",
    })
  } catch {
    toast.add({ title: "Ошибка", description: "Не удалось проверить документы", color: "error" })
  } finally {
    isChecking.value = false
  }
}

const handleUpdateChanged = async () => {
  isUpdating.value = true
  try {
    const result = await updateChangedRagDocuments(selectedIdsForRequest.value)
    checkResults.value = result.results
    toast.add({
      title: "Обновление завершено",
      description: `Проверено: ${result.checked_count}. Обновлено: ${result.updated_count}.`,
      color: "success",
    })
    await fetchDocuments()
  } catch {
    toast.add({ title: "Ошибка", description: "Не удалось обновить документы", color: "error" })
  } finally {
    isUpdating.value = false
  }
}

const isClearingCache = ref(false)

const handleClearCache = async () => {
  isClearingCache.value = true
  try {
    await clearRagCache()
    toast.add({ title: "Готово", description: "Кэш ответов RAG очищен", color: "success" })
  } catch {
    toast.add({ title: "Ошибка", description: "Не удалось очистить кэш", color: "error" })
  } finally {
    isClearingCache.value = false
  }
}

const getDocCheckStatus = (doc: RagDocument) => {
  return checkResults.value.find(result => result.id === doc.id)?.status ?? null
}

const getDocCheckMessage = (doc: RagDocument) => {
  return checkResults.value.find(result => result.id === doc.id)?.message ?? null
}

const getDocCheckDisplayMessage = (doc: RagDocument) => {
  const message = getDocCheckMessage(doc)
  if (!message) {
    return null
  }

  if (getDocCheckStatus(doc) !== "failed") {
    return message
  }

  const lowerMessage = message.toLowerCase()
  if (
    lowerMessage.includes("404")
    || lowerMessage.includes("not found")
    || lowerMessage.includes("не найден")
    || lowerMessage.includes("no such")
  ) {
    return "Источник не найден"
  }

  return "Не удалось проверить источник"
}

const getDocCheckClass = (doc: RagDocument) => {
  switch (getDocCheckStatus(doc)) {
    case "changed":
      return "bg-warning-50/70 dark:bg-warning-950/20"
    case "failed":
      return "bg-error-50/70 dark:bg-error-950/20"
    default:
      return ""
  }
}

const getDocCheckMessageClass = (doc: RagDocument) => {
  switch (getDocCheckStatus(doc)) {
    case "failed":
      return "text-error-600 dark:text-error-400"
    case "changed":
      return "text-warning-600 dark:text-warning-400"
    default:
      return "text-gray-500 dark:text-gray-400"
  }
}

const decodeUrlPart = (value: string) => {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

const shortenText = (value: string, maxLength = 86) => {
  return value.length > maxLength ? `${value.slice(0, maxLength - 1)}...` : value
}

const getDocTitle = (doc: RagDocument) => doc.title || doc.url || doc.id

const getDocUrlLabel = (doc: RagDocument) => {
  if (!doc.url) {
    return "Ссылка не указана"
  }

  try {
    const url = new URL(doc.url)
    const filename = decodeUrlPart(url.pathname.split("/").filter(Boolean).at(-1) || "")
    return filename ? `${url.hostname}/${shortenText(filename)}` : url.hostname
  } catch {
    return shortenText(decodeUrlPart(doc.url))
  }
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
        :loading="isChecking"
        @click="handleCheckDocuments"
      ) Проверить

      u-button(
        variant="outline"
        color="neutral"
        size="sm"
        :loading="isUpdating"
        @click="handleUpdateChanged"
      ) Обновить измененные

      u-modal(
        title="Удалить документы"
        :description="`Удалить выбранные документы (${selectedIds.size})?`"
      )
        u-button(
          variant="outline"
          color="neutral"
          size="sm"
          :disabled="selectedIds.size === 0"
        ) Удалить

        template(#footer="{ close }")
          div(class="flex justify-end gap-2 w-full")
            u-button(color="neutral" variant="ghost" @click="close") Отмена
            u-button(color="error" @click="handleBatchDelete(); close()") Удалить

    div(class="flex items-center gap-2")
      u-modal(
        title="Очистить кэш RAG"
        description="Это удалит сохранённые ответы LLM. Агент перестанет отдавать устаревшие ответы по обновлённым данным."
      )
        u-button(
          variant="outline"
          color="neutral"
          size="sm"
          :loading="isClearingCache"
        ) Очистить кэш

        template(#footer="{ close }")
          div(class="flex justify-end gap-2 w-full")
            u-button(color="neutral" variant="ghost" @click="close") Отмена
            u-button(color="primary" @click="handleClearCache(); close()") Очистить

  // Table
  div(v-if="isLoading && documents.length === 0" class="py-10 flex justify-center text-gray-500")
    u-icon(name="i-heroicons-arrow-path" class="animate-spin w-8 h-8")

  div(v-else-if="documents.length === 0" class="py-12 text-center text-gray-500 bg-gray-50 dark:bg-gray-800 rounded-lg border border-dashed border-gray-300 dark:border-gray-700")
    u-icon(name="i-heroicons-document-duplicate" class="w-12 h-12 mx-auto text-gray-400 mb-3")
    p База знаний пуста. Добавьте URL выше.

  div(v-else class="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden shadow-sm")
    div
      table(class="w-full divide-y divide-gray-200 dark:divide-gray-700")
        tbody(class="divide-y divide-gray-100 dark:divide-gray-800")
          tr(
            v-for="doc in documents"
            :key="doc.id"
            class="group hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
            :class="[getDocCheckClass(doc), { 'bg-primary-50/30 dark:bg-primary-900/5': selectedIds.has(doc.id) }]"
          )
            // Checkbox Column
            td(class="pl-4 py-4 w-10")
              u-checkbox(
                :model-value="selectedIds.has(doc.id)"
                @update:model-value="toggleSelection(doc.id)"
              )

            // Content Column
            td(class="px-4 py-4")
              div(class="flex flex-col gap-1 min-w-0")
                div(class="flex items-start gap-2 flex-wrap")
                  span(class="text-sm font-semibold break-words text-gray-900 dark:text-white" :title="getDocTitle(doc)")
                    | {{ getDocTitle(doc) }}
                div(
                  v-if="getDocCheckDisplayMessage(doc) && getDocCheckStatus(doc) !== 'unchanged'"
                  class="text-[11px] truncate"
                  :class="getDocCheckMessageClass(doc)"
                  :title="getDocCheckMessage(doc) || undefined"
                )
                  | {{ getDocCheckDisplayMessage(doc) }}
                div(class="text-[11px] text-gray-500 min-w-0")
                  a(:href="doc.url || undefined" target="_blank" class="hover:underline hover:text-primary-600 flex items-start gap-1")
                    u-icon(name="i-heroicons-link" size="lg" class="shrink-0 mt-0.5")
                    span(class="truncate" :title="doc.url || undefined") {{ getDocUrlLabel(doc) }}
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
                size="lg"
                :to="`/rag/document/${encodeURIComponent(doc.id)}`"
                title="Просмотреть"
              )
</template>
