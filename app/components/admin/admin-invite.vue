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
  if (isLoading.value) {
    return
  }
  if (expiresInHours.value !== null && expiresInHours.value !== undefined && expiresInHours.value !== 0 && (!Number.isInteger(expiresInHours.value) || expiresInHours.value < 1)) {
    toast.add({ title: "Укажите срок целым числом часов больше нуля", color: "error" })
    return
  }
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
  try {
    await navigator.clipboard.writeText(generatedCode.value)
    toast.add({ title: "Скопировано", color: "success" })
  } catch {
    toast.add({ title: "Скопируйте код вручную", color: "error" })
  }
}
</script>

<template lang="pug">
section(class="admin-panel p-5")
  h2(class="font-semibold mb-2") Пригласить участника
  p(class="admin-muted text-sm mb-5") Создайте одноразовый код и передайте его участнику для регистрации.
  div(class="space-y-4")
    div(class="admin-form-grid")
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
      | Создать приглашение

    div(v-if="generatedCode" class="admin-detail mt-4 space-y-2")
      p(class="text-sm font-medium") Приглашение создано
      div(class="flex items-center gap-2")
        code(class="flex-1 font-mono text-sm break-all") {{ generatedCode }}
        u-button(
          icon="i-heroicons-clipboard-document"
          color="neutral"
          variant="ghost"
          size="sm"
          aria-label="Скопировать код приглашения"
          @click="copyCode"
        )
      p(v-if="generatedExpiry" class="admin-muted text-xs")
        | Действует до: {{ new Date(generatedExpiry).toLocaleString("ru") }}
      p(v-else class="admin-muted text-xs") Без ограничения по времени
</template>
