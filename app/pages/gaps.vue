<script setup lang="ts">
// Отчёт о пробелах наполнения (#262): один экран редактора вместо четырёх.
const periods = [
  { label: "7 дней", value: 7 },
  { label: "30 дней", value: 30 },
  { label: "90 дней", value: 90 },
]
const days = ref(30)
const query = computed(() => ({ days: days.value, limit: 10 }))

const { data, refresh, status, error } = await useApi("/api/v1/reports/gaps", {
  query,
  lazy: true,
})

const share = (value: number | null | undefined) =>
  typeof value === "number" ? `${Math.round(value * 100)}%` : "—"

// null только когда данных нет вовсе: v-if по report сужает тип в шаблоне.
const report = computed(() => {
  const value = data.value
  if (!value) {
    return null
  }
  const hasAnything =
    value.quality.questions > 0
    || value.topics.length > 0
    || value.popular.length > 0
    || value.unanswered.length > 0
    || value.disliked.length > 0
  return hasAnything ? value : null
})
</script>

<template lang="pug">
ui-page(title="Пробелы наполнения")
  ui-empty-state(v-if="status === 'pending'" kind="loading" title="Загрузка отчёта…")
  ui-empty-state(
    v-else-if="error"
    kind="error"
    title="Не удалось загрузить отчёт о пробелах"
    description="Проверьте доступность API и повторите попытку."
  )
    button(class="admin-btn" @click="refresh()") Повторить
  ui-empty-state(
    v-else-if="!report"
    kind="empty"
    title="Нет данных за период"
    description="За выбранный период вопросов от абитуриентов не было."
  )
  template(v-else)
    div(class="flex items-center gap-2 mb-4")
      div(
        v-for="p in periods"
        :key="p.value"
        class="p-2"
        :class="{ 'ring-2': days === p.value }"
      )
        button(class="px-2" @click="days = p.value") {{ p.label }}

    div(class="grid grid-cols-1 lg:grid-cols-2 gap-4")
      ui-box(title="Качество ответов за период")
        ul(class="space-y-1 text-sm")
          li Вопросов: {{ report.quality.questions }}, ответов модели: {{ report.quality.answers }}
          li Честных «не нашёл»: {{ report.quality.no_answer }} ({{ share(report.quality.no_answer_share) }})
          li Ошибок: {{ report.quality.errors }} ({{ share(report.quality.error_share) }})

      ui-box(title="Темы вопросов")
        ul(class="space-y-1 text-sm")
          li(v-for="t in report.topics" :key="t.topic") {{ t.topic }} — {{ t.count }}

      ui-box(title="Популярные вопросы")
        ol(class="space-y-1 text-sm list-decimal list-inside")
          li(v-for="q in report.popular" :key="q.question") {{ q.question }} — {{ q.count }}

      ui-box(title="Без ответа — очередь наполнения")
        ol(class="space-y-1 text-sm list-decimal list-inside")
          li(v-for="q in report.unanswered" :key="q.question") {{ q.question }} — {{ q.count }}

      ui-box(title="Ответы оценены негативно")
        ul(class="space-y-1 text-sm")
          li(v-for="q in report.disliked" :key="q.question")
            | {{ q.question }} — 👎 {{ q.negative }} из {{ q.rated }} оценок
</template>
