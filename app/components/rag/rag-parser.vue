<script setup lang="ts">
import { storeToRefs } from "pinia"

import { confirmRagUpload, previewCsvDocuments } from "~/services/rag-upload"
import { useRagParserStore } from "~/stores/rag-parser"

const emit = defineEmits<{
  (e: "success"): void
}>()

const store = useRagParserStore()
const {
  indexingStats,
  isCsvUploading,
  isUploading,
  parsingStats,
  pendingItems,
  selectedIndices,
  url,
} = storeToRefs(store)

const selectedIndicesSet = computed(() => new Set(selectedIndices.value))
const selectedCount = computed(() => selectedIndices.value.length)

const editingIndex = ref<number | null>(null)
const isManualMode = ref(false)
const manualTitle = ref("")
const manualUrl = ref("")
const manualText = ref("")
const fileInput = useTemplateRef("fileInput")
const toast = useToast()

onMounted(() => {
  store.init()
})

const triggerCsvUpload = () => {
  fileInput.value?.click()
}

const handleCsvUpload = async (event: Event) => {
  const target = event.target as HTMLInputElement
  if (!target.files?.length) {
    return
  }
  const file = target.files[0]
  if (!file) {
    return
  }

  isCsvUploading.value = true
  try {
    const result = await previewCsvDocuments(file)
    toast.add({
      title: "CSV прочитан",
      description: `Найдено ссылок: ${result.total_found}. Начинаем загрузку и препроцессинг.`,
      color: "info",
    })

    store.addCsvItems(result.results)
  } catch (err: any) {
    toast.add({
      title: "Ошибка",
      description: err?.data?.detail || err.message || "Не удалось прочитать CSV",
      color: "error",
    })
  } finally {
    isCsvUploading.value = false
    target.value = ""
  }
}

const handleAdd = () => {
  const nextUrl = url.value.trim()
  if (!nextUrl) {
    return
  }

  url.value = ""
  store.addUrlItem(nextUrl)
}

const toggleSelection = (index: number) => {
  store.toggleSelection(index)
}

const toggleAll = () => {
  store.toggleAll()
}

const removeItem = (index: number) => {
  store.removeItem(index)
}

const handleConfirmUpload = async () => {
  const { successCount, totalCount } = await store.confirmSelectedUpload()
  if (totalCount === 0) {
    return
  }

  toast.add({
    title: "Готово",
    description: `Успешно загружено в RAG: ${successCount} из ${totalCount}`,
    color: successCount === totalCount ? "success" : "warning",
  })

  setTimeout(() => {
    store.cleanupIndexedItems()
    emit("success")
  }, 3000)
}

const resetManualForm = () => {
  isManualMode.value = false
  manualTitle.value = ""
  manualUrl.value = ""
  manualText.value = ""
}

const handleManualUpload = async () => {
  if (!manualTitle.value || !manualText.value) {
    return
  }

  isUploading.value = true
  try {
    await confirmRagUpload({
      title: manualTitle.value,
      url: manualUrl.value || "",
      text: manualText.value,
      documents: [],
    })
    toast.add({
      title: "Успех",
      description: "Данные успешно добавлены в RAG",
      color: "success",
    })
    resetManualForm()
    emit("success")
  } catch (err: any) {
    toast.add({
      title: "Ошибка",
      description: err?.data?.detail || "Ошибка при добавлении в RAG",
      color: "error",
    })
  } finally {
    isUploading.value = false
  }
}

const openEditor = (index: number) => {
  if (pendingItems.value[index]?.status !== "success" && pendingItems.value[index]?.status !== "error") {
    return
  }
  editingIndex.value = index
}

const closeEditor = () => {
  editingIndex.value = null
}

const currentEditingItem = computed(() => editingIndex.value !== null ? pendingItems.value[editingIndex.value] : null)
const editingTitle = computed({
  get: () => currentEditingItem.value?.title ?? "",
  set: (value: string) => {
    if (currentEditingItem.value) {
      currentEditingItem.value.title = value
    }
  },
})
const editingText = computed({
  get: () => currentEditingItem.value?.text ?? "",
  set: (value: string) => {
    if (currentEditingItem.value) {
      currentEditingItem.value.text = value
    }
  },
})
</script>

<template lang="pug">
div(class="space-y-6")
  // Main Logic View
  div(v-if="editingIndex === null" class="bg-white dark:bg-gray-900 p-6 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm space-y-4")
    // CSV Upload
    div(class="space-y-3 pb-4 border-b dark:border-gray-800")
      div(class="flex flex-wrap items-center justify-between gap-2")
        div(class="text-sm font-semibold text-gray-800 dark:text-gray-200") Импорт из CSV
        div(class="flex items-center gap-2")
          input(ref="fileInput" type="file" accept=".csv,text/csv" class="hidden" @change="handleCsvUpload")
          u-button(
            icon="i-heroicons-arrow-up-tray"
            color="neutral"
            variant="outline"
            :loading="isCsvUploading"
            @click="triggerCsvUpload"
          ) Открыть CSV

      p(class="text-xs text-gray-500") Формат CSV: Название, Link, Комментарий

    // URL Input
    u-form-field(label="Единичный URL" class="w-full")
      div(class="flex gap-2 w-full")
        u-input(
          v-model="url"
          class="flex-1"
          placeholder="http://nsu.ru/document1.pdf"
          icon="i-heroicons-globe-alt"
          @keyup.enter="handleAdd"
        )
        u-button(
          color="neutral"
          variant="outline"
          :disabled="!url"
          @click="handleAdd"
        ) Добавить

    div(class="pt-2")
      u-button(
        color="neutral"
        variant="outline"
        icon="i-heroicons-document-plus"
        @click="isManualMode = !isManualMode"
      ) {{ isManualMode ? "Скрыть ручное добавление" : "Добавить текст вручную" }}

    div(v-if="isManualMode" class="space-y-4 border-t pt-4 dark:border-gray-800")
      u-form-field(label="Название" class="w-full" required)
        u-input(
          v-model="manualTitle"
          class="w-full"
          placeholder="Введите название документа..."
        )

      u-form-field(label="Ссылка на источник (опционально)" class="w-full")
        u-input(
          v-model="manualUrl"
          class="w-full"
          placeholder="https://..."
          icon="i-heroicons-link"
        )

      u-form-field(label="Содержимое" class="w-full" required)
        u-textarea(
          v-model="manualText"
          autoresize
          :rows="8"
          class="w-full font-mono text-sm"
          placeholder="Скопируйте или напишите текст документа здесь..."
        )

      div(class="flex justify-end gap-3 pt-2")
        u-button(variant="ghost" color="neutral" @click="resetManualForm") Отмена
        u-button(
          color="primary"
          icon="i-heroicons-cloud-arrow-up"
          :loading="isUploading"
          :disabled="!manualTitle || !manualText || isUploading"
          @click="handleManualUpload"
        ) Добавить в базу знаний

    // Pending List
    div(v-if="pendingItems.length > 0" class="space-y-4 border-t pt-4 dark:border-gray-800")
      div(class="flex items-center justify-between")
        div(class="text-sm font-medium text-gray-500") Очередь документов ({{ pendingItems.length }})
        u-button(variant="ghost" size="xs" color="neutral" @click="toggleAll") {{ selectedCount === pendingItems.length ? 'Снять выделение' : 'Выделить все' }}

      // Parsing Progress Bar
      div(v-if="parsingStats.done < parsingStats.total" class="space-y-1 bg-gray-50 dark:bg-gray-800/50 p-3 rounded-lg border dark:border-gray-800")
        div(class="flex justify-between text-xs font-medium text-gray-600 dark:text-gray-300")
          span Препроцессинг LLM (идет параллельная загрузка)...
          span {{ parsingStats.done }} / {{ parsingStats.total }}
        u-progress(:value="parsingStats.done" :max="parsingStats.total" color="primary" size="sm")

      // Indexing Progress Bar
      div(v-if="indexingStats.total > 0 && indexingStats.done < indexingStats.total" class="space-y-1 bg-primary-50 dark:bg-primary-900/20 p-3 rounded-lg border border-primary-100 dark:border-primary-800/50")
        div(class="flex justify-between text-xs font-medium text-primary-700 dark:text-primary-300")
          span Загрузка обработанных документов в RAG...
          span {{ indexingStats.done }} / {{ indexingStats.total }}
        u-progress(:value="indexingStats.done" :max="indexingStats.total" color="primary" size="sm")

      div(class="space-y-2 max-h-[400px] overflow-y-auto pr-1")
        div(
          v-for="(item, index) in pendingItems"
          :key="index"
          class="flex flex-col gap-2 p-3 rounded-lg border dark:border-gray-800 transition-colors bg-gray-50 dark:bg-gray-800/50"
          :class="[selectedIndicesSet.has(index) ? 'border-l-2 border-l-primary-500 border-t-primary-100 border-r-primary-100 border-b-primary-100 dark:border-primary-800' : 'border-transparent']"
        )
          div(class="flex items-center gap-3")
            u-checkbox(
              :model-value="selectedIndicesSet.has(index)"
              :disabled="item.status === 'idle' || item.status === 'parsing' || item.status === 'indexing'"
              @update:model-value="toggleSelection(index)"
            )

            div(class="flex-1 min-w-0 flex items-center gap-2")
              // Status Icons mapping
              u-icon(v-if="item.status === 'idle'" name="i-heroicons-clock" size="lg" class="text-gray-400 shrink-0" title="Ожидает очереди")
              u-icon(v-else-if="item.status === 'parsing'" name="i-heroicons-arrow-path" size="lg" class="animate-spin text-primary-500 shrink-0" title="Препроцессинг")
              u-icon(v-else-if="item.status === 'success'" name="i-heroicons-check-circle" size="lg" class="text-success-500 shrink-0" title="Готово к загрузке")
              u-icon(v-else-if="item.status === 'error'" name="i-heroicons-exclamation-circle" size="lg" class="text-error-500 shrink-0" title="Ошибка")
              u-icon(v-else-if="item.status === 'indexing'" name="i-heroicons-arrow-path" size="lg" class="animate-spin text-warning-500 shrink-0" title="Загрузка в RAG")
              u-icon(v-else-if="item.status === 'indexed'" name="i-heroicons-check-badge" size="lg" class="text-success-600 shrink-0" title="В базе RAG")
              u-icon(v-else-if="item.status === 'index_error'" name="i-heroicons-x-circle" size="lg" class="text-error-600 shrink-0" title="Ошибка загрузки")

              div(class="min-w-0 flex-1")
                div(class="text-sm font-semibold truncate flex items-center gap-2")
                  | {{ item.title }}
                  span(v-if="item.status === 'success'" class="text-[10px] px-1.5 py-0.5 rounded bg-success-100 text-success-700 dark:bg-success-900/30 dark:text-success-400 font-normal shrink-0") Ожидает RAG
                  span(v-if="item.status === 'indexed'" class="text-[10px] px-1.5 py-0.5 rounded bg-success-50 text-success-600 dark:bg-success-900/10 dark:text-success-500 font-normal shrink-0") Загружено
                div(class="text-[10px] text-gray-500 truncate" :title="item.url") {{ item.url }}

            div(class="flex items-center gap-1 shrink-0")
              u-button(
                v-if="item.status === 'success' || item.status === 'error'"
                icon="i-heroicons-magnifying-glass"
                variant="ghost"
                size="lg"
                color="neutral"
                title="Посмотреть результат"
                @click="openEditor(index)"
              )
              u-button(
                icon="i-heroicons-trash"
                variant="ghost"
                size="lg"
                color="error"
                @click="removeItem(index)"
              )

          div(v-if="item.error" class="text-[11px] text-error-600 dark:text-error-400 font-medium")
            | {{ item.error }}

    // Action Button
    div(class="pt-4 border-t dark:border-gray-800 flex justify-end")
      u-button(
        color="primary"
        variant="solid"
        size="md"
        class="font-medium"
        :loading="isUploading"
        :disabled="selectedCount === 0 || isUploading"
        @click="handleConfirmUpload"
      ) Отправить выбранные в RAG

  // Editor View
  div(v-else class="bg-white dark:bg-gray-900 p-6 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm space-y-6 animate-in fade-in slide-in-from-right-4")
    div(class="flex items-center justify-between border-b pb-4 dark:border-gray-800")
      h3(class="text-lg font-semibold flex items-center gap-2")
        u-icon(name="i-heroicons-eye" class="text-primary-500")
        | Просмотр результата
      u-button(icon="i-heroicons-x-mark" color="neutral" variant="ghost" size="sm" @click="closeEditor")

    div(class="space-y-4")
      u-form-field(label="Название")
        u-input(v-model="editingTitle" class="w-full")

      u-form-field(label="Источник")
        u-input(:model-value="currentEditingItem?.url" disabled class="w-full")

      u-form-field(label="Предобработанный текст")
        u-textarea(
          v-model="editingText"
          autoresize
          :maxrows="25"
          :rows="14"
          class="w-full font-mono text-xs"
        )

      div(v-if="currentEditingItem?.error" class="p-3 bg-error-50 dark:bg-error-900/10 border border-error-100 dark:border-error-900/50 text-error-600 dark:text-error-400 rounded-md text-sm")
        span(class="font-semibold block mb-1") Ошибка препроцессинга:
        | {{ currentEditingItem.error }}

    div(class="flex justify-end gap-3 pt-4 border-t dark:border-gray-800")
      u-button(variant="ghost" color="neutral" @click="closeEditor") Назад к списку
</template>
