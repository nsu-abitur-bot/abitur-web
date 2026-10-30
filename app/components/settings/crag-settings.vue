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

const { data, status, error, refresh } = await useAsyncData("crag-settings", getCragSettings)

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
  if (!data.value) {
    return
  }
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
section(class="admin-panel p-6")
  h2(class="text-base font-semibold mb-5") Проверка ответов
  p(class="text-sm admin-muted mb-4")
    | CRAG отбирает фрагменты базы знаний перед генерацией ответа.

  div(v-if="status === 'pending' && !data" class="py-6 flex justify-center admin-muted")
    u-icon(name="i-heroicons-arrow-path" class="animate-spin w-8 h-8")

  div(v-if="error && !data" role="alert" class="text-sm text-error mb-4")
    p Не удалось загрузить настройки.
    u-button(variant="ghost" @click="refresh()") Повторить

  u-form(v-if="data" :state="state" class="space-y-5" @submit="onSubmit")
    div(class="space-y-4")
      div(class="flex items-center justify-between gap-4 border-b border-[var(--ui-border)] pb-4")
        div
          div(class="text-sm font-medium text-gray-800 dark:text-gray-200") Проверять найденное перед ответом
          div(class="text-xs admin-muted") Отбор найденных фрагментов по релевантности вопросу.
        u-switch(v-model="state.enabled")

      div(class="flex items-center justify-between gap-4 border-b border-[var(--ui-border)] pb-4")
        div
          div(class="text-sm font-medium text-gray-800 dark:text-gray-200") Не смешивать факультеты
          div(class="text-xs admin-muted") Отбор по справочнику факультетов, если факультет указан в вопросе.
        u-switch(v-model="state.use_faculty_table")

      div(class="flex items-center justify-between gap-4 border-b border-[var(--ui-border)] pb-4")
        div
          div(class="text-sm font-medium text-gray-800 dark:text-gray-200") Искать ещё раз, если нашлось мало
          div(class="text-xs admin-muted") Повторный поиск с переформулировкой вопроса.
        u-switch(v-model="state.allow_refine")

    div(class="admin-form-grid")
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
          | От 0 до 1. Высокое значение усиливает отбор.

      u-form-field(label="Минимум фрагментов" name="min_chunks")
        u-input(
          v-model.number="state.min_chunks"
          type="number"
          min="0"
          max="100"
          class="w-full"
        )
        template(#help)
          | Ниже этого количества запускается повторный поиск.

      u-form-field(label="Лимит проверяемых фрагментов" name="max_graded_chunks")
        u-input(
          v-model.number="state.max_graded_chunks"
          type="number"
          min="1"
          max="100"
          class="w-full"
        )
        template(#help)
          | Количество фрагментов для оценки релевантности.

    div(class="flex flex-wrap items-center justify-between gap-3")
      div(class="text-xs admin-muted") Изменения применяются к ответам бота сразу после сохранения.
      u-button(type="submit" color="primary" :loading="isSaving") Сохранить
</template>
