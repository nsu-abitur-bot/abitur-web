<script setup lang="ts">
const { data: statsData, status, error, refresh } = await useApi("/api/v1/stats/parsing", { lazy: true })

const formattedDate = computed(() => {
  if (!statsData.value?.last_parsed_at) {
    return "Не выполнялся"
  }
  const date = new Date(statsData.value.last_parsed_at)
  if (Number.isNaN(date.getTime())) {
    return "Некорректная дата"
  }
  return date.toLocaleString("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
})
</script>

<template lang="pug">
ui-box(title="Синхронизация списков" class="w-full min-w-0")
  template(#right)
    u-button(
      icon="i-lucide-refresh-cw"
      aria-label="Обновить статистику парсинга"
      color="neutral"
      variant="ghost"
      :loading="status === 'pending'"
      @click="() => refresh()"
    )
  ui-empty-state(v-if="error" kind="error" title="Не удалось загрузить статистику парсинга")
  ui-empty-state(v-else-if="status === 'pending'" kind="loading" title="Загрузка статистики…")
  ui-empty-state(v-else-if="!statsData || (!statsData.last_parsed_at && !statsData.total_lists)" title="Нет данных о парсинге списков")
  div(v-else class="space-y-4 my-4")
    div
      p(class="text-sm text-gray-500 dark:text-gray-400") Последний парсинг списков
      p(class="mt-1 text-2xl font-semibold text-gray-900 dark:text-gray-100") {{ formattedDate }}
    div
      p(class="text-sm text-gray-500 dark:text-gray-400") Активных рейтинговых списков
      p(class="mt-1 text-2xl font-semibold text-gray-900 dark:text-gray-100") {{ statsData.total_lists }}
</template>
