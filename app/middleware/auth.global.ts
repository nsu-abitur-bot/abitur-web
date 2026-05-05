export default defineNuxtRouteMiddleware((to) => {
  const token = useCookie("abitur-token")

  if (!token.value && to.path !== "/login" && to.path !== "/register") {
    return navigateTo("/login")
  }

  if (token.value && (to.path === "/login" || to.path === "/register")) {
    return navigateTo("/")
  }
})
