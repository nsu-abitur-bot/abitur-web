<script setup lang="ts">
import type { EvaluationStatus } from "~/services/evaluations"
import { summarizeEvaluation } from "~/services/evaluations"

const { data, error, status, refresh } = await useAsyncData("evaluation-status", () =>
  apiFetch<EvaluationStatus>("/api/v1/evals/status"))
const isStarting = ref(false)
const awaitingStart = ref(false)
const runError = ref("")
const isPolling = ref(false)
const result = computed(() => data.value?.last_result)
const summary = computed(() => summarizeEvaluation(result.value ?? {}))
const cases = computed(() => summary.value.cases)
const isRunning = computed(() => data.value?.is_running === true)
const toast = useToast()
let timer: ReturnType<typeof setInterval> | undefined
let startChecks = 0
let previousResult = ""

const poll = async () => {
  if (isPolling.value || (!isRunning.value && !awaitingStart.value)) {
    return
  }
  isPolling.value = true
  try {
    await refresh()
    if (error.value) {
      awaitingStart.value = false
      return
    }
    if (isRunning.value || data.value?.error || (data.value?.last_result && JSON.stringify(data.value.last_result) !== previousResult)) {
      awaitingStart.value = false
    } else if (awaitingStart.value && ++startChecks >= 10) {
      awaitingStart.value = false
      runError.value = "Запуск не подтверждён. Обновите статус перед повторным запуском."
    }
  } finally {
    isPolling.value = false
  }
}

const refreshManually = async () => {
  await refresh()
  if (!error.value) {
    runError.value = ""
  }
}

const run = async () => {
  if (isRunning.value || isStarting.value || awaitingStart.value || error.value || runError.value) {
    return
  }
  isStarting.value = true
  runError.value = ""
  try {
    const response = await apiFetch<{ message?: string }>("/api/v1/evals/run", { method: "POST" })
    toast.add({ title: response.message || "Запрос на запуск принят", color: "info" })
    previousResult = JSON.stringify(result.value ?? null)
    startChecks = 0
    awaitingStart.value = true
    await poll()
  } catch (err: unknown) {
    runError.value = err instanceof Error ? err.message : "Не удалось запустить оценку"
  } finally {
    isStarting.value = false
  }
}

onMounted(() => {
  timer = setInterval(poll, 3000)
})
onUnmounted(() => {
  if (timer) {
    clearInterval(timer)
  }
})
</script>

<template lang="pug">
ui-page(title="Тестирование" description="Автоматическая оценка ответов бота на наборе проверочных вопросов.")
  template(#actions)
    u-button(color="neutral" variant="outline" :loading="status === 'pending'" @click="refreshManually") Обновить статус
    u-button(icon="i-lucide-play" :loading="isStarting" :disabled="isRunning || awaitingStart || !!error || !!runError || status === 'pending'" @click="run") Запустить оценку

  u-alert(v-if="error" color="error" title="Не удалось получить статус" description="Состояние оценки неизвестно. Обновите статус перед запуском." role="alert")
  u-alert(v-if="runError || data?.error" color="error" title="Ошибка оценки" :description="runError || data?.error || ''")
  ui-box(title="Состояние")
    div(class="admin-toolbar" aria-live="polite")
      u-icon(v-if="isRunning || awaitingStart" name="i-lucide-loader-circle" class="animate-spin")
      span(v-if="error") Неизвестно
      span(v-else-if="isRunning") Оценка выполняется
      span(v-else-if="awaitingStart") Ожидаем подтверждения запуска
      span(v-else-if="status === 'pending'") Загружаем статус…
      span(v-else-if="data?.error") Завершилась с ошибкой
      span(v-else-if="runError") Запуск не подтверждён
      span(v-else-if="result") Есть результаты последней оценки
      span(v-else) Оценка ещё не запускалась
    p(v-if="!error && (isRunning || awaitingStart)" class="admin-muted text-sm") Сервер не сообщает прогресс по вопросам. Статус обновляется автоматически.

  ui-box(v-if="!error && status !== 'pending' && !result && !isRunning && !awaitingStart && !data?.error && !runError" title="Результаты")
    ui-empty-state(title="Результатов оценки пока нет")

  template(v-if="result")
    ui-box(title="Последний результат")
      div(class="admin-stat-grid")
        div
          p(class="admin-muted text-xs") Успешно пройдено
          p(class="text-2xl font-semibold") {{ summary.passRate }}
        div
          p(class="admin-muted text-xs") Всего примеров
          p(class="text-2xl font-semibold") {{ summary.total ?? '—' }}
        div
          p(class="admin-muted text-xs") Пройдено полностью
          p(class="text-2xl font-semibold") {{ summary.passed ?? '—' }}
      p(v-if="cases.length" class="admin-muted text-sm mt-4") Не пройдено: {{ summary.failed }} · С ошибкой: {{ summary.errors }} (по подробным результатам)
      p(v-if="result.mode" class="admin-muted text-sm mt-4") Режим: {{ result.mode }}
      p(v-if="result.skipped_ids?.length" class="admin-muted text-sm mt-2") Пропущены: {{ result.skipped_ids.join(', ') }}
      p(class="admin-muted text-xs mt-2") Результат относится к последней сохранённой оценке.

    ui-box(:title="`Примеры (${cases.length})`")
      ui-empty-state(v-if="!cases.length" title="Подробных результатов нет" description="Сервер вернул только общий результат оценки.")
      div(v-else class="divide-y divide-default")
        details(v-for="(item, index) in cases" :key="String(item.id ?? index)" class="py-3")
          summary(class="cursor-pointer flex items-start gap-3 text-sm")
            span(class="admin-muted shrink-0") {{ item.id ?? index + 1 }}
            span(class="flex-1") {{ item.question || 'Без вопроса' }}
            u-badge(:color="item.error ? 'error' : item.passed === true ? 'success' : item.passed === false ? 'warning' : 'neutral'" variant="subtle") {{ item.error ? 'Ошибка' : item.passed === true ? 'Пройдено' : item.passed === false ? 'Не пройдено' : 'Нет статуса' }}
          div(class="admin-detail mt-3 text-sm space-y-3")
            p(v-if="item.error" class="text-error") {{ item.error }}
            p(v-if="item.answer" class="pre-wrap-anywhere") {{ item.answer }}
            p(v-if="item.session_id" class="admin-muted break-all") Сессия: {{ item.session_id }}
            div(v-if="item.checks?.length" class="flex flex-wrap gap-2")
              u-badge(v-for="(check, i) in item.checks" :key="i" :color="check.passed ? 'success' : 'warning'" variant="subtle") {{ check.kind }}: {{ check.passed ? 'пройдено' : 'не пройдено' }}
            p(v-if="item.judge_score != null") Оценка судьи: {{ item.judge_score }}
            p(v-if="item.reasoning" class="pre-wrap-anywhere") {{ item.reasoning }}
            details
              summary(class="cursor-pointer admin-muted") Все данные примера
              pre(class="mt-2 text-xs pre-wrap-anywhere") {{ JSON.stringify(item, null, 2) }}
    details(class="admin-panel p-4")
      summary(class="cursor-pointer text-sm") Полный результат сервера
      pre(class="mt-3 text-xs pre-wrap-anywhere") {{ JSON.stringify(result, null, 2) }}
</template>
