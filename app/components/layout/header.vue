<script setup lang="ts">
import type { NavigationMenuItem } from "@nuxt/ui"

const route = useRoute()
const token = useAuthToken()

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
    label: "Аббревиатуры",
    to: "/abbrev",
    active: route.path.startsWith("/abbrev"),
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
    label: "Обратная связь",
    to: "/feedback",
    active: route.path.startsWith("/feedback"),
  },
  {
    label: "Настройки",
    to: "/settings",
    active: route.path.startsWith("/settings"),
  },
  {
    label: "Тестирование",
    to: "/testing",
    active: route.path.startsWith("/testing"),
  },
  {
    label: "Логи системы",
    to: "/system-logs",
    active: route.path.startsWith("/system-logs"),
  },
])

const handleLogout = () => {
  token.value = null
  navigateTo("/login")
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
        v-if="token"
        color="neutral"
        variant="ghost"
        icon="i-heroicons-arrow-right-on-rectangle"
        @click="handleLogout"
      ) Выйти
</template>
