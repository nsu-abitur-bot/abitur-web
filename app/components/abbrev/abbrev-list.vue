<script setup lang="ts">
const { data: abbrevRes, refresh, status } = await useApi("/api/v1/abbrev")

const isCreateModalOpen = ref(false)
const toast = useToast()

const items = computed(() => abbrevRes.value?.items ?? [])

const handleDelete = async (index: number) => {
  await useApi("/api/v1/abbrev/{index}", {
    method: "DELETE",
    path: { index },
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
</script>

<template lang="pug">
ui-box(title="Управление аббревиатурами")
  template(#right)
    u-button(icon="i-heroicons-plus" color="primary" @click="isCreateModalOpen = true") Добавить аббревиатуру

  div(v-if="status === 'pending'" class="py-10 flex justify-center text-gray-500")
    u-icon(name="i-heroicons-arrow-path" class="animate-spin w-8 h-8")

  div(v-else-if="items.length === 0" class="py-12 text-center text-gray-500 bg-gray-50 dark:bg-gray-800 rounded-lg")
    u-icon(name="i-heroicons-book-open" class="w-12 h-12 mx-auto text-gray-400 mb-3")
    p Нет добавленных аббревиатур. Создайте первую.

  div(v-else class="space-y-2 mt-6")
    abbrev-item(
      v-for="(item, index) in items"
      :key="index"
      :item="item"
      :index="index"
      @delete="handleDelete(index)"
      @updated="refresh"
    )

  u-slideover(v-model:open="isCreateModalOpen" title="Новая аббревиатура")
    template(#body)
      abbrev-form(
        @submit="handleCreated"
        @cancel="isCreateModalOpen = false"
      )
</template>
