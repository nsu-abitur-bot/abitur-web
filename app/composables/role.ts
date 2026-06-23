import type { components } from "#openapi"

type AdminRole = components["schemas"]["AdminRole"]

/**
 * Загружает текущего пользователя и предоставляет вспомогательные флаги по ролям.
 * Используется для скрытия/блокировки админских действий от роли "viewer".
 */
export const useRole = () => {
  const { data: meRes } = useApi("/api/v1/auth/me")

  const role = computed<AdminRole | null>(() => meRes.value?.role ?? null)
  const isViewer = computed(() => role.value === "viewer")
  const isAdmin = computed(() => role.value === "admin" || role.value === "superadmin")
  const isSuperadmin = computed(() => role.value === "superadmin")

  return { role, isViewer, isAdmin, isSuperadmin }
}
