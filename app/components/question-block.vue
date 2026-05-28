<script setup lang="ts">
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

const { data, refresh, status } = await useApi("/api/v1/logs/popular", {
  query,
})

watch(popularLimit, () => refresh())

const questions = computed(() => data.value?.questions ?? [])
const topQuestion = computed(() => questions.value[0])
const otherQuestions = computed(() => questions.value.slice(1))

const getQuestionVariants = (item: { question: string, variants?: string[] }) =>
  (item.variants ?? []).filter(variant => variant && variant !== item.question)
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
      details(v-if="getQuestionVariants(topQuestion).length" class="mt-3 not-italic group")
        summary(class="inline-flex cursor-pointer select-none items-center gap-1 text-xs font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300")
          u-icon(name="i-heroicons-chevron-right" class="size-3 transition-transform group-open:rotate-90")
          span Похожие формулировки ({{ getQuestionVariants(topQuestion).length }})
        ul(class="mt-2 space-y-1 pl-4 text-sm text-gray-500 dark:text-gray-400")
          li(v-for="variant in getQuestionVariants(topQuestion)" :key="variant" class="break-anywhere") {{ variant }}

    ol(v-if="otherQuestions.length" class="space-y-2 text-sm text-gray-600 dark:text-gray-300")
      li(v-for="(item, index) in otherQuestions" :key="item.question" class="flex items-start gap-2")
        span(class="w-5 text-right font-mono text-gray-400") {{ index + 2 }}.
        div(class="min-w-0 flex-1")
          div(class="font-medium text-gray-800 dark:text-gray-200") {{ item.question }}
          div(class="text-xs text-gray-500 dark:text-gray-400") {{ item.count }} запросов
          details(v-if="getQuestionVariants(item).length" class="mt-1 group")
            summary(class="inline-flex cursor-pointer select-none items-center gap-1 text-xs font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300")
              u-icon(name="i-heroicons-chevron-right" class="size-3 transition-transform group-open:rotate-90")
              span Похожие формулировки ({{ getQuestionVariants(item).length }})
            ul(class="mt-1 space-y-1 pl-4 text-xs text-gray-500 dark:text-gray-400")
              li(v-for="variant in getQuestionVariants(item)" :key="variant" class="break-anywhere") {{ variant }}
</template>
