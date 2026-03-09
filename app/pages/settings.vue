<script setup lang="ts">
import type { TabsItem } from "@nuxt/ui"

const items = ref<TabsItem[]>([
  {
    label: "Сообщения",
    value: "messages",
    icon: "i-heroicons-chat-bubble-left-right",
  },
  {
    label: "FAQ Бота",
    value: "faq",
    icon: "i-heroicons-question-mark-circle",
  },
  {
    label: "Общие",
    value: "general",
    icon: "i-heroicons-cog-8-tooth",
  },
])

const currentTab = ref("messages")
</script>

<template lang="pug">
div(class="py-8 w-full")
  h1(class="text-3xl font-bold mb-6 text-gray-900 dark:text-white") Настройки системы

  u-tabs(
    v-model="currentTab"
    :items="items"
    class="mb-8"
  )

  div(v-if="currentTab === 'messages'" class="w-full mt-4")
    messages-message-list

  div(v-else-if="currentTab === 'faq'" class="w-full mt-4")
    faq-list

  div(v-else-if="currentTab === 'general'" class="w-full mt-4")
    ui-box(title="Общие настройки")
      p(class="text-gray-500 dark:text-gray-400") Дополнительные настройки появятся здесь в будущем.
</template>
