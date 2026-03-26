<script setup lang="ts">
import type { NavigationMenuItem } from "@nuxt/ui"

const route = useRoute()
const toast = useToast()
const { loggedIn, fetch: fetchSession } = useUserSession()
const isLoggingOut = ref(false)

const items = computed<NavigationMenuItem[]>(() => [
  {
    label: "База знаний",
    to: "/",
    active: route.path === "/",
  },
  {
    label: "Вопросы/Ответы",
    to: "/faq",
    active: route.path.startsWith("/faq"),
  },
  {
    label: "Статистика",
    to: "/stats",
    active: route.path.startsWith("/stats"),
  },
  {
    label: "Сообщения",
    to: "/messages",
    active: route.path.startsWith("/messages"),
  },
  {
    label: "Настройки",
    to: "/settings",
    active: route.path.startsWith("/settings"),
  },
])

const handleLogout = async () => {
  isLoggingOut.value = true

  try {
    await $fetch("/api/auth/logout", {
      method: "POST",
    })
    await fetchSession()
    await navigateTo("/login")
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Не удалось выйти из системы"
    toast.add({
      title: "Ошибка выхода",
      description: message,
      color: "error",
    })
  } finally {
    isLoggingOut.value = false
  }
}
</script>

<template lang="pug">
u-header
  u-navigation-menu(:items="items")
  template(#title)
    span.font-bold.text-lg АБИТУРИЕНТ.РФ
  template(#right)
    div(class="flex items-center gap-2")
      u-color-mode-button
      u-button(
        v-if="loggedIn"
        color="neutral"
        variant="ghost"
        icon="i-heroicons-arrow-right-on-rectangle"
        :loading="isLoggingOut"
        @click="handleLogout"
      ) Выйти
</template>
