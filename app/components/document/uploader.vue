<script setup lang="ts">
import { uploadRagDocuments } from "~/services/rag-upload"
import type { RagUploadResponse, RagUploadState, RejectedRagFile } from "~/types/rag-upload"
import {
  formatBytes,
  getUploadStateFromResponse,
  mapRagUploadError,
  validateRagFiles,
} from "~/utils/rag-upload"

const emit = defineEmits<{
  uploaded: [payload: { response: RagUploadResponse, state: Exclude<RagUploadState, "idle" | "uploading" | "error"> }]
}>()

const items = [
  {
    label: "Загрузить файл",
    icon: "lucide:file-up",
    slot: "file",
  },
  {
    label: "Добавить по URL",
    icon: "lucide:link",
    slot: "url",
  },
]

const state = reactive({
  url: "",
})

const pickedFiles = ref<File[] | null>(null)
const selectedFiles = ref<File[]>([])
const rejectedFiles = ref<RejectedRagFile[]>([])
const uploadState = ref<RagUploadState>("idle")
const uploadError = ref("")
const response = ref<RagUploadResponse | null>(null)

const validFilesCount = computed(() => selectedFiles.value.length)
const canUpload = computed(() => validFilesCount.value > 0 && uploadState.value !== "uploading")

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
      description: response.value
        ? `Индексировано: ${response.value.indexed_count}. Пропущено: ${response.value.skipped_count}.`
        : "",
    }
  }

  if (uploadState.value === "partial") {
    return {
      color: "warning" as const,
      title: "Загрузка завершена частично",
      description: response.value
        ? `Индексировано: ${response.value.indexed_count}. Пропущено: ${response.value.skipped_count}.`
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

function dedupeFiles(files: File[]): File[] {
  const uniqueMap = new Map<string, File>()

  for (const file of files) {
    const key = `${file.name}:${file.size}:${file.lastModified}`
    uniqueMap.set(key, file)
  }

  return [...uniqueMap.values()]
}

function setFiles(files: File[]) {
  const deduped = dedupeFiles(files)
  const validation = validateRagFiles(deduped)

  selectedFiles.value = validation.validFiles
  rejectedFiles.value = validation.rejectedFiles
}

function handleFileChange(value: File[] | null | undefined) {
  if (!value) {
    setFiles([])
    return
  }

  setFiles(value)
}

async function submitUpload() {
  if (!canUpload.value) {
    return
  }

  uploadState.value = "uploading"
  uploadError.value = ""
  response.value = null

  try {
    const uploadResponse = await uploadRagDocuments({
      files: selectedFiles.value,
    })

    response.value = uploadResponse
    uploadState.value = getUploadStateFromResponse(uploadResponse)
    emit("uploaded", { response: uploadResponse, state: uploadState.value as "success" | "partial" })
  } catch (error) {
    uploadState.value = "error"
    uploadError.value = mapRagUploadError(error)
  }
}

function handleUrlSubmit() {
  // TODO
}
</script>

<template lang="pug">
ui-box(title="Добавить новые знания")
  u-tabs(:items="items" class="w-full")
    template(#file)
      .flex.flex-col.gap-4.p-4
        u-file-upload(
          v-model="pickedFiles"
          multiple
          :disabled="uploadState === 'uploading'"
          accept=".txt,.md,.markdown,.json,.csv,.html,.htm"
          @update:model-value="handleFileChange"
        )

        p.text-xs.text-gray-500
          | Поддерживаемые форматы: .txt, .md, .markdown, .json, .csv, .html, .htm. Максимум 5 MB на файл.

        div(v-if="selectedFiles.length > 0" class="rounded-lg border border-gray-200 dark:border-gray-800")
          .px-3.py-2.text-sm.font-medium Выбрано к отправке ({{ selectedFiles.length }})
          ul.divide-y.divide-gray-200.dark.divide-gray-800
            li.flex.items-center.justify-between.px-3.py-2.text-sm(v-for="file in selectedFiles" :key="`${file.name}:${file.lastModified}`")
              span.truncate {{ file.name }}
              span.text-gray-500 {{ formatBytes(file.size) }}

        div(v-if="rejectedFiles.length > 0" class="rounded-lg border border-error/40")
          .px-3.py-2.text-sm.font-medium.text-error Файлы, заблокированные валидацией ({{ rejectedFiles.length }})
          ul.divide-y.divide-error/20
            li.px-3.py-2.text-sm(v-for="item in rejectedFiles" :key="`${item.file.name}:${item.file.lastModified}`")
              p.font-medium {{ item.file.name }}
              p.text-error/90 {{ item.reason }}

        u-alert(
          v-if="stateAlert"
          :color="stateAlert.color"
          :title="stateAlert.title"
          :description="stateAlert.description"
          variant="subtle"
        )

        .flex.justify-end
          u-button(
            color="primary"
            icon="lucide:upload"
            :loading="uploadState === 'uploading'"
            :disabled="!canUpload"
            @click="submitUpload"
          )
            | Upload в RAG

    template(#url)
      u-form.flex.flex-col.gap-4.p-4(:state="state" @submit="handleUrlSubmit")
        u-form-field(label="URL документа" name="url")
          u-input.w-full(
            v-model="state.url"
            placeholder="https://example.com/document.pdf"
            icon="lucide:link"
          )

        .flex.justify-end
          u-button.mt-2(
            type="submit"
            color="primary"
          ) Добавить
</template>
