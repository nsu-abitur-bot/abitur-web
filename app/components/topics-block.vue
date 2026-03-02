<script setup lang="ts">
import type { ChartData, ChartOptions } from "chart.js"
import { Doughnut as ChartDoughnut } from "vue-chartjs"

interface TopicData {
  label: string
  value: number
  color: string
}

interface TabsItem {
  label: string
  value: string
}

const data = ref<TopicData[]>([
  { label: "Список документов", value: 300, color: "#FF6384" },
  { label: "Проживание в общежитии", value: 150, color: "#36A2EB" },
  { label: "Дата подачи документов", value: 100, color: "#FFCE56" },
  { label: "Перевод на бюджетное обучение", value: 50, color: "#4BC0C0" },
])

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
const period = ref<"1d" | "7d" | "30d" | "all">("1d")

watch(period, () => {
  data.value = data.value.map(item => ({
    ...item,
    value: Math.floor(Math.random() * 300) + 50,
  }))
})

const { gridColor } = useChartColors()

const chartData = computed<ChartData<"doughnut"> | null>(() => data.value
  ? {
      labels: data.value.map(item => item.label),
      datasets: [{
        data: data.value.map(item => item.value),
        borderColor: gridColor.value,
        backgroundColor: data.value.map(item => item.color),
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
ui-box(title="Популярные темы")
  div(class="h-64")
    chart-doughnut(v-if="chartData" :data="chartData" :options="chartOptions")

  u-tabs(
    v-model="period"
    :items="periodTabItems"
    class="mt-4"
  )
</template>
