<script setup lang="ts">
useHead({
  title: "Abitur",
})
</script>

<template lang="pug">
u-app(
  :tooltip="{ delayDuration: 0 }"
)
  div(class="isolate")
    div(class="isolate")
      nuxt-layout
        nuxt-page
</template>
