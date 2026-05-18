<script setup lang="ts">
import type { ChartData, ChartOptions } from "chart.js"
import { Doughnut as ChartDoughnut } from "vue-chartjs"

import type { TopicStat } from "~/services/topics"
import { getTopicStats } from "~/services/topics"

interface TopicDatum {
  id: string
  label: string
  value: number
  color: string
}

const palette = [
  "#2563EB",
  "#F97316",
  "#22C55E",
  "#E11D48",
  "#A855F7",
  "#0EA5E9",
  "#F59E0B",
  "#14B8A6",
]

const getColor = (index: number) => palette[index % palette.length] ?? palette[0]!

const { data: stats, refresh, status } = await useAsyncData<TopicStat[]>("stats-topics", () => getTopicStats())

const extractLabel = (item: TopicStat, fallback: string): string => {
  const candidates = ["label", "name", "title", "topic_label", "topic"]
  for (const key of candidates) {
    const value = item[key]
    if (typeof value === "string" && value.trim()) {
      return value
    }
  }
  return fallback
}

const extractCount = (item: TopicStat): number => {
  const candidates = ["count", "total", "messages", "value"]
  for (const key of candidates) {
    const value = item[key]
    if (typeof value === "number" && Number.isFinite(value)) {
      return value
    }
  }
  return 0
}

const extractId = (item: TopicStat, index: number): string => {
  if (typeof item.topic_id === "number") {
    return `topic-${item.topic_id}`
  }
  const id = item.id
  if (typeof id === "number" || typeof id === "string") {
    return `topic-${id}`
  }
  return `topic-${index}`
}

const topicsData = computed<TopicDatum[]>(() => {
  const list = stats.value ?? []
  return list
    .map((item, index) => ({
      id: extractId(item, index),
      label: extractLabel(item, `Тема ${index + 1}`),
      value: extractCount(item),
      color: getColor(index),
    }))
    .filter(item => item.value > 0)
})

const { gridColor } = useChartColors()

const chartData = computed<ChartData<"doughnut"> | null>(() => topicsData.value.length
  ? {
      labels: topicsData.value.map(item => item.label),
      datasets: [{
        data: topicsData.value.map(item => item.value),
        borderColor: gridColor.value,
        backgroundColor: topicsData.value.map(item => item.color),
        hoverOffset: 4,
      }],
    }
  : null)

const chartOptions = computed<ChartOptions<"doughnut">>(() => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: "bottom",
      align: "start",
    },
  },
}))
</script>

<template lang="pug">
ui-box(title="Популярные темы" class="w-full")
  template(#right)
    u-button(
      icon="i-heroicons-arrow-path"
      color="neutral"
      variant="soft"
      size="sm"
      :loading="status === 'pending'"
      @click="() => refresh()"
    )

  div(class="h-64 w-full")
    chart-doughnut(v-if="chartData" :data="chartData" :options="chartOptions")
    div(v-else class="h-full flex items-center justify-center text-sm text-gray-500 dark:text-gray-400")
      | Нет данных для построения графика.

  div(v-if="topicsData.length" class="mt-4 space-y-2")
    div(
      v-for="item in topicsData"
      :key="item.id"
      class="flex items-center justify-between text-sm text-gray-700 dark:text-gray-300"
    )
      div(class="flex items-center gap-2")
        span(class="inline-block w-3 h-3 rounded-full" :style="`background-color: ${item.color}`")
        span {{ item.label }}
      span(class="text-gray-500 dark:text-gray-400") {{ item.value }}
</template>
