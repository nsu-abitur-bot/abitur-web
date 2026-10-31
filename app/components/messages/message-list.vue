<script setup lang="ts">
import type { CalendarDate } from "@internationalized/date"

import type { components } from "#openapi"
import { parseUserId } from "~/services/message-filters"

type MessageResponse = components["schemas"]["MessageResponse"]

const batchOffset = ref(0)
const userFilter = ref("")
const userFilterError = ref("")
const appliedUser = ref<number | undefined>()
const messageQuery = computed(() => ({ limit: 500, offset: batchOffset.value, user_id: appliedUser.value }))
const { data: messages, refresh, status, error } = await useApi("/api/v1/messages", { query: messageQuery })
const applyUser = () => {
  userFilterError.value = ""
  try {
    const id = parseUserId(userFilter.value)
    batchOffset.value = 0
    appliedUser.value = id
  } catch {
    userFilterError.value = "Введите целый идентификатор пользователя."
  }
}

const fromDateInput = useTemplateRef("fromDateInput")
const toDateInput = useTemplateRef("toDateInput")

const fromDate = shallowRef<CalendarDate | null>(null)
const toDate = shallowRef<CalendarDate | null>(null)

const search = ref("")
const channel = ref("all")
const page = ref(1)
const pageSize = 25

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

  const q = search.value.trim().toLocaleLowerCase("ru")
  return list.filter(m => (channel.value === "all" || m.messenger === channel.value)
    && (!q || `${m.user_id} ${m.username ?? ""} ${m.user_text} ${m.bot_response} ${m.session_id}`.toLocaleLowerCase("ru").includes(q)))
})

const hasFilters = computed(() => Boolean(search.value.trim() || channel.value !== "all" || fromDate.value || toDate.value || appliedUser.value !== undefined))
function resetFilters() {
  search.value = ""
  channel.value = "all"
  fromDate.value = null
  toDate.value = null
  userFilter.value = ""
  userFilterError.value = ""
  appliedUser.value = undefined
  batchOffset.value = 0
}

const channels = computed(() => [
  { label: "Все каналы", value: "all" },
  ...[...new Set((messages.value ?? []).map(m => m.messenger).filter((m): m is string => !!m))]
    .map(value => ({ label: value, value })),
])
const pagedItems = computed(() => items.value.slice((page.value - 1) * pageSize, page.value * pageSize))
watch([fromDate, toDate, search, channel, batchOffset, appliedUser], () => {
  page.value = 1
})

watch(items, () => {
  page.value = Math.min(page.value, Math.max(1, Math.ceil(items.value.length / pageSize)))
})

const columns: any[] = [
  { id: "created_at", accessorKey: "created_at", header: "Дата и время" },
  { id: "user", accessorKey: "user_id", header: "Пользователь" },
  { id: "messenger", accessorKey: "messenger", header: "Мессенджер" },
  { id: "user_text", accessorKey: "user_text", header: "Вопрос" },
  { id: "bot_response", accessorKey: "bot_response", header: "Ответ" },
  { id: "actions", header: "" },
]

type BadgeColor = "primary" | "info" | "success" | "warning" | "error" | "neutral" | "secondary"

const messengerMeta: Record<string, { label: string, color: BadgeColor }> = {
  tg: { label: "Telegram", color: "info" },
  telegram: { label: "Telegram", color: "info" },
  vk: { label: "VK", color: "primary" },
  whatsapp: { label: "WhatsApp", color: "success" },
  web: { label: "Web", color: "neutral" },
}

const getMessengerMeta = (value?: string | null) => {
  if (!value) {
    return null
  }
  return messengerMeta[value.toLowerCase()] ?? { label: value, color: "neutral" as BadgeColor }
}

const getMessengerLabel = (value?: string | null) => getMessengerMeta(value)?.label ?? "—"
const getMessengerColor = (value?: string | null) => getMessengerMeta(value)?.color ?? "neutral"

const selectedSessionId = ref<string | null>(null)
const isLogsOpen = ref(false)

const openLogs = (sessionId: string) => {
  selectedSessionId.value = sessionId
  isLogsOpen.value = true
}

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
  const headers = ["Дата и время", "Идентификатор пользователя", "Имя пользователя", "Мессенджер", "Вопрос", "Ответ"]
  const rows = items.value.map(m => [
    formatDate(m.created_at),
    m.user_id,
    m.username || "—",
    m.messenger || "—",
    m.user_text,
    m.bot_response,
  ])

  const csvContent = "\uFEFF" + [headers.join(";"), ...rows.map(r => r.map(value => `"${String(value).replaceAll("\"", "\"\"")}"`).join(";"))].join("\n")
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.setAttribute("href", url)
  link.setAttribute("download", `messages_${new Date().toISOString().split("T")[0]}.csv`)
  link.style.visibility = "hidden"
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
</script>

<template lang="pug">
div(class="space-y-4 min-w-0")
  ui-box(title="Журнал сообщений")
    template(#right)
      u-button(icon="i-heroicons-arrow-path" color="neutral" variant="soft" :loading="status === 'pending'" @click="() => refresh()") Обновить

    div(class="admin-toolbar")
      u-form-field(label="От" class="w-full sm:w-auto")
        u-input-date(ref="fromDateInput" v-model="fromDate")
          template(#trailing)
            u-popover(:reference="fromDateInput?.inputsRef?.[3]?.$el")
              u-button(
                color="neutral"
                variant="link"
                size="sm"
                icon="i-heroicons-calendar"
                aria-label="Выбрать дату"
                class="px-0"
              )
              template(#content)
                u-calendar(v-model="fromDate" class="p-2")
      u-form-field(label="До" class="w-full sm:w-auto")
        u-input-date(ref="toDateInput" v-model="toDate")
          template(#trailing)
            u-popover(:reference="toDateInput?.inputsRef?.[3]?.$el")
              u-button(
                color="neutral"
                variant="link"
                size="sm"
                icon="i-heroicons-calendar"
                aria-label="Выбрать дату"
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

    p(class="admin-muted text-xs my-3" role="status") Загружено {{ messages?.length ?? 0 }} сообщений, смещение {{ batchOffset }}, предел выборки — 500. Фильтры и CSV относятся только к этой выборке.
    div(class="admin-toolbar")
      u-form-field(label="Пользователь (вся база)")
        u-input(v-model="userFilter" type="number" min="0" placeholder="ID пользователя" @keydown.enter.prevent="applyUser")
      u-button(color="neutral" variant="outline" @click="applyUser") Применить
      u-button(color="neutral" variant="ghost" :disabled="batchOffset === 0 || status === 'pending'" @click="batchOffset = Math.max(0, batchOffset - 500)") Предыдущие 500
      u-button(color="neutral" variant="ghost" :disabled="(messages?.length ?? 0) < 500 || status === 'pending'" @click="batchOffset += 500") Следующие 500
    p(v-if="userFilterError" role="alert" class="text-error text-xs my-2") {{ userFilterError }}
    div(class="admin-toolbar")
      u-input(v-model="search" icon="i-lucide-search" placeholder="Вопрос, ответ, пользователь или сессия" aria-label="Поиск сообщений" class="w-full sm:max-w-md")
      u-select(v-model="channel" :items="channels" aria-label="Канал" class="w-44")
      span(class="admin-muted text-xs") Найдено: {{ items.length }}

    ui-empty-state(v-if="status === 'pending' && !items.length" kind="loading" title="Загрузка сообщений…")
    ui-empty-state(v-else-if="error" kind="error" title="Не удалось загрузить сообщения")
      u-button(color="neutral" variant="outline" @click="() => refresh()") Повторить
    ui-empty-state(v-else-if="!items.length" :kind="hasFilters ? 'no-results' : 'empty'" :title="hasFilters ? 'Ничего не найдено' : batchOffset ? 'В этой выборке сообщений нет' : 'Сообщений пока нет'")
      u-button(v-if="hasFilters" color="neutral" variant="outline" @click="resetFilters") Сбросить фильтры

    div(v-else class="admin-table-wrap")
      u-table(:data="pagedItems" :columns="columns" class="w-full messages-table admin-table")
        template(#created_at-cell="{ row }")
          span(class="text-sm text-gray-500 whitespace-nowrap") {{ formatDate(row.original.created_at) }}

        template(#user-cell="{ row }")
          div(class="flex flex-col text-sm min-w-0")
            span(v-if="row.original.username" class="font-medium text-gray-900 dark:text-gray-100 break-anywhere") @{{ row.original.username }}
            span(v-else class="italic text-gray-400") Без имени пользователя
            span(class="text-xs text-gray-500 break-anywhere") ID: {{ row.original.user_id }}

        template(#messenger-cell="{ row }")
          u-badge(
            v-if="getMessengerMeta(row.original.messenger)"
            :color="getMessengerColor(row.original.messenger)"
            variant="subtle"
            size="sm"
          ) {{ getMessengerLabel(row.original.messenger) }}
          span(v-else class="text-xs text-gray-400") —

        template(#user_text-cell="{ row }")
          div(class="whitespace-normal leading-relaxed break-anywhere")
            span(class="text-gray-900 dark:text-gray-100") {{ row.original.user_text }}

        template(#bot_response-cell="{ row }")
          div(class="whitespace-normal leading-relaxed text-gray-600 dark:text-gray-400 break-anywhere")
            span {{ row.original.bot_response }}

        template(#actions-cell="{ row }")
          u-button(
            icon="i-heroicons-list-bullet"
            color="neutral"
            variant="ghost"
            size="sm"
            title="Логи"
            @click="openLogs(row.original.session_id)"
          )

    div(v-if="items.length" class="admin-actions justify-between mt-4")
      span(class="admin-muted text-xs") Страница {{ page }} из {{ Math.ceil(items.length / pageSize) }}
      u-pagination(v-model:page="page" :items-per-page="pageSize" :total="items.length")

    u-slideover(v-model:open="isLogsOpen" title="Детальные логи сессии" :description="selectedSessionId ?? ''")
      template(#body)
        messages-logs-viewer(v-if="selectedSessionId" :key="selectedSessionId" :session-id="selectedSessionId")
</template>

<style scoped>
:deep(.messages-table table) {
  min-width: 960px;
  table-layout: fixed;
}

:deep(.messages-table th:nth-child(4)),
:deep(.messages-table td:nth-child(4)) {
  width: 14rem;
}

:deep(.messages-table th:nth-child(5)),
:deep(.messages-table td:nth-child(5)) {
  width: 20rem;
}

:deep(.messages-table th:nth-child(1)),
:deep(.messages-table td:nth-child(1)) {
  width: 8.5rem;
}

:deep(.messages-table th:nth-child(2)),
:deep(.messages-table td:nth-child(2)) {
  width: 9rem;
}

:deep(.messages-table th:nth-child(3)),
:deep(.messages-table td:nth-child(3)) {
  width: 7rem;
}

:deep(.messages-table th:nth-child(6)),
:deep(.messages-table td:nth-child(6)) {
  width: 3rem;
}
</style>
