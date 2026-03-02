<script setup lang="ts">
interface QuestionData {
  text: string
  count: number
}

interface TabsItem {
  label: string
  value: string
}

// Mock data.
const data = ref<QuestionData>({
  text: "Как подать документы на общежитие, если я из другого города?",
  count: 154,
})

const periodTabItems = ref<TabsItem[]>([
  {
    label: "24 часа",
    value: "1d",
  },
  {
    label: "7 дней",
    value: "7d",
  },
  {
    label: "30 дней",
    value: "30d",
  },
  {
    label: "Все время",
    value: "all",
  },
])
const period = ref<"1d" | "7d" | "30d" | "all">("1d")
</script>

<template lang="pug">
ui-box(title="Самый популярный вопрос")
  // Quote style block
  blockquote(class="border-l-4 border-primary-500 pl-4 py-2 my-4 bg-gray-50 dark:bg-gray-800 rounded-r-lg italic text-lg text-gray-700 dark:text-gray-300")
    p(class="mb-2") "{{ data.text }}"
    footer(class="text-sm font-bold text-gray-500 dark:text-gray-400 not-italic")
      | {{ data.count }} запросов

  u-tabs(
    v-model="period"
    :items="periodTabItems"
    class="mt-4"
  )
</template>
