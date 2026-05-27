<script setup lang="ts">
import { getFeedbackReport, listFeedbackReports, updateFeedbackReportStatus } from "~/services/feedback"
import type { FeedbackReportResponse, FeedbackStatus } from "~/types/feedback"

const statusFilter = ref<FeedbackStatus | null>(null)
const userIdFilter = ref("")
const sessionIdFilter = ref("")
const limit = ref(50)
const offset = ref(0)
const toast = useToast()

const statusOptions: Array<{ label: string, value: FeedbackStatus | null }> = [
  { label: "Все", value: null },
  { label: "Открытые", value: "open" },
  { label: "Проверенные", value: "reviewed" },
  { label: "Игнорировать", value: "ignored" },
]

const statusMeta: Record<FeedbackStatus, { label: string, color: "primary" | "success" | "warning" | "neutral" }> = {
  open: { label: "Открыто", color: "warning" },
  reviewed: { label: "Проверено", color: "success" },
  ignored: { label: "Игнорируется", color: "neutral" },
}

const getStatusMeta = (status: string) => {
  return statusMeta[status as FeedbackStatus] ?? { label: status, color: "neutral" as const }
}

const { data, status, refresh } = await useAsyncData("feedback-reports", () => listFeedbackReports({
  status: statusFilter.value,
  user_id: userIdFilter.value ? Number(userIdFilter.value) : null,
  session_id: sessionIdFilter.value.trim() || null,
  limit: limit.value,
  offset: offset.value,
}), {
  watch: [statusFilter, limit, offset],
})

const reports = computed(() => data.value?.reports ?? [])
const total = computed(() => data.value?.total ?? 0)
const page = computed(() => Math.floor(offset.value / limit.value) + 1)
const canGoBack = computed(() => offset.value > 0)
const canGoForward = computed(() => offset.value + limit.value < total.value)

const selectedReport = ref<FeedbackReportResponse | null>(null)
const isDetailsOpen = ref(false)
const isDetailsLoading = ref(false)
const isUpdatingStatus = ref(false)

const applyFilters = async () => {
  offset.value = 0
  await refresh()
}

const openDetails = async (reportId: number) => {
  isDetailsOpen.value = true
  isDetailsLoading.value = true
  try {
    selectedReport.value = await getFeedbackReport(reportId)
  } catch {
    toast.add({ title: "Ошибка", description: "Не удалось загрузить обращение", color: "error" })
  } finally {
    isDetailsLoading.value = false
  }
}

const updateStatus = async (reportId: number, nextStatus: FeedbackStatus) => {
  isUpdatingStatus.value = true
  try {
    const updated = await updateFeedbackReportStatus(reportId, { status: nextStatus })
    if (selectedReport.value?.id === reportId) {
      selectedReport.value = updated
    }
    toast.add({ title: "Статус обновлен", color: "success" })
    await refresh()
  } catch {
    toast.add({ title: "Ошибка", description: "Не удалось обновить статус", color: "error" })
  } finally {
    isUpdatingStatus.value = false
  }
}

const formatDate = (value: string) => {
  return new Date(value).toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

const goBack = () => {
  if (canGoBack.value) {
    offset.value = Math.max(0, offset.value - limit.value)
  }
}

const goForward = () => {
  if (canGoForward.value) {
    offset.value += limit.value
  }
}
</script>

<template lang="pug">
u-container(class="py-8 space-y-6")
  div(class="flex items-center justify-between gap-4")
    h1(class="text-3xl font-bold text-gray-900 dark:text-white") Обратная связь
    u-button(
      icon="i-heroicons-arrow-path"
      color="neutral"
      variant="soft"
      :loading="status === 'pending'"
      @click="() => refresh()"
    ) Обновить

  ui-box(title="Фильтры")
    div(class="flex flex-wrap items-end gap-3")
      u-form-field(label="Статус" class="w-full sm:w-52")
        u-select(v-model="statusFilter" :items="statusOptions" class="w-full")
      u-form-field(label="User ID" class="w-full sm:w-40")
        u-input(v-model="userIdFilter" type="number" placeholder="123456" class="w-full" @keydown.enter.prevent="applyFilters")
      u-form-field(label="Session ID" class="w-full sm:flex-1 min-w-64")
        u-input(v-model="sessionIdFilter" placeholder="session..." class="w-full" @keydown.enter.prevent="applyFilters")
      u-button(color="primary" @click="applyFilters") Применить

  ui-box(:title="`Обращения (${total})`")
    div(v-if="status === 'pending' && !reports.length" class="py-10 flex justify-center text-gray-500")
      u-icon(name="i-heroicons-arrow-path" class="animate-spin w-8 h-8")

    div(v-else-if="!reports.length" class="py-12 text-center text-gray-500 bg-gray-50 dark:bg-gray-800 rounded-lg")
      u-icon(name="i-heroicons-inbox" class="w-12 h-12 mx-auto text-gray-400 mb-3")
      p Обращений не найдено.

    div(v-else class="divide-y divide-gray-100 dark:divide-gray-800")
      div(v-for="report in reports" :key="report.id" class="py-4 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between")
        div(class="min-w-0 space-y-2")
          div(class="flex flex-wrap items-center gap-2")
            u-badge(:color="getStatusMeta(report.status).color" variant="subtle")
              | {{ getStatusMeta(report.status).label }}
            span(class="text-xs text-gray-500") {{ `#${report.id}` }}
            span(class="text-xs text-gray-500") User {{ report.user_id }}
            span(class="text-xs text-gray-500") {{ formatDate(report.created_at) }}
          p(class="text-sm text-gray-900 dark:text-gray-100 whitespace-pre-wrap") {{ report.comment }}
          p(v-if="report.question" class="text-xs text-gray-500 line-clamp-2") Вопрос: {{ report.question }}
        div(class="flex shrink-0 gap-2")
          u-button(color="neutral" variant="soft" size="sm" @click="openDetails(report.id)") Детали
          u-button(
            v-if="report.status !== 'reviewed'"
            color="success"
            variant="soft"
            size="sm"
            :loading="isUpdatingStatus"
            @click="updateStatus(report.id, 'reviewed')"
          ) Проверено
          u-button(
            v-if="report.status !== 'ignored'"
            color="neutral"
            variant="soft"
            size="sm"
            :loading="isUpdatingStatus"
            @click="updateStatus(report.id, 'ignored')"
          ) Игнорировать

    div(class="mt-6 flex items-center justify-between text-sm text-gray-500")
      span Страница {{ page }}
      div(class="flex gap-2")
        u-button(color="neutral" variant="soft" size="sm" :disabled="!canGoBack" @click="goBack") Назад
        u-button(color="neutral" variant="soft" size="sm" :disabled="!canGoForward" @click="goForward") Вперед

  u-slideover(v-model:open="isDetailsOpen" title="Обращение обратной связи")
    template(#body)
      div(v-if="isDetailsLoading" class="py-20 flex justify-center text-gray-500")
        u-icon(name="i-heroicons-arrow-path" class="animate-spin w-8 h-8")
      div(v-else-if="selectedReport" class="space-y-5")
        div(class="flex items-center gap-2")
          u-badge(:color="getStatusMeta(selectedReport.status).color" variant="subtle")
            | {{ getStatusMeta(selectedReport.status).label }}
          span(class="text-sm text-gray-500") {{ `#${selectedReport.id}` }}

        div(class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm")
          div
            div(class="text-xs text-gray-500") User ID
            div(class="font-medium") {{ selectedReport.user_id }}
          div
            div(class="text-xs text-gray-500") Канал
            div(class="font-medium") {{ selectedReport.channel }}
          div(class="sm:col-span-2")
            div(class="text-xs text-gray-500") Session ID
            div(class="font-mono text-xs break-all") {{ selectedReport.session_id }}
          div
            div(class="text-xs text-gray-500") Создано
            div(class="font-medium") {{ formatDate(selectedReport.created_at) }}
          div(v-if="selectedReport.reviewed_at")
            div(class="text-xs text-gray-500") Проверено
            div(class="font-medium") {{ formatDate(selectedReport.reviewed_at) }}

        div
          div(class="text-xs text-gray-500 mb-1") Комментарий
          div(class="rounded-lg bg-gray-50 dark:bg-gray-800 p-3 whitespace-pre-wrap text-sm") {{ selectedReport.comment }}

        div(v-if="selectedReport.question")
          div(class="text-xs text-gray-500 mb-1") Вопрос
          div(class="rounded-lg bg-gray-50 dark:bg-gray-800 p-3 whitespace-pre-wrap text-sm") {{ selectedReport.question }}

        div(v-if="selectedReport.bot_response")
          div(class="text-xs text-gray-500 mb-1") Ответ бота
          div(class="rounded-lg bg-gray-50 dark:bg-gray-800 p-3 whitespace-pre-wrap text-sm") {{ selectedReport.bot_response }}

        div(v-if="selectedReport.logs_snapshot?.length")
          div(class="text-xs text-gray-500 mb-1") Снимок логов
          pre(class="rounded-lg bg-gray-950 text-gray-100 p-3 overflow-x-auto text-xs") {{ JSON.stringify(selectedReport.logs_snapshot, null, 2) }}

        div(class="flex flex-wrap gap-2 pt-2")
          u-button(color="warning" variant="soft" :loading="isUpdatingStatus" @click="updateStatus(selectedReport.id, 'open')") Открыто
          u-button(color="success" variant="soft" :loading="isUpdatingStatus" @click="updateStatus(selectedReport.id, 'reviewed')") Проверено
          u-button(color="neutral" variant="soft" :loading="isUpdatingStatus" @click="updateStatus(selectedReport.id, 'ignored')") Игнорировать
</template>
