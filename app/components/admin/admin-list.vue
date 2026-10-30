<script setup lang="ts">
import type { components } from "#openapi"
import { authErrorMessage } from "~/services/auth-errors"

type AdminResponse = components["schemas"]["AdminResponse"]
type AdminRole = components["schemas"]["AdminRole"]
type ChangeRoleRequest = components["schemas"]["ChangeRoleRequest"]

const { data: adminsRes, refresh, status, error } = await useApi("/api/v1/auth/admins")
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

const roleOptions: { label: string, value: AdminRole }[] = [
  { label: "Суперадмин", value: "superadmin" },
  { label: "Администратор", value: "admin" },
  { label: "Просмотр", value: "viewer" },
]

const savingRoleId = ref<string | null>(null)

const handleDeactivate = async (admin: AdminResponse) => {
  savingRoleId.value = admin.id
  try {
    await apiFetch(`/api/v1/auth/admins/${admin.id}/deactivate`, { method: "PATCH" })
    toast.add({ title: "Деактивирован", description: `Пользователь ${admin.username} деактивирован`, color: "success" })
    await refresh()
  } catch {
    toast.add({ title: "Ошибка", description: "Не удалось деактивировать пользователя", color: "error" })
  } finally {
    savingRoleId.value = null
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
    toast.add({
      title: "Ошибка",
      description: authErrorMessage(error, "Не удалось изменить роль"),
      color: "error",
    })
    await refresh()
  } finally {
    savingRoleId.value = null
  }
}
</script>

<template>
  <section class="admin-panel" aria-labelledby="team-title">
    <header class="admin-section-header">
      <div><h2 id="team-title" class="font-semibold">Участники</h2><p class="admin-muted text-sm">Доступ к администрированию и роли участников.</p></div>
      <u-button variant="ghost" color="neutral" :loading="status === 'pending'" @click="refresh()">Обновить</u-button>
    </header>
    <div v-if="error" class="admin-empty" role="alert">Не удалось загрузить команду. Повторите запрос.</div>
    <p v-else-if="status === 'pending' && !admins.length" class="admin-empty" role="status">Загрузка участников…</p>
    <p v-else-if="!admins.length" class="admin-empty">Участников пока нет.</p>
    <div v-else class="admin-table-wrap relative">
      <table class="admin-table w-full text-sm">
        <caption class="sr-only">Участники команды и права доступа</caption>
        <thead><tr><th scope="col">Участник</th><th scope="col">Роль</th><th scope="col">Доступ</th><th scope="col">Добавлен</th><th scope="col"><span class="sr-only">Действия</span></th></tr></thead>
        <tbody>
          <tr v-for="admin in admins" :key="admin.id">
            <td><span class="font-medium">{{ admin.username }}</span><span v-if="admin.id === currentUserId" class="admin-muted ml-2">Вы</span></td>
            <td>
              <u-select v-if="isSuperadmin && admin.is_active && admin.id !== currentUserId" :aria-label="`Роль ${admin.username}`" :model-value="admin.role" :items="roleOptions" value-key="value" label-key="label" class="w-40" :loading="savingRoleId === admin.id" :disabled="savingRoleId !== null" @update:model-value="role => handleChangeRole(admin, role)" />
              <span v-else>{{ roleLabel[admin.role] }}</span>
            </td>
            <td class="admin-muted">{{ admin.is_active ? 'Активен' : 'Деактивирован' }}</td>
            <td class="admin-muted whitespace-nowrap">{{ new Date(admin.created_at).toLocaleDateString('ru') }}</td>
            <td>
              <u-modal v-if="isSuperadmin && admin.is_active && admin.id !== currentUserId" :title="`Деактивировать ${admin.username}?`" description="Пользователь потеряет доступ к системе. Восстановление доступа через этот интерфейс недоступно.">
                <u-button color="neutral" variant="ghost" size="sm" :disabled="savingRoleId !== null">Деактивировать</u-button>
                <template #footer="{ close }"><div class="admin-actions"><u-button color="neutral" variant="ghost" @click="close">Отмена</u-button><u-button color="error" :loading="savingRoleId === admin.id" @click="handleDeactivate(admin); close()">Деактивировать</u-button></div></template>
              </u-modal>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <details class="pt-4 mt-4 border-t border-[var(--ui-border)] text-sm">
      <summary class="cursor-pointer">Права ролей</summary>
      <dl class="grid gap-2 mt-3"><dt class="font-medium">Просмотр</dt><dd class="admin-muted">Сообщения, статистика и обработка обратной связи.</dd><dt class="font-medium">Администратор</dt><dd class="admin-muted">Материалы, справочники, проверки, правила ответа и лимиты.</dd><dt class="font-medium">Суперадмин</dt><dd class="admin-muted">Все разделы, подключения, секреты и управление командой.</dd></dl>
    </details>
  </section>
</template>
