import type { components } from "#openapi"
import { canAccessRoute, publicPaths } from "~/services/auth-access"

export default defineNuxtRouteMiddleware(async (to) => {
  if (publicPaths.has(to.path)) {
    return
  }
  const token = useAuthToken()
  if (!token.value) {
    return navigateTo("/login")
  }
  try {
    const me = await apiFetch<components["schemas"]["AdminResponse"]>("/api/v1/auth/me")
    if (to.path === "/" && me.role === "viewer") {
      return navigateTo("/feedback")
    }
    if (!canAccessRoute(me.role, to.path, to.query.section)) {
      throw createError({ statusCode: 403, statusMessage: "Недостаточно прав для этого раздела" })
    }
  } catch (error) {
    const status = (error as { statusCode?: number, status?: number }).statusCode ?? (error as { status?: number }).status
    if (status === 401) {
      token.value = null
      return navigateTo("/login")
    }
    if (status === 403) {
      throw error
    }
    throw createError({ statusCode: 503, statusMessage: "Не удалось проверить доступ. Повторите попытку.", cause: error })
  }
})
