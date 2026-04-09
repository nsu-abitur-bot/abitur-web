<script setup lang="ts">
import { confirmRagUpload, parsePageForRag } from "~/services/rag-upload"
import type { ParsedPageResult } from "~/types/rag-upload"

const emit = defineEmits<{
  (e: "success"): void
}>()

interface PendingItem extends ParsedPageResult {
  isParsing: boolean
  error?: string
}

const url = ref("")
const pendingItems = ref<PendingItem[]>([])
const selectedIndices = ref<Set<number>>(new Set())
const isUploading = ref(false)
const editingIndex = ref<number | null>(null)
const toast = useToast()

const handleAdd = async () => {
  if (!url.value) {
    return
  }

  const currentUrl = url.value
  url.value = ""

  const newItem: PendingItem = {
    url: currentUrl,
    title: currentUrl, // Default to URL until parsed
    text: "",
    documents: [],
    isParsing: true,
  }

  const index = pendingItems.value.length
  pendingItems.value.push(newItem)
  selectedIndices.value.add(index)

  try {
    const res = await parsePageForRag(currentUrl)
    pendingItems.value[index] = {
      ...res,
      isParsing: false,
    }
  } catch {
    pendingItems.value[index]!.isParsing = false
    pendingItems.value[index]!.error = "Ошибка парсинга"
    toast.add({
      title: "Ошибка",
      description: `Не удалось спарсить ${currentUrl}`,
      color: "error",
    })
  }
}

const toggleSelection = (index: number) => {
  if (selectedIndices.value.has(index)) {
    selectedIndices.value.delete(index)
  } else {
    selectedIndices.value.add(index)
  }
}

const toggleAll = () => {
  if (selectedIndices.value.size === pendingItems.value.length) {
    selectedIndices.value.clear()
  } else {
    selectedIndices.value = new Set(pendingItems.value.keys())
  }
}

const removeItem = (index: number) => {
  pendingItems.value.splice(index, 1)
  selectedIndices.value.delete(index)
  // Need to shift other indices in Set if we use index as key,
  // but for simplicity let's just re-create selection or use IDs.
  // Using index is risky with splice. Let's use reactive Set of IDs if items had IDs.
  // For now just clear and re-select valid ones or use a different approach.
  selectedIndices.value = new Set([...selectedIndices.value].filter(i => i !== index).map(i => i > index ? i - 1 : i))
}

const handleConfirmUpload = async () => {
  const itemsToUpload = [...selectedIndices.value]
    .map(i => pendingItems.value[i])
    .filter((item): item is PendingItem => !!item && !item.isParsing && !item.error)

  if (itemsToUpload.length === 0) {
    return
  }

  isUploading.value = true
  try {
    for (const item of itemsToUpload) {
      await confirmRagUpload({
        title: item.title,
        url: item.url,
        text: item.text,
        documents: item.documents,
      })
    }
    toast.add({
      title: "Успех",
      description: `Документы (${itemsToUpload.length}) отправлены на индексацию`,
      color: "success",
    })

    // Remove uploaded items from pending
    pendingItems.value = pendingItems.value.filter((_, i) => !selectedIndices.value.has(i))
    selectedIndices.value.clear()
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

const openEditor = (index: number) => {
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
    // URL Input
    u-form-field(label="URL" class="w-full")
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

    // Pending List
    div(v-if="pendingItems.length > 0" class="space-y-2 border-t pt-4 dark:border-gray-800")
      div(class="flex items-center justify-between mb-2")
        div(class="text-sm font-medium text-gray-500") Очередь на индексацию ({{ pendingItems.length }})
        u-button(variant="ghost" size="xs" color="neutral" @click="toggleAll") {{ selectedIndices.size === pendingItems.length ? 'Снять выделение' : 'Выделить все' }}

      div(class="space-y-2 max-h-[300px] overflow-y-auto")
        div(
          v-for="(item, index) in pendingItems"
          :key="index"
          class="flex items-center gap-3 p-3 rounded-lg border dark:border-gray-800 transition-colors"
          :class="selectedIndices.has(index) ? 'bg-primary-50/50 dark:bg-primary-900/10 border-primary-200 dark:border-primary-800' : 'bg-gray-50 dark:bg-gray-800/50 border-transparent'"
        )
          u-checkbox(
            :model-value="selectedIndices.has(index)"
            :disabled="item.isParsing"
            @update:model-value="toggleSelection(index)"
          )
          div(class="flex-1 min-w-0")
            div(class="flex items-center gap-2")
              u-icon(v-if="item.isParsing" name="i-heroicons-arrow-path" class="animate-spin w-3 h-3 text-gray-400")
              div(class="text-sm font-semibold truncate") {{ item.title }}
            div(class="text-[10px] text-gray-500 truncate") {{ item.url }}

          div(class="flex items-center gap-1")
            u-button(
              v-if="!item.isParsing && !item.error"
              icon="i-heroicons-pencil-square"
              variant="ghost"
              size="xs"
              color="neutral"
              title="Редактировать текст"
              @click="openEditor(index)"
            )
            u-button(
              icon="i-heroicons-trash"
              variant="ghost"
              size="xs"
              color="error"
              @click="removeItem(index)"
            )

    // Action Button
    div(class="pt-4 border-t dark:border-gray-800 flex justify-start")
      u-button(
        color="neutral"
        variant="outline"
        size="lg"
        class="font-bold"
        :loading="isUploading"
        :disabled="selectedIndices.size === 0 || isUploading"
        @click="handleConfirmUpload"
      ) Проиндексировать

  // Editor View
  div(v-else class="bg-white dark:bg-gray-900 p-6 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm space-y-6 animate-in fade-in slide-in-from-right-4")
    div(class="flex items-center justify-between border-b pb-4 dark:border-gray-800")
      h3(class="text-lg font-semibold flex items-center gap-2")
        u-icon(name="i-heroicons-pencil-square" class="text-primary-500")
        | Редактирование: {{ currentEditingItem?.title }}
      u-button(icon="i-heroicons-x-mark" color="neutral" variant="ghost" size="sm" @click="closeEditor")

    div(class="space-y-4")
      u-form-field(label="Название")
        u-input(v-model="editingTitle")

      u-form-field(label="Извлеченный текст")
        u-textarea(
          v-model="editingText"
          autoresize
          :rows="12"
          class="w-full font-mono text-xs"
        )

      div(v-if="currentEditingItem?.documents?.length" class="space-y-2")
        label(class="text-xs font-medium text-gray-500") Найденные PDF (будут проиндексированы)
        div(class="space-y-1")
          div(v-for="doc in currentEditingItem?.documents ?? []" :key="doc.url" class="text-[10px] p-2 bg-gray-50 dark:bg-gray-800 rounded flex items-center gap-2")
            u-icon(name="i-heroicons-document" class="w-3 h-3 text-gray-400")
            span(class="truncate flex-1") {{ doc.title }}

    div(class="flex justify-end gap-3 pt-4 border-t dark:border-gray-800")
      u-button(variant="ghost" color="neutral" @click="closeEditor") Готово
</template>
