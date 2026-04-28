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

// Fetch API data. Use generic data to prevent TS errors since we only mocked it for now
const { data: usersMap } = await useApi("/api/v1/users/count-stats")

const data = ref<number>(usersMap.value?.[period.value] ?? 0)

watch(period, (newPeriod) => {
  data.value = usersMap.value?.[newPeriod] ?? 0
})
</script>

<template lang="pug">
ui-box(title="Новые пользователи" class="w-full")
  div(class="my-4 rounded-lg bg-gray-50 dark:bg-gray-800 p-6")
    p(class="text-sm text-gray-500 dark:text-gray-400") Количество новых пользователей
    p(class="mt-2 text-4xl font-bold text-gray-900 dark:text-gray-100") {{ data }}

  div(class="mt-4 overflow-x-auto")
    u-tabs(
      v-model="period"
      :items="periodTabItems"
      class="min-w-max"
    )
</template>
