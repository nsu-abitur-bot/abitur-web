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

const { data, status, refresh } = await useAsyncData("rate-limit-settings", getRateLimitSettings)

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
  isSaving.value = true
  try {
    const updated = await updateRateLimitSettings({
      system_requests_per_day: normalizePositiveInt(state.system_requests_per_day, 1, 10000000),
      user_requests_per_day: normalizePositiveInt(state.user_requests_per_day, 1, 100000),
    })

    data.value = updated
    toast.add({ title: "Настройки rate limit сохранены", color: "success" })
  } catch {
    toast.add({
      title: "Ошибка",
      description: "Не удалось сохранить настройки rate limit",
      color: "error",
    })
  } finally {
    isSaving.value = false
  }
}
</script>

<template lang="pug">
ui-box(title="Ограничения запросов")
  template(#right)
    u-button(
      icon="i-heroicons-arrow-path"
      color="neutral"
      variant="soft"
      size="sm"
      :loading="status === 'pending'"
      @click="() => refresh()"
    )

  div(v-if="status === 'pending' && !data" class="py-6 flex justify-center text-gray-500")
    u-icon(name="i-heroicons-arrow-path" class="animate-spin w-8 h-8")

  u-form(v-else :state="state" class="space-y-5" @submit="onSubmit")
    div(class="grid grid-cols-1 md:grid-cols-2 gap-4")
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
      div(class="text-xs text-gray-500") Лимиты применяются к запросам пользователей за календарный день.
      u-button(type="submit" color="primary" :loading="isSaving") Сохранить
</template>
