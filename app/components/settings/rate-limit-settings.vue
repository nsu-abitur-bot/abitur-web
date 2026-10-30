<script setup lang="ts">
import type { RateLimitSettingsUpdate } from "~/services/rate-limits"
import {
  getRateLimitSettings,

  updateRateLimitSettings,
} from "~/services/rate-limits"

const toast = useToast()
const isSaving = ref(false)

const state = reactive<RateLimitSettingsUpdate>({
  system_requests_per_day: 10000,
  user_requests_per_day: 100,
})

const { data, status, error, refresh } = await useAsyncData("rate-limit-settings", getRateLimitSettings)

watch(data, (settings) => {
  if (!settings) {
    return
  }

  state.system_requests_per_day = settings.system_requests_per_day ?? 10000
  state.user_requests_per_day = settings.user_requests_per_day ?? 100
}, { immediate: true })

const normalizePositiveInt = (value: number, min: number, max: number) => {
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
    const updated = await updateRateLimitSettings({
      system_requests_per_day: normalizePositiveInt(state.system_requests_per_day, 1, 10000000),
      user_requests_per_day: normalizePositiveInt(state.user_requests_per_day, 1, 100000),
    })

    data.value = updated
    toast.add({ title: "Лимиты сохранены", color: "success" })
  } catch {
    toast.add({
      title: "Ошибка",
      description: "Не удалось сохранить лимиты",
      color: "error",
    })
  } finally {
    isSaving.value = false
  }
}
</script>

<template lang="pug">
section(class="admin-panel p-6")
  h2(class="text-base font-semibold mb-5") Ограничения запросов
  div(v-if="status === 'pending' && !data" class="py-6 flex justify-center admin-muted")
    u-icon(name="i-heroicons-arrow-path" class="animate-spin w-8 h-8")

  div(v-if="error && !data" role="alert" class="text-sm text-error mb-4")
    p Не удалось загрузить настройки.
    u-button(variant="ghost" @click="refresh()") Повторить

  u-form(v-if="data" :state="state" class="space-y-5" @submit="onSubmit")
    div(class="admin-form-grid")
      u-form-field(label="Запросов в день для всей системы" name="system_requests_per_day")
        u-input(
          v-model.number="state.system_requests_per_day"
          type="number"
          min="1"
          max="10000000"
          class="w-full"
        )
        template(#help)
          | Общий дневной лимит для всех пользователей.

      u-form-field(label="Запросов в день для пользователя" name="user_requests_per_day")
        u-input(
          v-model.number="state.user_requests_per_day"
          type="number"
          min="1"
          max="100000"
          class="w-full"
        )
        template(#help)
          | Дневной лимит для одного пользователя.

    div(class="flex flex-wrap items-center justify-between gap-3")
      div(class="text-xs admin-muted") Лимиты применяются к запросам пользователей за календарный день.
      u-button(type="submit" color="primary" :loading="isSaving") Сохранить
</template>
