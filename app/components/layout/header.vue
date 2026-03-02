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
    label: "Статистика",
    to: "/stats",
    active: route.path.startsWith("/stats"),
  },
])
</script>

<template lang="pug">
u-header
  u-navigation-menu(:items="items")

  template(#right)
    u-color-mode-button
</template>
