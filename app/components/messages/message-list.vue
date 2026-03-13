<script setup lang="ts">
import type { components } from "../../../types/openapi"

type MessageResponse = components["schemas"]["MessageResponse"]

const apiBaseUrl = useRuntimeConfig().public.apiBaseUrl

const { data: messages, refresh, status } = await useMyApi("/api/v1/messages", {
  baseURL: apiBaseUrl,
})

const items = computed(() => (messages.value ?? []) as MessageResponse[])

const columns: any[] = [
  { id: "created_at", accessorKey: "created_at", header: "Дата" },
  { id: "user_text", accessorKey: "user_text", header: "Запрос пользователя" },
  { id: "bot_response", accessorKey: "bot_response", header: "Ответ бота" },
  { id: "user_id", accessorKey: "user_id", header: "User ID" },
]

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleString("ru-RU", {
    day: "2-digit",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  })
}
</script>

<template lang="pug">
ui-box(title="Сообщения пользователей")
  template(#right)
    u-button(icon="i-heroicons-arrow-path" color="neutral" variant="soft" :loading="status === 'pending'" @click="() => refresh()") Обновить

  div(v-if="status === 'pending' && !items.length" class="py-10 flex justify-center text-gray-500")
    u-icon(name="i-heroicons-arrow-path" class="animate-spin w-8 h-8")

  div(v-else-if="items.length === 0" class="py-12 text-center text-gray-500 bg-gray-50 dark:bg-gray-800 rounded-lg mt-6")
    u-icon(name="i-heroicons-chat-bubble-left-right" class="w-12 h-12 mx-auto text-gray-400 mb-3")
    p Список сообщений пуст.

  div(v-else class="mt-6")
    u-table(:data="items" :columns="columns" class="w-full")
      template(#created_at-cell="{ row }")
        span(class="text-sm text-gray-500 whitespace-nowrap") {{ formatDate(row.original.created_at) }}

      template(#user_text-cell="{ row }")
        div(class="max-w-xs sm:max-w-sm md:max-w-md lg:max-w-lg whitespace-normal leading-relaxed")
          span(class="text-gray-900 dark:text-gray-100 font-medium") {{ row.original.user_text }}

      template(#bot_response-cell="{ row }")
        div(class="max-w-xs sm:max-w-sm md:max-w-md lg:max-w-lg whitespace-normal leading-relaxed text-gray-600 dark:text-gray-400")
          span {{ row.original.bot_response }}

      template(#user_id-cell="{ row }")
        u-badge(color="primary" variant="subtle") {{ row.original.user_id }}
</template>
