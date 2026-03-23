<script setup lang="ts">
import type { CalendarDate } from "@internationalized/date"
import { shallowRef, useTemplateRef } from "vue"

import type { components } from "../../../types/openapi"

type MessageResponse = components["schemas"]["MessageResponse"] & { username?: string }

const apiBaseUrl = useRuntimeConfig().public.apiBaseUrl

const { data: messages, refresh, status } = await useMyApi("/api/v1/messages", {
  baseURL: apiBaseUrl,
  query: {
    limit: 500,
  },
})

const fromDateInput = useTemplateRef("fromDateInput")
const toDateInput = useTemplateRef("toDateInput")

const fromDate = shallowRef<CalendarDate | null>(null)
const toDate = shallowRef<CalendarDate | null>(null)

const items = computed(() => {
  let list = (messages.value ?? []) as MessageResponse[]

  if (fromDate.value) {
    const from = new Date(fromDate.value.year, fromDate.value.month - 1, fromDate.value.day).getTime()
    list = list.filter(m => new Date(m.created_at).getTime() >= from)
  }

  if (toDate.value) {
    // End of day
    const to = new Date(toDate.value.year, toDate.value.month - 1, toDate.value.day)
    to.setHours(23, 59, 59, 999)
    list = list.filter(m => new Date(m.created_at).getTime() <= to.getTime())
  }

  return list
})

const columns: any[] = [
  { id: "created_at", accessorKey: "created_at", header: "Дата и время" },
  { id: "user", accessorKey: "user_id", header: "Пользователь" },
  { id: "user_text", accessorKey: "user_text", header: "Вопрос" },
  { id: "bot_response", accessorKey: "bot_response", header: "Ответ" },
]

const formatDate = (dateString: string) => {
  const date = new Date(dateString)
  const d = date.getDate().toString().padStart(2, "0")
  const m = (date.getMonth() + 1).toString().padStart(2, "0")
  const y = date.getFullYear()
  const h = date.getHours().toString().padStart(2, "0")
  const min = date.getMinutes().toString().padStart(2, "0")
  return `${d}.${m}.${y} ${h}:${min}`
}

const exportToCsv = () => {
  const headers = ["Дата и время", "Telegram ID", "Username", "Вопрос", "Ответ"]
  const rows = items.value.map(m => [
    formatDate(m.created_at),
    m.user_id,
    m.username || "—",
    `"${m.user_text.replace(/"/g, "\"\"")}"`,
    `"${m.bot_response.replace(/"/g, "\"\"")}"`,
  ])

  const csvContent = "\uFEFF" + [headers.join(";"), ...rows.map(r => r.join(";"))].join("\n")
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.setAttribute("href", url)
  link.setAttribute("download", `messages_${new Date().toISOString().split("T")[0]}.csv`)
  link.style.visibility = "hidden"
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}
</script>

<template lang="pug">
ui-box(title="Сообщения пользователей")
  template(#right)
    u-button(icon="i-heroicons-arrow-path" color="neutral" variant="soft" :loading="status === 'pending'" @click="() => refresh()") Обновить

  div(class="flex flex-wrap items-end gap-4 mb-6")
    u-form-group(label="От" class="w-full sm:w-auto")
      u-input-date(ref="fromDateInput" v-model="fromDate")
        template(#trailing)
          u-popover(:reference="fromDateInput?.inputsRef?.[3]?.$el")
            u-button(
              color="neutral"
              variant="link"
              size="sm"
              icon="i-heroicons-calendar"
              aria-label="Select a date"
              class="px-0"
            )
            template(#content)
              u-calendar(v-model="fromDate" class="p-2")
    u-form-group(label="До" class="w-full sm:w-auto")
      u-input-date(ref="toDateInput" v-model="toDate")
        template(#trailing)
          u-popover(:reference="toDateInput?.inputsRef?.[3]?.$el")
            u-button(
              color="neutral"
              variant="link"
              size="sm"
              icon="i-heroicons-calendar"
              aria-label="Select a date"
              class="px-0"
            )
            template(#content)
              u-calendar(v-model="toDate" class="p-2")
    div(class="ml-auto flex gap-2")
      u-button(
        icon="i-heroicons-document-arrow-down"
        color="neutral"
        variant="subtle"
        :disabled="!items.length"
        @click="exportToCsv"
      ) Экспорт в CSV

  div(v-if="status === 'pending' && !items.length" class="py-10 flex justify-center text-gray-500")
    u-icon(name="i-heroicons-arrow-path" class="animate-spin w-8 h-8")

  div(v-else-if="items.length === 0" class="py-12 text-center text-gray-500 bg-gray-50 dark:bg-gray-800 rounded-lg mt-6")
    u-icon(name="i-heroicons-chat-bubble-left-right" class="w-12 h-12 mx-auto text-gray-400 mb-3")
    p Список сообщений пуст или нет данных по выбранному фильтру.

  div(v-else class="mt-6 overflow-x-auto")
    u-table(:data="items" :columns="columns" class="w-full")
      template(#created_at-cell="{ row }")
        span(class="text-sm text-gray-500 whitespace-nowrap") {{ formatDate(row.original.created_at) }}

      template(#user-cell="{ row }")
        div(class="flex flex-col text-sm")
          span(v-if="row.original.username" class="font-medium text-gray-900 dark:text-gray-100") @{{ row.original.username }}
          span(v-else class="italic text-gray-400") Без username
          span(class="text-xs text-gray-500") ID: {{ row.original.user_id }}

      template(#user_text-cell="{ row }")
        div(class="max-w-xs sm:max-w-sm md:max-w-md lg:max-w-xl whitespace-normal leading-relaxed")
          span(class="text-gray-900 dark:text-gray-100") {{ row.original.user_text }}

      template(#bot_response-cell="{ row }")
        div(class="max-w-xs sm:max-w-sm md:max-w-md lg:max-w-xl whitespace-normal leading-relaxed text-gray-600 dark:text-gray-400")
          span {{ row.original.bot_response }}
</template>
