<script setup lang="ts">
import type { CragSettingsUpdate } from "~/services/crag"
import { getCragSettings, updateCragSettings } from "~/services/crag"

const toast = useToast()
const isSaving = ref(false)

const state = reactive<CragSettingsUpdate>({
  enabled: true,
  relevance_threshold: 0.5,
  min_chunks: 2,
  allow_refine: true,
  use_faculty_table: true,
  max_graded_chunks: 12,
})

const { data, status, refresh } = await useAsyncData("crag-settings", getCragSettings)

watch(data, (settings) => {
  if (!settings) {
    return
  }

  state.enabled = settings.enabled ?? true
  state.relevance_threshold = settings.relevance_threshold ?? 0.5
  state.min_chunks = settings.min_chunks ?? 2
  state.allow_refine = settings.allow_refine ?? true
  state.use_faculty_table = settings.use_faculty_table ?? true
  state.max_graded_chunks = settings.max_graded_chunks ?? 12
}, { immediate: true })

const clampFloat = (value: number, min: number, max: number) => {
  const normalized = Number(value)
  if (!Number.isFinite(normalized)) {
    return min
  }
  return Math.min(max, Math.max(min, normalized))
}

const clampInt = (value: number, min: number, max: number) => {
  const normalized = Math.trunc(Number(value))
  if (!Number.isFinite(normalized)) {
    return min
  }
  return Math.min(max, Math.max(min, normalized))
}

const onSubmit = async () => {
  isSaving.value = true
  try {
    const updated = await updateCragSettings({
      enabled: state.enabled,
      relevance_threshold: clampFloat(state.relevance_threshold, 0, 1),
      min_chunks: clampInt(state.min_chunks, 0, 100),
      allow_refine: state.allow_refine,
      use_faculty_table: state.use_faculty_table,
      max_graded_chunks: clampInt(state.max_graded_chunks, 1, 100),
    })

    data.value = updated
    toast.add({ title: "Настройки проверки ответов сохранены", color: "success" })
  } catch {
    toast.add({
      title: "Ошибка",
      description: "Не удалось сохранить настройки",
      color: "error",
    })
  } finally {
    isSaving.value = false
  }
}
</script>

<template lang="pug">
ui-box(title="Умная проверка ответов")
  template(#right)
    u-button(
      icon="i-heroicons-arrow-path"
      color="neutral"
      variant="soft"
      size="sm"
      :loading="status === 'pending'"
      @click="() => refresh()"
    )

  p(class="text-sm text-gray-500 dark:text-gray-400 mb-4")
    | Перед ответом бот дополнительно убирает найденные в базе знаний куски текста,
    | которые не относятся к вопросу — чтобы не приплетать лишнее
    | (например, направления чужого факультета).

  div(v-if="status === 'pending' && !data" class="py-6 flex justify-center text-gray-500")
    u-icon(name="i-heroicons-arrow-path" class="animate-spin w-8 h-8")

  u-form(v-else :state="state" class="space-y-5" @submit="onSubmit")
    div(class="space-y-4")
      div(class="flex items-center justify-between gap-3")
        div
          div(class="text-sm font-medium text-gray-800 dark:text-gray-200") Проверять найденное перед ответом
          div(class="text-xs text-gray-500") Главный переключатель. Если выключить — бот отвечает как раньше, без проверки.
        u-switch(v-model="state.enabled")

      div(class="flex items-center justify-between gap-3")
        div
          div(class="text-sm font-medium text-gray-800 dark:text-gray-200") Не смешивать факультеты
          div(class="text-xs text-gray-500") Если в вопросе назван факультет — убирать из ответа направления других факультетов. Нужен заполненный справочник факультетов.
        u-switch(v-model="state.use_faculty_table")

      div(class="flex items-center justify-between gap-3")
        div
          div(class="text-sm font-medium text-gray-800 dark:text-gray-200") Искать ещё раз, если нашлось мало
          div(class="text-xs text-gray-500") Если подходящего текста осталось мало, бот один раз переформулирует вопрос и поищет снова. Точнее, но чуть медленнее.
        u-switch(v-model="state.allow_refine")

    div(class="grid grid-cols-1 md:grid-cols-3 gap-4")
      u-form-field(label="Строгость отбора" name="relevance_threshold")
        u-input(
          v-model.number="state.relevance_threshold"
          type="number"
          min="0"
          max="1"
          step="0.05"
          class="w-full"
        )
        template(#help)
          | От 0 до 1. Чем выше — тем строже отбор: 1 оставляет только точные попадания. Обычно 0.5.

      u-form-field(label="Когда искать повторно" name="min_chunks")
        u-input(
          v-model.number="state.min_chunks"
          type="number"
          min="0"
          max="100"
          class="w-full"
        )
        template(#help)
          | Если подходящих кусков текста осталось меньше этого числа — запускается повторный поиск.

      u-form-field(label="Сколько кусков проверять" name="max_graded_chunks")
        u-input(
          v-model.number="state.max_graded_chunks"
          type="number"
          min="1"
          max="100"
          class="w-full"
        )
        template(#help)
          | Сколько найденных кусков текста бот проверяет. Больше — точнее, но ответ дольше.

    div(class="flex flex-wrap items-center justify-between gap-3")
      div(class="text-xs text-gray-500") Изменения применяются к ответам бота сразу после сохранения.
      u-button(type="submit" color="primary" :loading="isSaving") Сохранить
</template>
