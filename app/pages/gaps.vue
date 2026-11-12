<script setup lang="ts">
// Отчёт о пробелах наполнения (#262): один экран редактора вместо четырёх.
const periods = [
  { label: "7 дней", value: 7 },
  { label: "30 дней", value: 30 },
  { label: "90 дней", value: 90 },
]
const days = ref(30)
const query = computed(() => ({ days: days.value, limit: 10 }))

const { data, status, error } = await useApi("/api/v1/reports/gaps", {
  query,
  lazy: true,
})

const share = (value: number | null | undefined) =>
  typeof value === "number" ? `${Math.round(value * 100)}%` : "—"
</script>

<template lang="pug">
ui-page(title="Пробелы наполнения")
  div(v-if="error" class="text-red-600") Не удалось загрузить отчёт.
  div(v-else-if="status === 'pending'") Загрузка…

  template(v-else-if="data")
    div(class="flex items-center gap-2 mb-4")
      ui-box(
        v-for="p in periods"
        :key="p.value"
        class="p-2"
        :class="{ 'ring-2': days === p.value }"
      )
        button(class="px-2" @click="days = p.value") {{ p.label }}

    div(class="grid grid-cols-1 lg:grid-cols-2 gap-4")
      ui-box(title="Качество ответов за период")
        ul(class="space-y-1 text-sm")
          li Вопросов: {{ data.quality.questions }}, ответов модели: {{ data.quality.answers }}
          li Честных «не нашёл»: {{ data.quality.no_answer }} ({{ share(data.quality.no_answer_share) }})
          li Ошибок: {{ data.quality.errors }} ({{ share(data.quality.error_share) }})

      ui-box(title="Темы вопросов")
        ul(class="space-y-1 text-sm")
          li(v-for="t in data.topics" :key="t.topic") {{ t.topic }} — {{ t.count }}

      ui-box(title="Популярные вопросы")
        ol(class="space-y-1 text-sm list-decimal list-inside")
          li(v-for="q in data.popular" :key="q.question") {{ q.question }} — {{ q.count }}

      ui-box(title="Без ответа — очередь наполнения")
        ol(class="space-y-1 text-sm list-decimal list-inside")
          li(v-for="q in data.unanswered" :key="q.question") {{ q.question }} — {{ q.count }}

      ui-box(title="Ответы оценены негативно")
        ul(class="space-y-1 text-sm")
          li(v-for="q in data.disliked" :key="q.question")
            | {{ q.question }} — 👎 {{ q.negative }} из {{ q.rated }} оценок
</template>
