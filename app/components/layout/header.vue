<script setup lang="ts">
import type { NavigationMenuItem } from "@nuxt/ui"

const route = useRoute()

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
</script>

<template lang="pug">
u-header
  u-navigation-menu(:items="items")
  template(#title)
    span.font-bold.text-lg АБИТУРИЕНТ.РФ
  template(#right)
    u-color-mode-button
</template>
