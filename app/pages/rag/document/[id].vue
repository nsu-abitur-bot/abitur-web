<script setup lang="ts">
import { getRagDocumentDiagnostics } from "~/services/rag-debug"
import { materialState } from "~/services/rag-status"
import { getRagDocumentContent, listRagDocuments } from "~/services/rag-upload"

const route = useRoute()
const docId = computed(() => String(route.params.id))
const { data: docs } = useAsyncData("rag-document-metadata", listRagDocuments)
const doc = computed(() => docs.value?.find(item => item.id === docId.value))
const { data: content, pending, error, refresh } = useAsyncData(() => `rag-content-${docId.value}`, () => getRagDocumentContent(docId.value))
const { data: diagnostics } = useAsyncData(() => `rag-diagnostics-${docId.value}`, () => getRagDocumentDiagnostics(docId.value))
const state = computed(() => materialState({ status: doc.value?.status ?? "" }, diagnostics.value))
const isDiagnosticsOpen = ref(false)
</script>

<template lang="pug">
ui-page(:title="doc?.title || docId")
  template(#actions)
    u-button(color="neutral" variant="outline" icon="i-lucide-arrow-left" :to="{ path: '/', query: route.query }") Материалы
    u-button(color="neutral" variant="outline" @click="isDiagnosticsOpen = true") Диагностика
  ui-box(title="Источник")
    .admin-actions
      span {{ state.label }}
      a(v-if="doc?.url" :href="doc.url" target="_blank" rel="noopener noreferrer" class="text-primary break-anywhere") {{ doc.url }}
      span.admin-muted(v-else) {{ doc ? 'Нет ссылки для проверки' : 'Источник не загружен' }}
    p.admin-muted(class="mt-3") {{ doc ? (doc.last_check_message || (doc.last_checked_at ? `Проверен: ${new Date(doc.last_checked_at).toLocaleString('ru-RU')}` : 'Источник не проверялся')) : 'Сведения о проверке недоступны' }}
  ui-box(title="Содержимое")
    ui-empty-state(v-if="pending" kind="loading" title="Загрузка содержимого…")
    ui-empty-state(v-else-if="error" kind="error" :title="error.statusCode === 404 ? 'Документ не найден' : 'Не удалось загрузить содержимое'")
      u-button(color="neutral" variant="outline" @click="refresh()") Повторить
    ui-empty-state(v-else-if="!content?.content?.trim()" title="Содержимого пока нет")
    div(v-else class="pre-wrap-anywhere select-text leading-relaxed") {{ content?.content }}
  rag-diagnostics-modal(v-model:open="isDiagnosticsOpen" :doc-id="docId")
</template>
