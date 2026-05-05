<script setup lang="ts">
import type { ChartData, ChartOptions } from "chart.js"
import { Line as ChartLine } from "vue-chartjs"

interface TabsItem {
  label: string
  value: string
}

type PeriodType = "1d" | "7d" | "30d" | "all"

const periodTabItems = ref<TabsItem[]>([
  { label: "24 часа", value: "1d" },
  { label: "7 дней", value: "7d" },
  { label: "30 дней", value: "30d" },
  { label: "Все время", value: "all" },
])
const period = ref<PeriodType>("1d")

const periodConfig: Record<PeriodType, { groupBy: string, daysBack?: number }> = {
  "1d": { groupBy: "hour", daysBack: 1 },
  "7d": { groupBy: "day", daysBack: 7 },
  "30d": { groupBy: "day", daysBack: 30 },
  "all": { groupBy: "week" },
}

const queryParams = computed(() => {
  const config = periodConfig[period.value]
  const now = new Date()
  const params: Record<string, string> = { group_by: config.groupBy }
  if (config.daysBack !== undefined) {
    const start = new Date(now)
    start.setDate(start.getDate() - config.daysBack)
    params.start = start.toISOString()
    params.end = now.toISOString()
  }
  return params
})

const { data: statsData } = await useApi("/api/v1/logs/request-stats", {
  query: queryParams,
})

function formatLabel(isoDate: string, groupBy: string): string {
  const date = new Date(isoDate)
  if (groupBy === "hour") {
    return date.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })
  }
  if (groupBy === "day") {
    return date.toLocaleDateString("ru-RU", { day: "numeric", month: "short" })
  }
  return date.toLocaleDateString("ru-RU", { month: "short", year: "numeric" })
}

const { lineColor, ticksColor, gridColor } = useChartColors()

const chartData = computed<ChartData<"line"> | null>(() => {
  const buckets = statsData.value?.buckets
  if (!buckets) {
    return null
  }
  const groupBy = periodConfig[period.value].groupBy
  return {
    labels: buckets.map(b => formatLabel(b.period, groupBy)),
    datasets: [{
      data: buckets.map(b => b.count),
      borderColor: lineColor.value,
      borderWidth: 2,
      tension: 0.3,
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
      ticks: { color: ticksColor.value },
      grid: { display: false },
      border: { display: false },
    },
    y: {
      position: "right",
      ticks: { color: ticksColor.value },
      grid: { color: gridColor.value },
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
