<script setup lang="ts">
import { computed, ref } from "vue"

import { confirmRagUpload, parsePageForRag, uploadRagDocuments } from "../../services/rag-upload"
import type {
  ParsedPageResult,
  RagUploadResponse,
  RagUploadState,
  RejectedRagFile,
} from "../../types/rag-upload"
import {
  formatBytes,
  getUploadStateFromResponse,
  mapRagUploadError,
  validateRagFiles,
} from "../../utils/rag-upload"

const emit = defineEmits<{
  (e: "success"): void
}>()

// URL Parsing State
const url = ref("")
const isParsing = ref(false)
const parsedResult = ref<ParsedPageResult | null>(null)
const editableText = ref("")
const selectedDocumentsTitles = ref<Set<string>>(new Set())

// File Upload State
const pickedFiles = ref<File[] | null>(null)
const selectedFiles = ref<File[]>([])
const rejectedFiles = ref<RejectedRagFile[]>([])
const uploadState = ref<RagUploadState>("idle")
const uploadError = ref("")
const uploadResponse = ref<RagUploadResponse | null>(null)

const tabs = [
  { label: "Загрузить файлы", icon: "i-heroicons-document-arrow-up", slot: "files" },
  { label: "Добавить по URL", icon: "i-heroicons-link", slot: "url" },
]

const stateAlert = computed(() => {
  if (uploadState.value === "uploading") {
    return {
      color: "neutral" as const,
      title: "Загрузка документов",
      description: "Файлы отправляются на индексацию в RAG.",
    }
  }

  if (uploadState.value === "success") {
    return {
      color: "success" as const,
      title: "Загрузка завершена успешно",
      description: uploadResponse.value
        ? `Индексировано: ${uploadResponse.value.indexed_count}. Пропущено: ${uploadResponse.value.skipped_count}.`
        : "",
    }
  }

  if (uploadState.value === "partial") {
    return {
      color: "warning" as const,
      title: "Загрузка завершена частично",
      description: uploadResponse.value
        ? `Индексировано: ${uploadResponse.value.indexed_count}. Пропущено: ${uploadResponse.value.skipped_count}.`
        : "",
    }
  }

  if (uploadState.value === "error") {
    return {
      color: "error" as const,
      title: "Ошибка загрузки",
      description: uploadError.value,
    }
  }

  return null
})

const reset = () => {
  parsedResult.value = null
  url.value = ""
  selectedFiles.value = []
  rejectedFiles.value = []
  pickedFiles.value = null
  uploadState.value = "idle"
  uploadResponse.value = null
}

// --- URL Parsing Logic ---
const handleParse = async () => {
  if (!url.value) {
    return
  }
  isParsing.value = true
  parsedResult.value = null
  try {
    const res = await parsePageForRag(url.value)
    parsedResult.value = res
    editableText.value = res.text
    selectedDocumentsTitles.value = new Set(res.documents.map((d: { title: string }) => d.title))
  } catch {
    // eslint-disable-next-line no-alert
    alert("Не удалось спарсить страницу. Проверьте URL.")
  } finally {
    isParsing.value = false
  }
}

const toggleDocument = (title: string) => {
  if (selectedDocumentsTitles.value.has(title)) {
    selectedDocumentsTitles.value.delete(title)
  } else {
    selectedDocumentsTitles.value.add(title)
  }
}

const handleConfirmUpload = async () => {
  if (!parsedResult.value) {
    return
  }
  uploadState.value = "uploading"
  try {
    const finalDocuments = parsedResult.value.documents.filter((d: { title: string }) =>
      selectedDocumentsTitles.value.has(d.title),
    )
    await confirmRagUpload({
      text: editableText.value,
      documents: finalDocuments,
    })
    // eslint-disable-next-line no-alert
    alert("Успешно загружено в RAG")
    reset()
    emit("success")
  } catch {
    // eslint-disable-next-line no-alert
    alert("Ошибка при загрузке в RAG")
  } finally {
    uploadState.value = "idle"
  }
}

// --- File Upload Logic ---
function dedupeFiles(files: File[]): File[] {
  const uniqueMap = new Map<string, File>()
  for (const file of files) {
    const key = `${file.name}:${file.size}:${file.lastModified}`
    uniqueMap.set(key, file)
  }
  return [...uniqueMap.values()]
}

function handleFileChange(value: File[] | null | undefined) {
  if (!value) {
    selectedFiles.value = []
    rejectedFiles.value = []
    return
  }
  const deduped = dedupeFiles(value)
  const validation = validateRagFiles(deduped)
  selectedFiles.value = validation.validFiles
  rejectedFiles.value = validation.rejectedFiles
}

async function submitFilesUpload() {
  if (selectedFiles.value.length === 0) {
    return
  }
  uploadState.value = "uploading"
  uploadError.value = ""
  uploadResponse.value = null

  try {
    const res = await uploadRagDocuments({ files: selectedFiles.value })
    uploadResponse.value = res
    uploadState.value = getUploadStateFromResponse(res)
    if (uploadState.value === "success" || uploadState.value === "partial") {
      selectedFiles.value = []
      pickedFiles.value = null
      emit("success")
    }
  } catch (error) {
    uploadState.value = "error"
    uploadError.value = mapRagUploadError(error)
  }
}
</script>

<template lang="pug">
div(class="space-y-6")
  // Ingestion Methods (Files or URL)
  div(v-if="!parsedResult" class="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden")
    u-tabs(:items="tabs" class="w-full")
      template(#files)
        div(class="p-6 space-y-4")
          u-file-upload(
            v-model="pickedFiles"
            multiple
            :disabled="uploadState === 'uploading'"
            accept=".txt,.md,.markdown,.json,.csv,.html,.htm,.pdf"
            @update:model-value="handleFileChange"
          )

          p(class="text-xs text-gray-500")
            | Поддерживаемые форматы: .txt, .md, .markdown, .json, .csv, .html, .htm, .pdf. Максимум 10 MB на файл.

          div(v-if="selectedFiles.length > 0" class="rounded-lg border border-gray-200 dark:border-gray-800")
            div(class="px-3 py-2 text-sm font-medium border-b dark:border-gray-800") Выбрано к отправке ({{ selectedFiles.length }})
            ul(class="divide-y divide-gray-200 dark:divide-gray-800 max-h-40 overflow-y-auto")
              li(v-for="file in selectedFiles" :key="`${file.name}:${file.lastModified}`" class="flex items-center justify-between px-3 py-2 text-sm")
                span(class="truncate max-w-[200px]") {{ file.name }}
                span(class="text-gray-500 text-xs") {{ formatBytes(file.size) }}

          div(v-if="rejectedFiles.length > 0" class="rounded-lg border border-red-200 dark:border-red-900 bg-red-50/50 dark:bg-red-900/10")
            div(class="px-3 py-2 text-sm font-medium text-red-600 dark:text-red-400 border-b border-red-200 dark:border-red-900") Заблокировано ({{ rejectedFiles.length }})
            ul(class="divide-y divide-red-100 dark:divide-red-900/30")
              li(v-for="item in rejectedFiles" :key="`${item.file.name}:${item.file.lastModified}`" class="px-3 py-2 text-xs")
                p(class="font-medium truncate") {{ item.file.name }}
                p(class="text-red-500") {{ item.reason }}

          u-alert(
            v-if="stateAlert"
            :color="stateAlert.color"
            :title="stateAlert.title"
            :description="stateAlert.description"
            variant="subtle"
          )

          div(class="flex justify-end")
            u-button(
              color="primary"
              icon="i-heroicons-cloud-arrow-up"
              :loading="uploadState === 'uploading'"
              :disabled="selectedFiles.length === 0"
              @click="submitFilesUpload"
            ) Загрузить в RAG

      template(#url)
        div(class="p-6 flex flex-col gap-4")
          div(class="flex flex-col gap-2")
            label(class="text-sm font-medium text-gray-700 dark:text-gray-300") Ссылка на страницу для анализа
            div(class="flex gap-2")
              u-input(
                v-model="url"
                class="flex-1"
                placeholder="https://nsu.ru/..."
                icon="i-heroicons-globe-alt"
                :disabled="isParsing"
                @keyup.enter="handleParse"
              )
              u-button(
                :loading="isParsing"
                :disabled="!url || isParsing"
                @click="handleParse"
              ) Спарсить

  // Refinement View (Visible after URL parse)
  div(v-else class="bg-white dark:bg-gray-900 p-6 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm space-y-6 animate-in fade-in slide-in-from-bottom-2")
    div(class="flex items-center justify-between border-b pb-4 dark:border-gray-800")
      h3(class="text-lg font-semibold flex items-center gap-2")
        u-icon(name="i-heroicons-sparkles" class="text-amber-500")
        | Результаты парсинга страницы
      u-button(icon="i-heroicons-x-mark" color="neutral" variant="ghost" size="sm" @click="reset")

    div(class="grid grid-cols-1 lg:grid-cols-3 gap-6")
      // Left: Text Editor
      div(class="lg:col-span-2 space-y-2")
        label(class="text-sm font-medium text-gray-700 dark:text-gray-300") Извлеченный и очищенный текст
        u-textarea(
          v-model="editableText"
          autoresize
          :rows="12"
          class="font-mono text-sm"
          placeholder="Текст страницы..."
        )

      // Right: Documents List
      div(class="space-y-4")
        label(class="text-sm font-medium text-gray-700 dark:text-gray-300") Найденные PDF ({{ parsedResult.documents.length }})
        div(v-if="parsedResult.documents.length === 0" class="text-xs text-gray-500 italic p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-dashed")
          | PDF документов не найдено.

        div(v-else class="space-y-2 max-h-[350px] overflow-y-auto pr-2")
          div(
            v-for="doc in parsedResult.documents"
            :key="doc.title"
            class="group p-3 rounded-lg border dark:border-gray-800 flex items-start gap-2 transition-all"
            :class="selectedDocumentsTitles.has(doc.title) ? 'bg-indigo-50/50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800' : 'bg-gray-50 dark:bg-gray-800/50 grayscale opacity-60 border-transparent'"
          )
            u-checkbox(
              class="mt-1"
              :model-value="selectedDocumentsTitles.has(doc.title)"
              @update:model-value="toggleDocument(doc.title)"
            )
            div(class="flex-1 min-w-0")
              div(class="text-xs font-semibold truncate" :class="selectedDocumentsTitles.has(doc.title) ? 'text-indigo-700 dark:text-indigo-300' : 'text-gray-600 dark:text-gray-400'") {{ doc.title }}
              div(class="flex gap-2 mt-1")
                a(
                  :href="doc.url"
                  target="_blank"
                  class="text-[10px] text-gray-500 hover:text-indigo-600 dark:hover:text-indigo-400 flex items-center gap-1 hover:underline"
                )
                  u-icon(name="i-heroicons-arrow-down-tray" class="w-3 h-3")
                  | Скачать документ

    div(class="flex justify-end gap-3 pt-4 border-t dark:border-gray-800")
      u-button(variant="ghost" color="neutral" @click="reset") Отмена
      u-button(
        color="primary"
        icon="i-heroicons-cloud-arrow-up"
        :loading="uploadState === 'uploading'"
        @click="handleConfirmUpload"
      ) Подтвердить и загрузить
</template>
