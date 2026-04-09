<script setup lang="ts">
const { data: faqRes, refresh, status } = await useApi("/api/v1/faq")

const isCreateModalOpen = ref(false)

const items = computed(() => faqRes.value?.items ?? [])

const handleDelete = async (index: number) => {
  // eslint-disable-next-line no-alert
  if (confirm("Вы уверены, что хотите удалить этот вопрос?")) {
    await useApi("/api/v1/faq/{index}", {
      method: "DELETE",
      path: { index },
    })
    await refresh()
  }
}

const handleFaqCreated = async () => {
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
    // TODO: Send to backend when openapi.json is updated
    // const formData = new FormData()
    // formData.append('file', file)
    // await useApi('/api/v1/faq/upload', { ... })

    // Simulate API call for now
    await new Promise(resolve => setTimeout(resolve, 1000))
    // eslint-disable-next-line no-console
    console.log("File to upload:", file.name)

    await refresh()
  } catch (error) {
    console.error("Upload failed", error)
  } finally {
    isUploading.value = false
    // Reset input
    target.value = ""
  }
}
</script>

<template lang="pug">
ui-box(title="Управление FAQ")
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
      u-button(icon="i-heroicons-plus" color="primary" @click="isCreateModalOpen = true") Добавить вопрос

  div(v-if="status === 'pending'" class="py-10 flex justify-center text-gray-500")
    u-icon(name="i-heroicons-arrow-path" class="animate-spin w-8 h-8")

  div(v-else-if="items.length === 0" class="py-12 text-center text-gray-500 bg-gray-50 dark:bg-gray-800 rounded-lg")
    u-icon(name="i-heroicons-document-text" class="w-12 h-12 mx-auto text-gray-400 mb-3")
    p Нет добавленных вопросов. Создайте первый FAQ вопрос.

  div(v-else class="space-y-4 mt-6")
    faq-item(
      v-for="(item, index) in items"
      :key="index"
      :item="item"
      :index="index"
      @delete="handleDelete(index)"
      @updated="refresh"
    )

  // Modal for Creation
  u-slideover(v-model:open="isCreateModalOpen" title="Новый вопрос FAQ")
    template(#body)
      faq-form(
        @submit="handleFaqCreated"
        @cancel="isCreateModalOpen = false"
      )
</template>
