<script setup lang="ts">
import type { ChartData, ChartOptions } from "chart.js"
import { Line as ChartLine } from "vue-chartjs"

interface TabsItem {
  label: string
  value: string
}

const data = ref([
  { label: "10:00", requests: 100 },
  { label: "11:00", requests: 120 },
  { label: "12:00", requests: 115 },
  { label: "13:00", requests: 130 },
  { label: "14:00", requests: 125 },
  { label: "15:00", requests: 140 },
  { label: "16:00", requests: 135 },
])

const lineColor = ref("rgb(75, 192, 192)")
const ticksColor = ref("#666")
const gridColor = ref("#e5e5e5")

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

const chartData = computed<ChartData<"line"> | null>(() => data.value && {
  labels: data.value.map(item => item.label),
  datasets: [{
    data: data.value.map(item => item.requests),
    // Цвет линии графика.
    borderColor: lineColor.value,
    borderWidth: 2,
    // Сглаживание (значение случайное, ничем не обосновано).
    tension: 0.3,
    // Чтобы не было точек на графике.
    pointRadius: 0,
  }],
})

const chartOptions = computed<ChartOptions<"line">>(() => ({
  responsive: true,
  maintainAspectRatio: false,
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
ui-box(title="Количество запросов")
  div(class="h-64")
    chart-line(v-if="chartData" :data="chartData" :options="chartOptions")

  u-tabs(
    v-model="period"
    :items="periodTabItems"
    class="mt-4"
  )
</template>
