export default defineNuxtRouteMiddleware((to) => {
  const publicPaths = new Set(["/login", "/register", "/rating"])
  const token = useCookie("abitur-token")

  if (!token.value && !publicPaths.has(to.path)) {
    return navigateTo("/login")
  }

  if (token.value && (to.path === "/login" || to.path === "/register")) {
    return navigateTo("/")
  }
})
