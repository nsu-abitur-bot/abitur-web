<script setup lang="ts">
import { ru } from "@nuxt/ui/locale"

useHead({
  title: "Abitur",
})
</script>

<template lang="pug">
u-app(
  :locale="ru"
  :tooltip="{ delayDuration: 0 }"
)
  div(class="isolate")
    div(class="isolate")
      nuxt-layout
        nuxt-page
</template>
