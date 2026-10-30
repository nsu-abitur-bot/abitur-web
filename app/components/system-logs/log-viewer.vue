<script setup lang="ts">
import { downloadSystemLogs, getSystemLogs, listLogFiles } from "~/services/system-logs"

const files = ref<string[]>([])
const selectedFile = ref<string>("")
const lines = ref<number>(100)
const logLines = ref<string[]>([])
const isLoading = ref(false)
const loadError = ref("")
const filesError = ref(false)
const loadingFiles = ref(false)
let requestVersion = 0
const isDownloading = ref(false)
const toast = useToast()

const linesOptions = [50, 100, 200, 500, 1000]

const refreshFiles = async () => {
  loadingFiles.value = true
  filesError.value = false
  try {
    files.value = await listLogFiles()
    if (!files.value.includes(selectedFile.value)) {
      selectedFile.value = files.value[0] ?? ""
    }
  } catch {
    filesError.value = true
    toast.add({ title: "Ошибка", description: "Не удалось получить список файлов логов", color: "error" })
  } finally {
    loadingFiles.value = false
  }
}

const refreshLogs = async () => {
  if (!selectedFile.value) {
    ++requestVersion
    logLines.value = []
    isLoading.value = false
    return
  }
  const version = ++requestVersion
  isLoading.value = true
  loadError.value = ""
  logLines.value = []
  try {
    const result = await getSystemLogs(selectedFile.value, lines.value)
    if (version === requestVersion) {
      logLines.value = result
    }
  } catch {
    if (version === requestVersion) {
      loadError.value = "Не удалось загрузить логи. Повторите запрос."
    }
  } finally {
    if (version === requestVersion) {
      isLoading.value = false
    }
  }
}

const handleDownload = async () => {
  if (!selectedFile.value) {
    return
  }
  isDownloading.value = true
  try {
    await downloadSystemLogs(selectedFile.value)
  } catch (err: any) {
    toast.add({ title: "Ошибка", description: err?.message || "Не удалось скачать файл", color: "error" })
  } finally {
    isDownloading.value = false
  }
}

onMounted(async () => {
  await refreshFiles()
})

watch([selectedFile, lines], () => {
  refreshLogs()
})
</script>

<template lang="pug">
div(class="space-y-4")
  div(class="admin-toolbar")
    u-form-field(label="Файл" class="flex-1 min-w-40")
      u-select(
        v-model="selectedFile"
        :items="files"
        placeholder="Выберите файл"
        class="w-full"
      )
    u-button(color="neutral" variant="ghost" icon="i-lucide-folder-sync" aria-label="Обновить список файлов" :loading="loadingFiles" @click="refreshFiles")
    u-form-field(label="Последних строк")
      u-select(
        v-model="lines"
        :items="linesOptions"
        class="w-32"
      )
    u-button(
      icon="i-heroicons-arrow-path"
      color="neutral"
      variant="soft"
      :loading="isLoading"
      @click="filesError ? refreshFiles() : refreshLogs()"
    ) Обновить
    u-button(
      icon="i-heroicons-document-arrow-down"
      color="primary"
      variant="subtle"
      :loading="isDownloading"
      :disabled="!selectedFile"
      @click="handleDownload"
    ) Скачать файл

  div(v-if="filesError || loadError" role="alert" class="admin-empty") {{ filesError ? "Не удалось получить список файлов." : loadError }}

  div(v-else-if="loadingFiles || isLoading" class="py-10 flex justify-center text-gray-500")
    u-icon(name="i-heroicons-arrow-path" class="animate-spin w-8 h-8")

  div(v-else-if="!logLines.length" class="py-12 text-center text-gray-500 bg-gray-50 dark:bg-gray-800 rounded-lg")
    u-icon(name="i-heroicons-document-text" class="w-12 h-12 mx-auto text-gray-400 mb-3")
    p {{ files.length ? "Файл пуст." : "Файлов логов нет." }}

  div(v-else class="admin-detail overflow-hidden")
    pre(class="text-xs font-mono leading-relaxed text-gray-700 dark:text-gray-200 p-4 overflow-x-hidden max-h-[70vh] overflow-y-auto pre-wrap-anywhere")
      template(v-for="(line, index) in logLines" :key="index")
        span(class="block") {{ line }}
</template>
