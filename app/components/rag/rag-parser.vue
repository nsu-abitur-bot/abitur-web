<script setup lang="ts">
import { confirmRagUpload, parsePageForRag } from "../../services/rag-upload"
import type { ParsedPageResult } from "../../types/rag-upload"

const emit = defineEmits<{
  (e: "success"): void
}>()

// URL Parsing State
const url = ref("")
const isParsing = ref(false)
const isUploading = ref(false)
const toast = useToast()

const parsedResult = ref<ParsedPageResult | null>(null)
const editableText = ref("")
const selectedDocumentsTitles = ref<Set<string>>(new Set())

const reset = () => {
  parsedResult.value = null
  url.value = ""
  isParsing.value = false
  isUploading.value = false
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
    toast.add({
      title: "Ошибка",
      description: "Не удалось спарсить страницу. Проверьте URL.",
      color: "error",
    })
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
  isUploading.value = true
  try {
    const finalDocuments = parsedResult.value.documents.filter((d: { title: string }) =>
      selectedDocumentsTitles.value.has(d.title),
    )
    await confirmRagUpload({
      title: parsedResult.value.title,
      url: parsedResult.value.url,
      text: editableText.value,
      documents: finalDocuments,
    })
    toast.add({
      title: "Успех",
      description: "Успешно загружено в RAG",
      color: "success",
    })
    reset()
    emit("success")
  } catch {
    toast.add({
      title: "Ошибка",
      description: "Ошибка при загрузке в RAG",
      color: "error",
    })
  } finally {
    isUploading.value = false
  }
}
</script>

<template lang="pug">
div(class="space-y-6")
  div(v-if="!parsedResult" class="bg-white dark:bg-gray-900 p-6 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm")
    u-form-field(label="Ссылка на страницу для анализа" class="w-full")
      div(class="flex gap-2 w-full")
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

    div(class="grid grid-cols-1 gap-6")
      // Text Editor
      u-form-field(label="Извлеченный и очищенный текст" class="w-full")
        u-textarea(
          v-model="editableText"
          autoresize
          :rows="12"
          class="w-full font-mono text-sm"
          placeholder="Текст страницы..."
        )

      // Documents List
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
        :loading="isUploading"
        @click="handleConfirmUpload"
      ) Подтвердить и загрузить
</template>
