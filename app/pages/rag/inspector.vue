<script setup lang="ts">
import { debugRagQuery } from "~/services/rag-debug"
import type { RagDebugMode, RagDebugQueryResponse } from "~/types/rag-debug"
import { RAG_DEBUG_MODES } from "~/types/rag-debug"

const { isViewer } = useRole()
const toast = useToast()

const question = ref("")
const mode = ref<RagDebugMode>("hybrid")
const isLoading = ref(false)
const result = ref<RagDebugQueryResponse | null>(null)

const modeOptions: { label: string, value: RagDebugMode }[] = RAG_DEBUG_MODES.map(value => ({
  label: value,
  value,
}))

const handleRun = async () => {
  if (!question.value.trim() || isViewer.value) {
    return
  }

  isLoading.value = true
  try {
    result.value = await debugRagQuery({
      question: question.value.trim(),
      mode: mode.value,
    })
  } catch {
    toast.add({ title: "Ошибка", description: "Не удалось выполнить запрос", color: "error" })
  } finally {
    isLoading.value = false
  }
}

const formatScore = (score: number | null | undefined) => {
  if (score === null || score === undefined) {
    return "—"
  }
  return score.toFixed(4)
}

const getChunkLabel = (chunk: RagDebugQueryResponse["chunks"][number]) => {
  return chunk.source_url || chunk.file_path || `Чанк №${chunk.index}`
}
</script>

<template lang="pug">
u-container(class="py-8 space-y-6")
  div(class="flex items-center gap-4")
    u-button(
      icon="i-heroicons-arrow-left"
      variant="ghost"
      color="neutral"
      to="/"
    ) Назад
    h1(class="text-2xl font-bold text-gray-900 dark:text-white") Инспектор поиска

  u-alert(
    v-if="isViewer"
    color="warning"
    variant="soft"
    icon="i-heroicons-lock-closed"
    title="Только для администраторов"
    description="Раздел доступен только администраторам."
  )

  template(v-else)
    ui-box(title="Запрос")
      div(class="space-y-4")
        u-form-field(label="Вопрос")
          u-textarea(
            v-model="question"
            :rows="3"
            placeholder="Введите вопрос для проверки..."
            class="w-full"
            @keydown.ctrl.enter="handleRun"
            @keydown.meta.enter="handleRun"
          )
        div(class="flex items-end gap-3 flex-wrap")
          u-form-field(label="Режим" class="min-w-40")
            u-select(v-model="mode" :items="modeOptions" value-key="value" label-key="label")
          u-button(
            color="primary"
            icon="i-heroicons-play"
            :loading="isLoading"
            :disabled="!question.trim()"
            @click="handleRun"
          ) Выполнить
        p(class="text-xs text-gray-500 dark:text-gray-400")
          | Сравните, появляются ли чанки документа в разных режимах (например, hybrid и mix).

    div(v-if="isLoading" class="py-16 flex flex-col items-center justify-center text-gray-500")
      u-icon(name="i-heroicons-arrow-path" class="animate-spin w-8 h-8 mb-3 text-primary")
      p Выполняем запрос...

    template(v-else-if="result")
      ui-box(title="Ответ модели")
        div(class="pre-wrap-anywhere text-sm text-gray-800 dark:text-gray-200 leading-relaxed") {{ result.answer || "—" }}

      ui-box(title="Параметры поиска")
        div(class="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm")
          div(class="rounded-lg bg-gray-50 dark:bg-gray-800 p-3")
            div(class="text-xs text-gray-500") Режим
            div(class="font-medium") {{ result.settings.mode }}
          div(class="rounded-lg bg-gray-50 dark:bg-gray-800 p-3")
            div(class="text-xs text-gray-500") chunk_top_k
            div(class="font-medium") {{ result.settings.chunk_top_k ?? "—" }}
          div(class="rounded-lg bg-gray-50 dark:bg-gray-800 p-3")
            div(class="text-xs text-gray-500") top_k
            div(class="font-medium") {{ result.settings.top_k ?? "—" }}
          div(class="rounded-lg bg-gray-50 dark:bg-gray-800 p-3")
            div(class="text-xs text-gray-500") enable_rerank
            div(class="font-medium") {{ result.settings.enable_rerank === null ? "—" : (result.settings.enable_rerank ? "да" : "нет") }}
          div(class="rounded-lg bg-gray-50 dark:bg-gray-800 p-3")
            div(class="text-xs text-gray-500") min_rerank_score
            div(class="font-medium") {{ result.settings.min_rerank_score ?? "—" }}

      ui-box(:title="`Найденные чанки (${result.chunks.length})`")
        div(v-if="result.chunks.length === 0" class="text-sm text-gray-500 py-4 text-center") Чанки не найдены.
        div(v-else class="space-y-2")
          details(
            v-for="chunk in result.chunks"
            :key="chunk.index"
            class="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden"
          )
            summary(class="cursor-pointer select-none px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/50")
              div(class="flex items-center justify-between gap-3 flex-wrap")
                div(class="flex items-center gap-2 min-w-0")
                  u-badge(color="neutral" variant="subtle" size="xs") №{{ chunk.index }}
                  a(
                    v-if="chunk.source_url"
                    :href="chunk.source_url"
                    target="_blank"
                    class="text-sm text-primary-600 hover:underline break-anywhere min-w-0"
                    :title="chunk.source_url"
                    @click.stop
                  ) {{ chunk.source_url }}
                  span(v-else class="text-sm text-gray-700 dark:text-gray-300 break-anywhere min-w-0" :title="getChunkLabel(chunk)") {{ getChunkLabel(chunk) }}
                u-badge(color="primary" variant="subtle" size="xs") rerank: {{ formatScore(chunk.rerank_score) }}
            div(class="px-4 pb-4 pt-1 border-t border-gray-100 dark:border-gray-800")
              div(v-if="chunk.file_path" class="text-[11px] text-gray-400 mb-2 break-anywhere") {{ chunk.file_path }}
              div(class="pre-wrap-anywhere text-sm text-gray-700 dark:text-gray-300") {{ chunk.content }}

      ui-box(:title="`Сущности (${result.entities.length})`")
        div(v-if="result.entities.length === 0" class="text-sm text-gray-500 py-4 text-center") Сущности не найдены.
        div(v-else class="space-y-2")
          div(
            v-for="(entity, idx) in result.entities"
            :key="idx"
            class="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-4 py-3"
          )
            div(class="flex items-center gap-2 flex-wrap")
              span(class="text-sm font-semibold text-gray-900 dark:text-white break-anywhere") {{ entity.name }}
              u-badge(v-if="entity.type" color="neutral" variant="subtle" size="xs") {{ entity.type }}
            p(v-if="entity.description" class="text-xs text-gray-500 mt-1 break-anywhere") {{ entity.description }}

      ui-box(:title="`Связи (${result.relations.length})`")
        div(v-if="result.relations.length === 0" class="text-sm text-gray-500 py-4 text-center") Связи не найдены.
        div(v-else class="space-y-2")
          div(
            v-for="(relation, idx) in result.relations"
            :key="idx"
            class="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-4 py-3"
          )
            div(class="flex items-center gap-2 text-sm font-medium text-gray-900 dark:text-white flex-wrap")
              span(class="break-anywhere") {{ relation.source ?? "—" }}
              u-icon(name="i-heroicons-arrow-right" class="text-gray-400 shrink-0")
              span(class="break-anywhere") {{ relation.target ?? "—" }}
            p(v-if="relation.description" class="text-xs text-gray-500 mt-1 break-anywhere") {{ relation.description }}

      ui-box(:title="`Источники ответа (${result.sources.length})`")
        div(v-if="result.sources.length === 0" class="text-sm text-gray-500 py-4 text-center") Источники не найдены.
        div(v-else class="space-y-2")
          div(
            v-for="(source, idx) in result.sources"
            :key="idx"
            class="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-4 py-3"
          )
            a(
              :href="source.url"
              target="_blank"
              class="text-sm font-semibold text-primary-600 hover:underline break-anywhere"
              :title="source.url"
            ) {{ source.title || source.url }}
            div(class="text-[11px] text-gray-400 break-anywhere mt-0.5") {{ source.url }}
            p(v-if="source.snippet" class="text-xs text-gray-500 mt-1 break-anywhere") {{ source.snippet }}
</template>
