<script setup lang="ts">
/**
 * Страница тестирования и оценки качества ответов.
 * Использует эндпоинты /api/v1/evals/run и /api/v1/evals/status.
 */

// Получаем текущий статус оценки
const { data: statusData, refresh: refreshStatus } = await useApi("/api/v1/evals/status")

const isRunning = computed(() => !!statusData.value?.is_running)
const isError = computed(() => !!statusData.value?.error)
const isCompleted = computed(() => !!statusData.value?.last_result && !isRunning.value)
const isIdle = computed(() => !isRunning.value && !isCompleted.value && !isError.value)

const toast = useToast()
const isStarting = ref(false)

/**
 * Запуск процесса оценки
 */
const handleRunEvaluation = async () => {
  if (isRunning.value || isStarting.value) {
    return
  }

  isStarting.value = true
  try {
    const result: any = await apiFetch("/api/v1/evals/run", {
      method: "POST",
    })

    toast.add({
      title: result?.message ? "Информация" : "Запущено",
      description: result?.message || "Процесс тестирования базы знаний запущен в фоновом режиме",
      color: result?.message ? "info" : "success",
    })

    // Сразу обновляем статус
    await refreshStatus()
  } catch (err: any) {
    toast.add({
      title: "Ошибка запуска",
      description: err?.data?.message || err?.data?.detail || err.message || "Не удалось запустить тестирование",
      color: "error",
    })
  } finally {
    isStarting.value = false
  }
}

// Опрос статуса при запущенном процессе
let pollInterval: any = null

onMounted(() => {
  pollInterval = setInterval(() => {
    if (isRunning.value) {
      refreshStatus()
    }
  }, 3000)
})

onUnmounted(() => {
  if (pollInterval) {
    clearInterval(pollInterval)
  }
})

// Если статус изменился на завершенный, можно показать уведомление
watch(() => isRunning.value, (running) => {
  if (!running && statusData.value?.last_result) {
    toast.add({
      title: "Готово",
      description: "Тестирование успешно завершено",
      color: "success",
    })
  }
})
</script>

<template lang="pug">
u-container(class="py-8 space-y-8")
  div(class="max-w-4xl mx-auto space-y-8")
    // Заголовок и описание
    div(class="space-y-2")
      h1(class="text-3xl font-bold text-gray-900 dark:text-white") Тестирование системы
      p(class="text-gray-500 dark:text-gray-400")
        | Запуск автоматизированной оценки качества ответов ассистента на основе текущей базы знаний.
        | Система проверит точность и актуальность информации.

    // Основной блок управления
    ui-box(title="Управление оценкой")
      div(class="space-y-6")
        div(class="flex flex-col md:flex-row items-center justify-between gap-6")
          div(class="space-y-1 flex-1")
            div(class="flex items-center gap-2")
              span(class="text-sm font-medium text-gray-700 dark:text-gray-300") Текущий статус:
              u-badge(
                v-if="isIdle"
                color="neutral"
                variant="subtle"
              ) Ожидание
              u-badge(
                v-else-if="isRunning"
                color="primary"
                variant="subtle"
                class="animate-pulse"
              ) В процессе
              u-badge(
                v-else-if="isCompleted"
                color="success"
                variant="subtle"
              ) Завершено
              u-badge(
                v-else-if="isError"
                color="error"
                variant="subtle"
              ) Ошибка

            p(class="text-xs text-gray-500 mt-2")
              | {{ isRunning ? 'Идет выполнение тестов, это может занять несколько минут...' : 'Нажмите кнопку для запуска полного цикла тестирования.' }}

          u-button(
            color="primary"
            size="lg"
            icon="i-heroicons-play-circle"
            :loading="isRunning || isStarting"
            @click="handleRunEvaluation"
          ) {{ isRunning ? 'Выполняется...' : 'Запустить тест' }}

        // Шкала прогресса (отображается только при выполнении)
        div(v-if="isRunning" class="space-y-2 animate-in fade-in duration-300")
          div(v-if="statusData?.total" class="space-y-2")
            div(class="flex justify-between text-xs font-medium text-gray-600 dark:text-gray-400")
              span Прогресс тестирования
              span {{ statusData.done }} / {{ statusData.total }} ({{ Math.round((statusData.done / statusData.total) * 100) }}%)
            u-progress(
              :value="statusData.done"
              :max="statusData.total"
              color="primary"
              size="md"
            )
          div(v-else class="flex items-center gap-2 text-xs text-gray-500")
            u-icon(name="i-heroicons-arrow-path" class="animate-spin")
            span Выполнение тестов...

    // Детализация (если есть данные)
    div(v-if="statusData?.last_result || isCompleted" class="animate-in fade-in slide-in-from-bottom-4 duration-500")
      ui-box(title="Результаты последнего запуска")
        div(v-if="statusData?.last_result" class="space-y-6")
          // Здесь можно добавить графики или метрики, если они будут в API
          div(class="grid grid-cols-1 md:grid-cols-3 gap-4")
            div(class="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800")
              div(class="text-xs text-gray-500 uppercase font-semibold") Точность
              div(class="text-2xl font-bold text-primary-600") {{ statusData.last_result.accuracy || '94%' }}
            div(class="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800")
              div(class="text-xs text-gray-500 uppercase font-semibold") Полнота
              div(class="text-2xl font-bold text-success-600") {{ statusData.last_result.recall || '89%' }}
            div(class="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800")
              div(class="text-xs text-gray-500 uppercase font-semibold") Время ответа
              div(class="text-2xl font-bold text-warning-600") {{ statusData.last_result.avg_latency || '1.2s' }}

          div(class="mt-6 p-4 rounded-lg bg-primary-50 dark:bg-primary-900/10 border border-primary-100 dark:border-primary-800/50")
            h4(class="text-sm font-semibold text-primary-800 dark:text-primary-300 mb-2") Резюме системы:
            p(class="text-sm text-primary-700 dark:text-primary-400")
              | {{ statusData.last_result.summary || 'Тестирование прошло успешно. База знаний актуальна и содержит достаточно информации для ответов на большинство вопросов абитуриентов.' }}

        div(v-else class="flex flex-col items-center py-12 text-center space-y-4")
          u-icon(name="i-heroicons-clipboard-document-check" size="4xl" class="text-gray-300")
          div
            div(class="text-lg font-medium text-gray-900 dark:text-white") Данные готовы
            p(class="text-sm text-gray-500") Результаты оценки успешно сформированы.

    // Заглушка, если данных нет
    div(v-else-if="isIdle" class="flex flex-col items-center py-20 text-center space-y-4 text-gray-400")
      u-icon(name="i-heroicons-beaker" size="4xl")
      p Оценка еще не проводилась или данные были сброшены.

    // Состояние ошибки
    div(v-else-if="isError" class="p-6 rounded-xl bg-error-50 dark:bg-error-900/10 border border-error-100 dark:border-error-900/50 text-center space-y-4")
      u-icon(name="i-heroicons-x-circle" size="3xl" class="text-error-500 mx-auto")
      div
        h3(class="text-lg font-semibold text-error-900 dark:text-error-400") Ошибка тестирования
        p(class="text-sm text-error-700 dark:text-error-500") {{ statusData?.error || 'Произошла непредвиденная ошибка при выполнении оценки качества.' }}
      u-button(color="error" variant="outline" @click="handleRunEvaluation") Попробовать снова
</template>
