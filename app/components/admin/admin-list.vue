<script setup lang="ts">
import type { components } from "#openapi"

type AdminResponse = components["schemas"]["AdminResponse"]
type AdminRole = components["schemas"]["AdminRole"]
type ChangeRoleRequest = components["schemas"]["ChangeRoleRequest"]

const { data: adminsRes, refresh, status } = await useApi("/api/v1/auth/admins")
const { data: meRes } = await useApi("/api/v1/auth/me")
const { isSuperadmin } = useRole()
const toast = useToast()

const admins = computed(() => adminsRes.value ?? [])
const currentUserId = computed(() => meRes.value?.id)

const roleLabel: Record<string, string> = {
  superadmin: "Суперадмин",
  admin: "Администратор",
  viewer: "Просмотр",
}

type BadgeColor = "primary" | "error" | "neutral"
const roleColor: Record<string, BadgeColor> = {
  superadmin: "error",
  admin: "primary",
  viewer: "neutral",
}

const roleOptions: { label: string, value: AdminRole }[] = [
  { label: "Суперадмин", value: "superadmin" },
  { label: "Администратор", value: "admin" },
  { label: "Просмотр", value: "viewer" },
]

const savingRoleId = ref<string | null>(null)

const handleDeactivate = async (admin: AdminResponse) => {
  try {
    await apiFetch(`/api/v1/auth/admins/${admin.id}/deactivate`, { method: "PATCH" })
    toast.add({ title: "Деактивирован", description: `Пользователь ${admin.username} деактивирован`, color: "success" })
    await refresh()
  } catch {
    toast.add({ title: "Ошибка", description: "Не удалось деактивировать пользователя", color: "error" })
  }
}

const handleChangeRole = async (admin: AdminResponse, role: AdminRole) => {
  if (role === admin.role) {
    return
  }

  savingRoleId.value = admin.id
  try {
    await apiFetch<AdminResponse>(`/api/v1/auth/admins/${admin.id}/role`, {
      method: "PATCH",
      body: { role } satisfies ChangeRoleRequest,
    })
    admin.role = role
    toast.add({
      title: "Роль изменена",
      description: `${admin.username}: ${roleLabel[role] ?? role}`,
      color: "success",
    })
  } catch (error) {
    const detail = (error as { data?: { detail?: string } })?.data?.detail
    toast.add({
      title: "Ошибка",
      description: detail || "Не удалось изменить роль",
      color: "error",
    })
    await refresh()
  } finally {
    savingRoleId.value = null
  }
}
</script>

<template lang="pug">
ui-box(title="Администраторы")
  div(v-if="status === 'pending'" class="py-10 flex justify-center text-gray-500")
    u-icon(name="i-heroicons-arrow-path" class="animate-spin w-8 h-8")

  div(v-else-if="admins.length === 0" class="py-12 text-center text-gray-500 bg-gray-50 dark:bg-gray-800 rounded-lg")
    u-icon(name="i-heroicons-users" class="w-12 h-12 mx-auto text-gray-400 mb-3")
    p Нет администраторов

  div(v-else class="space-y-2 mt-4")
    div(
      v-for="admin in admins"
      :key="admin.id"
      class="flex items-center gap-4 border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-3 bg-white dark:bg-gray-900"
      :class="{ 'opacity-50': !admin.is_active }"
    )
      div(class="flex-1 min-w-0")
        div(class="flex items-center gap-2 flex-wrap")
          span(class="font-medium text-gray-900 dark:text-gray-100") {{ admin.username }}
          span(v-if="admin.id === currentUserId" class="text-xs text-gray-400") (вы)
          u-badge(
            :color="roleColor[admin.role] ?? 'neutral'"
            variant="subtle"
            size="xs"
          ) {{ roleLabel[admin.role] ?? admin.role }}
          u-badge(v-if="!admin.is_active" color="neutral" variant="subtle" size="xs") Деактивирован
        p(class="text-xs text-gray-400 mt-0.5")
          | Создан: {{ new Date(admin.created_at).toLocaleDateString("ru") }}

      u-select(
        v-if="isSuperadmin && admin.is_active && admin.id !== currentUserId"
        :model-value="admin.role"
        :items="roleOptions"
        value-key="value"
        label-key="label"
        size="sm"
        class="w-44"
        :loading="savingRoleId === admin.id"
        :disabled="savingRoleId === admin.id"
        @update:model-value="(role) => handleChangeRole(admin, role)"
      )

      u-modal(
        v-if="admin.is_active && admin.id !== currentUserId"
        :title="`Деактивировать ${admin.username}?`"
        description="Пользователь потеряет доступ к системе. Это действие нельзя отменить."
      )
        u-button(
          icon="i-heroicons-no-symbol"
          color="error"
          variant="ghost"
          size="sm"
        )
        template(#footer="{ close }")
          div(class="flex justify-end gap-2 w-full")
            u-button(color="neutral" variant="ghost" @click="close") Отмена
            u-button(color="error" @click="handleDeactivate(admin); close()") Деактивировать
</template>
