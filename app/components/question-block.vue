<script setup lang="ts">
const apiBaseUrl = useRuntimeConfig().public.apiBaseUrl
const { popularLimit } = useStatsSettings()

const popularLimitInput = computed({
  get: () => popularLimit.value,
  set: (value: number | string) => {
    const numeric = Number(value)
    if (Number.isNaN(numeric)) {
      return
    }

    const normalized = Math.min(50, Math.max(1, Math.round(numeric)))
    popularLimit.value = normalized
  },
})

const query = computed(() => ({
  limit: popularLimit.value,
}))

const { data, refresh, status } = await useMyApi("/api/v1/logs/popular", {
  baseURL: apiBaseUrl,
  query,
})

watch(popularLimit, () => refresh())

const questions = computed(() => data.value?.questions ?? [])
const topQuestion = computed(() => questions.value[0])
</script>

<template lang="pug">
ui-box(title="Самые популярные вопросы" class="w-full")
  template(#right)
    div(class="flex items-center gap-2")
      span(class="text-xs text-gray-500 dark:text-gray-400") Показать
      u-input(
        v-model.number="popularLimitInput"
        type="number"
        min="1"
        max="50"
        class="w-20"
      )

  div(v-if="status === 'pending'" class="py-6 text-sm text-gray-500 dark:text-gray-400") Загрузка...

  div(v-else-if="!topQuestion" class="py-6 text-sm text-gray-500 dark:text-gray-400") Нет данных.

  div(v-else class="space-y-4")
    blockquote(class="border-l-4 border-primary-500 pl-4 py-2 bg-gray-50 dark:bg-gray-800 rounded-r-lg italic text-lg text-gray-700 dark:text-gray-300")
      p(class="mb-2") "{{ topQuestion.question }}"
      footer(class="text-sm font-bold text-gray-500 dark:text-gray-400 not-italic")
        | {{ topQuestion.count }} запросов

    ol(class="space-y-2 text-sm text-gray-600 dark:text-gray-300")
      li(v-for="(item, index) in questions" :key="item.question" class="flex items-start gap-2")
        span(class="w-5 text-right font-mono text-gray-400") {{ index + 1 }}.
        div(class="flex-1")
          div(class="font-medium text-gray-800 dark:text-gray-200") {{ item.question }}
          div(class="text-xs text-gray-500 dark:text-gray-400") {{ item.count }} запросов
</template>
