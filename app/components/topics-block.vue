<script setup lang="ts">
import type { ChartData, ChartOptions } from "chart.js"
import { Doughnut as ChartDoughnut } from "vue-chartjs"

interface TopicData {
  id: string
  label: string
  value: number
  color: string
}

const apiBaseUrl = useRuntimeConfig().public.apiBaseUrl
const { topics, popularLimit } = useStatsSettings()
const { topicMap, setTopicForQuestion } = useTopicClassification()

const query = computed(() => ({
  limit: popularLimit.value,
}))

const { data, refresh, status } = await useMyApi("/api/v1/logs/popular", {
  baseURL: apiBaseUrl,
  query,
})

watch(popularLimit, () => refresh())

const questions = computed(() => data.value?.questions ?? [])

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

const topicOptions = computed(() => [
  { label: "Без темы", value: "" },
  ...topics.value.map(topic => ({ label: topic.label, value: topic.id })),
])

const getTopicColor = (index: number) => palette[index % palette.length] ?? palette[0]!

const aggregatedTopics = computed<TopicData[]>(() => {
  const counts = new Map<string, number>()

  for (const item of questions.value) {
    const topicId = topicMap.value[item.question] || "unclassified"
    counts.set(topicId, (counts.get(topicId) ?? 0) + item.count)
  }

  const topicEntries: TopicData[] = []

  topics.value.forEach((topic, index) => {
    const value = counts.get(topic.id) ?? 0
    if (value > 0) {
      topicEntries.push({
        id: topic.id,
        label: topic.label,
        value,
        color: getTopicColor(index),
      })
    }
  })

  const unclassifiedCount = counts.get("unclassified") ?? 0
  if (unclassifiedCount > 0) {
    topicEntries.push({
      id: "unclassified",
      label: "Без темы",
      value: unclassifiedCount,
      color: "#94A3B8",
    })
  }

  return topicEntries
})

const { gridColor } = useChartColors()

const chartData = computed<ChartData<"doughnut"> | null>(() => aggregatedTopics.value.length
  ? {
      labels: aggregatedTopics.value.map(item => item.label),
      datasets: [{
        data: aggregatedTopics.value.map(item => item.value),
        borderColor: gridColor.value,
        backgroundColor: aggregatedTopics.value.map(item => item.color),
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
  div(class="h-64 w-full")
    chart-doughnut(v-if="chartData" :data="chartData" :options="chartOptions")
    div(v-else class="h-full flex items-center justify-center text-sm text-gray-500 dark:text-gray-400")
      | Нет данных для построения графика.

  div(class="mt-4 space-y-3")
    div(class="text-xs text-gray-500 dark:text-gray-400") Назначьте тему для каждого вопроса.

    div(v-if="status === 'pending'" class="text-sm text-gray-500 dark:text-gray-400") Загрузка...
    div(v-else-if="!questions.length" class="text-sm text-gray-500 dark:text-gray-400") Вопросов нет.
    div(v-else class="space-y-3")
      div(
        v-for="item in questions"
        :key="item.question"
        class="flex flex-wrap items-center gap-3 rounded-lg border border-gray-200 dark:border-gray-800 p-3"
      )
        div(class="flex-1")
          div(class="text-sm font-medium text-gray-800 dark:text-gray-200") {{ item.question }}
          div(class="text-xs text-gray-500 dark:text-gray-400") {{ item.count }} запросов
        u-select(
          :items="topicOptions"
          :model-value="topicMap[item.question] || ''"
          class="min-w-48"
          @update:model-value="(value) => setTopicForQuestion(item.question, value || null)"
        )
</template>
