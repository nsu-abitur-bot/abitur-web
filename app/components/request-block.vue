<script setup lang="ts">
import type { ChartData, ChartOptions } from "chart.js"
import { Line as ChartLine } from "vue-chartjs"

interface TabsItem {
  label: string
  value: string
}

type PeriodType = "1d" | "7d" | "30d" | "all"
type GroupBy = "hour" | "day" | "week" | "month"

interface RequestStatsBucket {
  period: string
  count: number
}

interface RequestStatsResponse {
  total: number
  group_by: GroupBy
  start: string
  end: string
  buckets: RequestStatsBucket[]
}

const { lineColor, ticksColor, gridColor } = useChartColors()

const periodTabItems = ref<TabsItem[]>([
  {
    label: "24 часа",
    value: "1d",
  },
  {
    label: "7 дней",
    value: "7d",
  },
  {
    label: "30 дней",
    value: "30d",
  },
  {
    label: "Все время",
    value: "all",
  },
])
const period = ref<PeriodType>("1d")

const apiBaseUrl = useRuntimeConfig().public.apiBaseUrl

const range = computed(() => {
  const end = new Date()
  const start = new Date(end)
  let groupBy: GroupBy = "day"

  switch (period.value) {
    case "1d":
      start.setHours(end.getHours() - 24)
      groupBy = "hour"
      break
    case "7d":
      start.setDate(end.getDate() - 7)
      groupBy = "day"
      break
    case "30d":
      start.setDate(end.getDate() - 30)
      groupBy = "day"
      break
    case "all":
      start.setDate(end.getDate() - 365)
      groupBy = "month"
      break
  }

  return { start, end, groupBy }
})

const query = computed(() => ({
  start: range.value.start.toISOString(),
  end: range.value.end.toISOString(),
  group_by: range.value.groupBy,
  message_type: "user_input",
}))

const { data, refresh } = await useMyApi<RequestStatsResponse>("/api/v1/logs/request-stats", {
  baseURL: apiBaseUrl,
  query,
})

watch(period, () => refresh())

const formatLabel = (periodIso: string, groupBy: GroupBy) => {
  const date = new Date(periodIso)

  switch (groupBy) {
    case "hour":
      return date.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })
    case "month":
      return date.toLocaleDateString("ru-RU", { month: "short" })
    case "week":
    case "day":
    default:
      return date.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit" })
  }
}

const buckets = computed(() => data.value?.buckets ?? [])

const chartData = computed<ChartData<"line"> | null>(() => {
  if (!buckets.value.length) {
    return null
  }

  const groupBy = data.value?.group_by ?? range.value.groupBy

  return {
    labels: buckets.value.map(item => formatLabel(item.period, groupBy)),
    datasets: [{
      data: buckets.value.map(item => item.count),
      // Цвет линии графика.
      borderColor: lineColor.value,
      borderWidth: 2,
      // Сглаживание (значение случайное, ничем не обосновано).
      tension: 0.3,
      // Чтобы не было точек на графике.
      pointRadius: 0,
    }],
  }
})

const chartOptions = computed<ChartOptions<"line">>(() => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
  },
  scales: {
    x: {
      // Цвет подписей.
      ticks: { color: ticksColor.value },
      // Цвет вертикальных линий сетки.
      grid: { display: false },
      // Цвет нижней границы.
      border: { display: false },
    },
    y: {
      position: "right",
      // Цвет подписей.
      ticks: { color: ticksColor.value },
      // Цвет горизонтальных линий сетки.
      grid: { color: gridColor.value },
      // Цвет правой границы.
      border: { display: false },
    },
  },
}))
</script>

<template lang="pug">
ui-box(title="Количество запросов" class="w-full")
  div(class="h-64 w-full")
    chart-line(v-if="chartData" :data="chartData" :options="chartOptions")

  div(class="mt-4 overflow-x-auto")
    u-tabs(
      v-model="period"
      :items="periodTabItems"
      class="min-w-max"
    )
</template>
