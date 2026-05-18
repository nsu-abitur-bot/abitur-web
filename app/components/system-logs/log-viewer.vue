<script setup lang="ts">
import { downloadSystemLogs, getSystemLogs, listLogFiles } from "~/services/system-logs"

const files = ref<string[]>([])
const selectedFile = ref<string>("")
const lines = ref<number>(100)
const logLines = ref<string[]>([])
const isLoading = ref(false)
const isDownloading = ref(false)
const toast = useToast()

const linesOptions = [50, 100, 200, 500, 1000]

const refreshFiles = async () => {
  try {
    files.value = await listLogFiles()
    if (!selectedFile.value && files.value.length) {
      selectedFile.value = files.value[0] ?? ""
    }
  } catch {
    toast.add({ title: "Ошибка", description: "Не удалось получить список файлов логов", color: "error" })
  }
}

const refreshLogs = async () => {
  if (!selectedFile.value) {
    return
  }
  isLoading.value = true
  try {
    logLines.value = await getSystemLogs(selectedFile.value, lines.value)
  } catch {
    toast.add({ title: "Ошибка", description: "Не удалось загрузить логи", color: "error" })
  } finally {
    isLoading.value = false
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
  await refreshLogs()
})

watch([selectedFile, lines], () => {
  refreshLogs()
})
</script>

<template lang="pug">
div(class="space-y-4")
  div(class="flex flex-wrap items-end gap-3")
    u-form-field(label="Файл" class="flex-1 min-w-40")
      u-select(
        v-model="selectedFile"
        :items="files"
        placeholder="Выберите файл"
        class="w-full"
      )
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
      @click="refreshLogs"
    ) Обновить
    u-button(
      icon="i-heroicons-document-arrow-down"
      color="primary"
      variant="subtle"
      :loading="isDownloading"
      :disabled="!selectedFile"
      @click="handleDownload"
    ) Скачать файл

  div(v-if="isLoading && !logLines.length" class="py-10 flex justify-center text-gray-500")
    u-icon(name="i-heroicons-arrow-path" class="animate-spin w-8 h-8")

  div(v-else-if="!logLines.length" class="py-12 text-center text-gray-500 bg-gray-50 dark:bg-gray-800 rounded-lg")
    u-icon(name="i-heroicons-document-text" class="w-12 h-12 mx-auto text-gray-400 mb-3")
    p Логи не найдены или файл пуст.

  div(v-else class="rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 overflow-hidden")
    pre(class="text-xs font-mono leading-relaxed text-gray-700 dark:text-gray-200 p-4 overflow-x-auto max-h-[70vh] overflow-y-auto whitespace-pre")
      template(v-for="(line, index) in logLines" :key="index")
        span(class="block") {{ line }}
</template>
