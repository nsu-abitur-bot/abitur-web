<script setup lang="ts">
import { uploadAbbrevCsv } from "~/services/abbrev"

const { data: abbrevRes, refresh, status } = await useApi("/api/v1/abbrev")

const isCreateModalOpen = ref(false)
const toast = useToast()

const items = computed(() => abbrevRes.value?.items ?? [])

const handleDelete = async (itemId?: string | null) => {
  if (!itemId) {
    toast.add({
      title: "Ошибка",
      description: "У аббревиатуры нет идентификатора",
      color: "error",
    })
    return
  }

  await useApi("/api/v1/abbrev/{item_id}", {
    method: "DELETE",
    path: { item_id: itemId },
  })
  toast.add({
    title: "Успешно",
    description: "Аббревиатура удалена",
    color: "success",
  })
  await refresh()
}

const handleCreated = async () => {
  isCreateModalOpen.value = false
  await refresh()
}

const fileInput = useTemplateRef("fileInput")
const isUploading = ref(false)

const triggerFileInput = () => {
  fileInput.value?.click()
}

const handleFileUpload = async (event: Event) => {
  const target = event.target as HTMLInputElement
  if (!target.files?.length) {
    return
  }

  const file = target.files[0]
  if (!file) {
    return
  }

  try {
    isUploading.value = true
    await uploadAbbrevCsv(file)
    toast.add({
      title: "Успешно",
      description: "Список аббревиатур обновлен",
      color: "success",
    })
    await refresh()
  } catch (error) {
    console.error("Upload failed", error)
    toast.add({
      title: "Ошибка",
      description: "Не удалось обновить список аббревиатур",
      color: "error",
    })
  } finally {
    isUploading.value = false
    // Reset input
    target.value = ""
  }
}
</script>

<template lang="pug">
ui-box(title="Управление аббревиатурами")
  template(#right)
    div(class="flex items-center gap-2")
      input(ref="fileInput" type="file" accept=".csv" class="hidden" @change="handleFileUpload")
      u-button(
        icon="i-heroicons-arrow-up-tray"
        color="info"
        variant="soft"
        :loading="isUploading"
        @click="triggerFileInput"
      ) Загрузить CSV
      u-button(icon="i-heroicons-plus" color="primary" @click="isCreateModalOpen = true") Добавить аббревиатуру

  div(v-if="status === 'pending'" class="py-10 flex justify-center text-gray-500")
    u-icon(name="i-heroicons-arrow-path" class="animate-spin w-8 h-8")

  div(v-else-if="items.length === 0" class="py-12 text-center text-gray-500 bg-gray-50 dark:bg-gray-800 rounded-lg")
    u-icon(name="i-heroicons-book-open" class="w-12 h-12 mx-auto text-gray-400 mb-3")
    p Нет добавленных аббревиатур. Создайте первую.

  div(v-else class="space-y-2 mt-6")
    abbrev-item(
      v-for="(item, index) in items"
      :key="item.id ?? index"
      :item="item"
      @delete="handleDelete(item.id)"
      @updated="refresh"
    )

  u-slideover(v-model:open="isCreateModalOpen" title="Новая аббревиатура")
    template(#body)
      abbrev-form(
        @submit="handleCreated"
        @cancel="isCreateModalOpen = false"
      )
</template>
