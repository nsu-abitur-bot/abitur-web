<script setup lang="ts">
import { ru } from "@nuxt/ui/locale"

import { brandVariables, DEFAULT_ACCENT, resolveBrandMedia } from "~/utils/branding"

const { data: branding } = useBranding()
const apiBase = useApiBaseUrl()
const iconFailed = ref(false)
watch(() => branding.value?.favicon_url, () => {
  iconFailed.value = false
})
useHead(() => ({
  title: branding.value?.short_name || "Abitur",
  link: [{ key: "brand-icon", rel: "icon", href: (!iconFailed.value && resolveBrandMedia(branding.value?.favicon_url, apiBase)) || "/favicon.svg", type: branding.value?.favicon_url && !iconFailed.value ? "image/png" : "image/svg+xml", onerror: () => {
    iconFailed.value = true
  } }],
  style: [{ key: "brand-palette", id: "brand-palette", textContent: `:root{${Object.entries(brandVariables(branding.value?.accent_color || DEFAULT_ACCENT)).map(([key, value]) => `${key}:${value}`).join(";")}}` }],
}))
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
