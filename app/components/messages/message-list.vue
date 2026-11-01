<script setup lang="ts">
import type { CalendarDate } from "@internationalized/date"
import { watchDebounced } from "@vueuse/core"

import type { components } from "#openapi"
import { collectMessageExport } from "~/services/message-export"
import { parseUserId } from "~/services/message-filters"

const userFilter = ref("")
const userFilterError = ref("")
const appliedUser = ref<number | undefined>()
const applyUser = () => {
  userFilterError.value = ""
  try {
    appliedUser.value = parseUserId(userFilter.value)
  } catch {
    userFilterError.value = "Введите целый идентификатор пользователя."
  }
}
watchDebounced(userFilter, applyUser, { debounce: 300 })

const fromDateInput = useTemplateRef("fromDateInput")
const toDateInput = useTemplateRef("toDateInput")

const fromDate = shallowRef<CalendarDate | null>(null)
const toDate = shallowRef<CalendarDate | null>(null)

const search = ref("")
const channel = ref("all")
const page = ref(1)
const pageSize = 25

const debouncedSearch = ref("")
watchDebounced(search, (value) => {
  debouncedSearch.value = value.trim()
}, { debounce: 300 })
const messageQuery = computed(() => ({
  limit: pageSize,
  offset: (page.value - 1) * pageSize,
  user_id: appliedUser.value,
  search: debouncedSearch.value || undefined,
  channel: channel.value === "all" ? undefined : channel.value,
  from_date: fromDate.value?.toString(),
  to_date: toDate.value?.toString(),
}))
type MessagePage = components["schemas"]["MessagePageResponse"]
const nuxtApp = useNuxtApp()
const { data: messages, refresh, status, error } = await useAsyncData("messages", (_app, { signal }) =>
  nuxtApp.runWithContext(() => apiFetch<MessagePage>("/api/v1/messages/page", { query: messageQuery.value, signal })), {
  watch: [messageQuery],
})
const items = computed(() => messages.value?.items ?? [])
const total = computed(() => messages.value?.total ?? 0)
watch(messages, (result) => {
  if (result) {
    page.value = Math.min(page.value, Math.max(1, Math.ceil(result.total / pageSize)))
  }
})

const hasFilters = computed(() => Boolean(search.value.trim() || channel.value !== "all" || fromDate.value || toDate.value || appliedUser.value !== undefined))
function resetFilters() {
  search.value = ""
  debouncedSearch.value = ""
  channel.value = "all"
  fromDate.value = null
  toDate.value = null
  userFilter.value = ""
  userFilterError.value = ""
  appliedUser.value = undefined
}

const channels = [
  { label: "Все каналы", value: "all" },
  { label: "Telegram", value: "telegram" },
  { label: "MAX", value: "max" },
]
watch([fromDate, toDate, debouncedSearch, channel, appliedUser], () => {
  page.value = 1
}, { flush: "sync" })

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

const isExporting = ref(false)
const exportError = ref("")
let exportController: AbortController | undefined
onBeforeUnmount(() => exportController?.abort())
const exportToCsv = async () => {
  if (isExporting.value) {
    return
  }
  isExporting.value = true
  exportError.value = ""
  exportController = new AbortController()
  const query = { ...messageQuery.value }
  try {
    const exported = await collectMessageExport((offset, limit, snapshotId) =>
      nuxtApp.runWithContext(() => apiFetch<MessagePage>("/api/v1/messages/page", {
        query: { ...query, offset, limit, snapshot_id: snapshotId },
        signal: exportController!.signal,
      })), exportController.signal)
    const headers = ["Дата и время", "Идентификатор пользователя", "Имя пользователя", "Мессенджер", "Вопрос", "Ответ"]
    const rows = exported.map(m => [
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
  } catch {
    if (!exportController.signal.aborted) {
      exportError.value = "Не удалось экспортировать сообщения. Попробуйте ещё раз."
    }
  } finally {
    isExporting.value = false
  }
}
</script>

<template lang="pug">
div(class="space-y-4 min-w-0")
  ui-box
    div(class="messages-toolbar")
      u-input(v-model="search" icon="i-lucide-search" placeholder="Поиск сообщений" :maxlength="500" aria-label="Поиск сообщений" class="messages-search")
      u-select(v-model="channel" :items="channels" aria-label="Канал" class="messages-channel")
      div(class="messages-actions")
        u-button(icon="i-lucide-refresh-cw" color="neutral" variant="ghost" aria-label="Обновить" title="Обновить" :loading="status === 'pending'" @click="() => refresh()")
        u-button(icon="i-lucide-download" color="neutral" variant="ghost" aria-label="Экспорт в CSV" title="Экспорт в CSV" :loading="isExporting" :disabled="!total || status === 'pending'" @click="exportToCsv")
        u-button(v-if="isExporting" icon="i-lucide-x" color="neutral" variant="ghost" aria-label="Отменить экспорт" @click="exportController?.abort()")
    div(class="messages-filters")
      u-form-field(label="От" class="messages-date")
        u-input-date(ref="fromDateInput" v-model="fromDate" class="w-full")
          template(#trailing)
            u-popover(:reference="fromDateInput?.inputsRef?.[3]?.$el")
              u-button(color="neutral" variant="link" size="sm" icon="i-lucide-calendar" aria-label="Выбрать начальную дату" class="px-0")
              template(#content)
                u-calendar(v-model="fromDate" class="p-2")
      u-form-field(label="До" class="messages-date")
        u-input-date(ref="toDateInput" v-model="toDate" class="w-full")
          template(#trailing)
            u-popover(:reference="toDateInput?.inputsRef?.[3]?.$el")
              u-button(color="neutral" variant="link" size="sm" icon="i-lucide-calendar" aria-label="Выбрать конечную дату" class="px-0")
              template(#content)
                u-calendar(v-model="toDate" class="p-2")
      u-form-field(label="Пользователь" :error="userFilterError || undefined" class="messages-user")
        u-input(v-model="userFilter" type="number" min="0" placeholder="ID пользователя" aria-label="Пользователь" class="w-full" @keydown.enter.prevent="applyUser")
      u-button(v-if="hasFilters" color="neutral" variant="ghost" @click="resetFilters") Сбросить
    p(v-if="exportError" role="alert" class="text-error text-sm mb-3") {{ exportError }}

    ui-empty-state(v-if="status === 'pending' && !items.length" kind="loading" title="Загрузка сообщений…")
    ui-empty-state(v-else-if="error" kind="error" title="Не удалось загрузить сообщения")
      u-button(color="neutral" variant="outline" @click="() => refresh()") Повторить
    ui-empty-state(v-else-if="!items.length" :kind="hasFilters ? 'no-results' : 'empty'" :title="hasFilters ? 'Ничего не найдено' : 'Сообщений пока нет'")
      u-button(v-if="hasFilters" color="neutral" variant="outline" @click="resetFilters") Сбросить фильтры

    div(v-else class="admin-table-wrap")
      u-table(:data="items" :columns="columns" class="w-full messages-table admin-table")
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

    div(v-if="total > pageSize" class="messages-pagination")
      u-pagination(v-model:page="page" :items-per-page="pageSize" :total="total" :disabled="status === 'pending'" :sibling-count="1")

    ui-detail-dialog(v-model:open="isLogsOpen" title="Детальные логи сессии" :description="selectedSessionId ?? ''")
      messages-logs-viewer(v-if="selectedSessionId" :key="selectedSessionId" :session-id="selectedSessionId")
</template>

<style scoped>
.messages-toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
}

.messages-search {
  flex: 1;
  min-width: 0;
}

.messages-channel {
  width: 150px;
}

.messages-actions {
  display: flex;
  align-items: center;
  gap: 4px;
}

.messages-filters {
  display: flex;
  align-items: flex-end;
  flex-wrap: wrap;
  gap: 12px;
  padding-block: 16px;
}

.messages-date,
.messages-user {
  width: 185px;
  min-width: 0;
}

.messages-pagination {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}

:deep(.messages-table table) {
  width: 100%;
  min-width: 960px;
  table-layout: fixed;
}

:deep(.messages-table th:nth-child(1)),
:deep(.messages-table td:nth-child(1)) {
  width: 145px;
}

:deep(.messages-table th:nth-child(2)),
:deep(.messages-table td:nth-child(2)) {
  width: 145px;
}

:deep(.messages-table th:nth-child(3)),
:deep(.messages-table td:nth-child(3)) {
  width: 105px;
}

:deep(.messages-table th:nth-child(4)),
:deep(.messages-table td:nth-child(4)) {
  width: 30%;
}

:deep(.messages-table th:nth-child(6)),
:deep(.messages-table td:nth-child(6)) {
  width: 48px;
}

@media (641px <= width <= 1200px) {
  :deep(.messages-table table) {
    min-width: 720px;
  }

  :deep(.messages-table th:nth-child(1)),
  :deep(.messages-table td:nth-child(1)) {
    width: 125px;
  }

  :deep(.messages-table th:nth-child(2)),
  :deep(.messages-table td:nth-child(2)) {
    width: 115px;
  }

  :deep(.messages-table th:nth-child(3)),
  :deep(.messages-table td:nth-child(3)) {
    width: 90px;
  }

  :deep(.messages-table th:nth-child(4)),
  :deep(.messages-table td:nth-child(4)) {
    width: 28%;
  }

  :deep(.messages-table th),
  :deep(.messages-table td) {
    padding-inline: 10px;
  }
}

@media (width <= 640px) {
  .messages-toolbar {
    flex-wrap: wrap;
  }

  .messages-search {
    flex-basis: 100%;
  }

  .messages-channel {
    flex: 1;
  }

  .messages-date {
    width: 100%;
  }

  .messages-user {
    flex: 1;
  }
}
</style>
