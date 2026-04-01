<script setup lang="ts">
import { getRagDocumentContent } from "~/services/rag-upload"

const route = useRoute()
const docId = decodeURIComponent(route.params.id as string)

const { data, pending, error } = useAsyncData(`rag-doc-${docId}`, () => getRagDocumentContent(docId))
</script>

<template lang="pug">
u-container(class="py-8 min-h-screen")
  div(class="mb-6 flex items-center justify-between")
    div(class="flex items-center gap-4 min-w-0")
      u-button(
        icon="i-heroicons-arrow-left"
        variant="ghost"
        color="neutral"
        to="/"
      ) Назад
      h1(class="text-2xl font-bold truncate text-gray-900 dark:text-white" :title="docId") {{ docId }}

  div(v-if="pending" class="py-32 flex flex-col items-center justify-center text-gray-500")
    u-icon(name="i-heroicons-arrow-path" class="animate-spin w-12 h-12 mb-4 text-primary")
    p(class="text-lg font-medium") Загрузка содержимого...

  div(v-else-if="error" class="max-w-2xl mx-auto py-12")
    u-alert(
      color="error"
      variant="soft"
      title="Ошибка загрузки"
      description="Не удалось найти документ или загрузить его содержимое. Возможно, он был удален или сервер недоступен."
      icon="i-heroicons-exclamation-triangle"
    )
    div(class="mt-6 text-center")
      u-button(to="/" color="neutral" variant="ghost") Вернуться на главную

  div(v-else-if="data" class="animate-in fade-in slide-in-from-bottom-4 duration-500")
    ui-box(title="Полный текст документа")
      div(class="bg-white dark:bg-gray-900 rounded-xl p-8 font-sans text-base leading-relaxed text-gray-800 dark:text-gray-200 border border-gray-100 dark:border-gray-800 shadow-sm")
        div(class="whitespace-pre-wrap select-text") {{ data.content }}
</template>
