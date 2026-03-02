<script setup lang="ts">
import type { NavigationMenuItem } from "@nuxt/ui"

const route = useRoute()

const items = computed<NavigationMenuItem[]>(() => [
  {
    label: "База знаний",
    to: "/",
    active: route.path.startsWith("/"),
  },
  {
    label: "Логи",
    to: "/logs",
    active: route.path.startsWith("/logs"),
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
  template(#title)
    logo(class="h-6 w-auto")
  u-navigation-menu(:items="items")

  template(#right)
    u-color-mode-button
</template>
