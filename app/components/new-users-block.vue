<script setup lang="ts">
interface TabsItem {
  label: string
  value: string
}

type PeriodType = "day" | "week" | "month" | "year" | "all_time"

const periodTabItems = ref<TabsItem[]>([
  {
    label: "24 часа",
    value: "day",
  },
  {
    label: "7 дней",
    value: "week",
  },
  {
    label: "30 дней",
    value: "month",
  },
  {
    label: "Год",
    value: "year",
  },
  {
    label: "Все время",
    value: "all_time",
  },
])

const period = ref<PeriodType>("day")

const { data: usersMap, status, error, refresh } = await useApi("/api/v1/users/count-stats")
const data = computed(() => usersMap.value?.[period.value])
</script>

<template lang="pug">
ui-box(title="Новые пользователи" class="w-full min-w-0")
  template(#right)
    u-button(icon="i-lucide-refresh-cw" aria-label="Обновить пользователей" color="neutral" variant="ghost" :loading="status === 'pending'" @click="() => refresh()")
  div(v-if="error" role="alert" class="admin-empty") Не удалось загрузить статистику пользователей.
  div(v-else-if="status === 'pending'" class="admin-empty") Загрузка…
  div(v-else class="admin-detail my-4")
    p(class="text-sm text-gray-500 dark:text-gray-400") Количество новых пользователей
    p(class="mt-2 text-3xl font-semibold text-gray-900 dark:text-gray-100") {{ data ?? '—' }}

  div(class="mt-4 overflow-x-auto")
    u-tabs(
      v-model="period"
      :items="periodTabItems"
      class="min-w-max"
    )
</template>
