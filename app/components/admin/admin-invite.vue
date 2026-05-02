<script setup lang="ts">
import type { components } from "#openapi"

type AdminRole = components["schemas"]["AdminRole"]

const toast = useToast()

const role = ref<AdminRole>("admin")
const expiresInHours = ref<number | null>(null)
const isLoading = ref(false)
const generatedCode = ref<string | null>(null)
const generatedExpiry = ref<string | null>(null)

const roleOptions: { label: string, value: AdminRole }[] = [
  { label: "Администратор", value: "admin" },
  { label: "Просмотр", value: "viewer" },
  { label: "Суперадмин", value: "superadmin" },
]

const handleCreate = async () => {
  isLoading.value = true
  generatedCode.value = null

  try {
    const response = await apiFetch<components["schemas"]["InviteCodeResponse"]>(
      "/api/v1/auth/invite",
      {
        method: "POST",
        body: {
          role: role.value,
          expires_in_hours: expiresInHours.value || undefined,
        },
      },
    )

    generatedCode.value = response.code
    generatedExpiry.value = response.expires_at
  } catch {
    toast.add({
      title: "Ошибка",
      description: "Не удалось создать инвайт-код",
      color: "error",
    })
  } finally {
    isLoading.value = false
  }
}

const copyCode = async () => {
  if (!generatedCode.value) {
    return
  }
  await navigator.clipboard.writeText(generatedCode.value)
  toast.add({ title: "Скопировано", color: "success" })
}
</script>

<template lang="pug">
ui-box(title="Создать инвайт-код")
  div(class="space-y-4")
    div(class="flex gap-4 flex-wrap")
      u-form-field(label="Роль" class="flex-1 min-w-40")
        u-select(v-model="role" :items="roleOptions" value-key="value" label-key="label")

      u-form-field(label="Срок действия (часов)")
        u-input(
          v-model.number="expiresInHours"
          type="number"
          placeholder="Без ограничений"
          :min="1"
        )

    u-button(color="primary" :loading="isLoading" icon="i-heroicons-key" @click="handleCreate")
      | Создать инвайт-код

    div(v-if="generatedCode" class="mt-4 p-4 rounded-lg bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 space-y-2")
      p(class="text-sm text-green-700 dark:text-green-300 font-medium") Инвайт-код создан
      div(class="flex items-center gap-2")
        code(class="flex-1 font-mono text-sm bg-white dark:bg-gray-900 px-3 py-2 rounded border border-green-200 dark:border-green-700 break-all") {{ generatedCode }}
        u-button(
          icon="i-heroicons-clipboard-document"
          color="neutral"
          variant="ghost"
          size="sm"
          @click="copyCode"
        )
      p(v-if="generatedExpiry" class="text-xs text-green-600 dark:text-green-400")
        | Действует до: {{ new Date(generatedExpiry).toLocaleString("ru") }}
      p(v-else class="text-xs text-green-600 dark:text-green-400") Без ограничения по времени
</template>
