<script setup lang="ts">
import { getRagDocumentDiagnostics } from "~/services/rag-debug"
import type { RagDocumentDiagnostics } from "~/types/rag-debug"

const props = defineProps<{
  docId: string | null
}>()

const open = defineModel<boolean>("open", { default: false })

const isLoading = ref(false)
const data = ref<RagDocumentDiagnostics | null>(null)
const errorMessage = ref<string | null>(null)

const load = async (docId: string) => {
  isLoading.value = true
  errorMessage.value = null
  data.value = null
  try {
    data.value = await getRagDocumentDiagnostics(docId)
  } catch {
    errorMessage.value = "Не удалось загрузить диагностику документа"
  } finally {
    isLoading.value = false
  }
}

watch(
  () => [open.value, props.docId] as const,
  ([isOpen, docId]) => {
    if (isOpen && docId) {
      load(docId)
    }
  },
)

const lightragLabel: Record<string, string> = {
  processed: "Обработан",
  failed: "Ошибка",
  pending: "В очереди",
  processing: "Обрабатывается",
  not_found: "Не найден",
}

const getLightragLabel = (status: string) => lightragLabel[status] ?? status

const getLightragColor = (status: string) => {
  switch (status) {
    case "processed":
      return "success"
    case "failed":
    case "not_found":
      return "error"
    case "pending":
    case "processing":
      return "warning"
    default:
      return "neutral"
  }
}

const hasLightragProblem = computed(() => data.value !== null && data.value.lightrag_status !== "processed")
const hasNoEntities = computed(() => data.value !== null && data.value.entities_count === 0)
const hasError = computed(() => !!data.value?.error)
const hasAnyProblem = computed(() => hasLightragProblem.value || hasNoEntities.value || hasError.value)
</script>

<template lang="pug">
u-modal(v-model:open="open" title="Диагностика документа")
  template(#body)
    div(v-if="isLoading" class="py-10 flex justify-center text-gray-500")
      u-icon(name="i-heroicons-arrow-path" class="animate-spin w-8 h-8")

    u-alert(
      v-else-if="errorMessage"
      color="error"
      variant="soft"
      icon="i-heroicons-exclamation-triangle"
      :title="errorMessage"
    )

    div(v-else-if="data" class="space-y-4")
      div
        div(class="text-xs text-gray-500") Название
        div(class="font-medium text-gray-900 dark:text-white break-anywhere") {{ data.title || "—" }}
        div(class="text-[11px] text-gray-400 break-anywhere mt-0.5") ID: {{ data.id }}

      u-alert(
        v-if="hasNoEntities"
        color="error"
        variant="soft"
        icon="i-heroicons-exclamation-triangle"
        title="Сущности не извлечены"
        description="Извлечение сущностей не дало результата — документ недостижим в режиме hybrid."
      )

      u-alert(
        v-else-if="hasLightragProblem"
        color="warning"
        variant="soft"
        icon="i-heroicons-exclamation-triangle"
        title="Документ не обработан в LightRAG"
        :description="`Статус LightRAG: ${getLightragLabel(data.lightrag_status)}.`"
      )

      div(class="grid grid-cols-2 gap-3 text-sm")
        div(class="rounded-lg bg-gray-50 dark:bg-gray-800 p-3")
          div(class="text-xs text-gray-500") Статус Postgres
          div(class="font-medium break-anywhere") {{ data.postgres_status }}
        div(class="rounded-lg p-3" :class="hasLightragProblem ? 'bg-warning-50 dark:bg-warning-950/30' : 'bg-gray-50 dark:bg-gray-800'")
          div(class="text-xs text-gray-500") Статус LightRAG
          u-badge(:color="getLightragColor(data.lightrag_status)" variant="subtle" size="sm" class="mt-1") {{ getLightragLabel(data.lightrag_status) }}
        div(class="rounded-lg bg-gray-50 dark:bg-gray-800 p-3")
          div(class="text-xs text-gray-500") Чанки
          div(class="font-medium") {{ data.chunks_count }}
        div(class="rounded-lg p-3" :class="hasNoEntities ? 'bg-error-50 dark:bg-error-950/30' : 'bg-gray-50 dark:bg-gray-800'")
          div(class="text-xs text-gray-500") Сущности
          div(class="font-medium" :class="hasNoEntities ? 'text-error-600 dark:text-error-400' : ''") {{ data.entities_count }}
        div(class="rounded-lg bg-gray-50 dark:bg-gray-800 p-3")
          div(class="text-xs text-gray-500") Связи
          div(class="font-medium") {{ data.relations_count }}
        div(class="rounded-lg bg-gray-50 dark:bg-gray-800 p-3")
          div(class="text-xs text-gray-500") Длина контента
          div(class="font-medium") {{ data.content_length ?? "—" }}

      div(v-if="hasError" class="rounded-lg border border-error-200 dark:border-error-900 bg-error-50 dark:bg-error-950/30 p-3")
        div(class="text-xs font-medium text-error-600 dark:text-error-400 mb-1") Ошибка обработки LightRAG
        div(class="text-xs text-error-700 dark:text-error-300 pre-wrap-anywhere") {{ data.error }}

      div(v-if="!hasAnyProblem" class="flex items-center gap-2 text-sm text-success-600 dark:text-success-400")
        u-icon(name="i-heroicons-check-circle")
        span Проблем не обнаружено

  template(#footer="{ close }")
    div(class="flex justify-end w-full")
      u-button(color="neutral" variant="ghost" @click="close") Закрыть
</template>
