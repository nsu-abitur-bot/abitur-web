<script setup lang="ts">
import { computed, onMounted, onUnmounted } from "vue"

const { data, refresh } = await useFetch("/api/stats/parsing")

let interval: any = null
onMounted(() => {
  interval = setInterval(() => {
    refresh()
  }, 60000)
})

onUnmounted(() => {
  if (interval) {
    clearInterval(interval)
  }
})

const lastParsedDate = computed(() => {
  if (!data.value?.lastParsedAt) {
    return "Никогда"
  }
  return new Date(data.value.lastParsedAt).toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  })
})
</script>

<template lang="pug">
ui-box(title="Статистика парсинга" class="w-full")
  div(class="flex flex-col gap-2")
    div
      span(class="font-bold text-gray-700 dark:text-gray-300 mr-2") Последний раз парсили рейтинговый список:
      span(class="text-primary-500 font-semibold") {{ lastParsedDate }}
    div(class="text-sm text-gray-500 mt-2")
      | Время последнего успешного обновления данных в базе (leaderboard).
</template>
