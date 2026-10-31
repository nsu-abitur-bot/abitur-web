<script setup lang="ts">
import { uploadAbbrevCsv } from "~/services/abbrev"

const { data: abbrevRes, refresh, status, error } = await useApi("/api/v1/abbrev")

const isCreateModalOpen = ref(false)
const toast = useToast()

const search = ref("")
const items = computed(() => abbrevRes.value?.items ?? [])

const filteredItems = computed(() => items.value.filter(item =>
  JSON.stringify(item).toLocaleLowerCase("ru").includes(search.value.trim().toLocaleLowerCase("ru")),
))

const handleDelete = async (itemId?: string | null) => {
  if (!itemId) {
    toast.add({
      title: "Ошибка",
      description: "У аббревиатуры нет идентификатора",
      color: "error",
    })
    return
  }

  try {
    await apiFetch(`/api/v1/abbrev/${encodeURIComponent(itemId)}`, { method: "DELETE" })
    toast.add({ title: "Запись удалена", color: "success" })
    await refresh()
  } catch {
    toast.add({ title: "Не удалось удалить запись", color: "error" })
  }
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
ui-box(:title="`Сокращения (${items.length})`")
  div(class="admin-actions mb-3")
    input(ref="fileInput" type="file" accept=".csv" class="hidden" @change="handleFileUpload")
    u-button(
      icon="i-heroicons-arrow-up-tray"
      color="neutral"
      variant="soft"
      :loading="isUploading"
      @click="triggerFileInput"
    ) Загрузить CSV
    u-button(icon="i-heroicons-plus" color="primary" @click="isCreateModalOpen = true") Добавить аббревиатуру

  div(class="admin-toolbar")
    u-input(v-model="search" icon="i-lucide-search" placeholder="Поиск" aria-label="Поиск по справочнику" class="w-full sm:max-w-sm")
    u-button(color="neutral" variant="ghost" :loading="status === 'pending'" @click="() => refresh()") Обновить

  ui-empty-state(v-if="status === 'pending'" kind="loading" title="Загрузка справочника…")
  ui-empty-state(v-else-if="error" kind="error" title="Не удалось загрузить справочник")
    u-button(color="neutral" variant="outline" @click="() => refresh()") Повторить
  ui-empty-state(v-else-if="!items.length" title="Аббревиатур пока нет")
  ui-empty-state(v-else-if="!filteredItems.length" kind="no-results" title="Ничего не найдено")
    u-button(color="neutral" variant="outline" @click="search = ''") Сбросить поиск

  div(v-else class="divide-y divide-default")
    abbrev-item(
      v-for="(item, index) in filteredItems"
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
