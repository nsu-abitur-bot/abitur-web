<script setup lang="ts">
import { exportRagKnowledgeBase, getRagDocumentDiagnostics } from "~/services/rag-debug"
import { materialState, materialType } from "~/services/rag-status"
import { checkRagDocuments, clearRagCache, deleteRagDocuments, listRagDocuments, updateChangedRagDocuments, updateRagDocument } from "~/services/rag-upload"
import type { RagDocumentDiagnostics } from "~/types/rag-debug"
import type { RagDocument } from "~/types/rag-upload"

const props = defineProps<{ refreshTrigger?: number }>()
const route = useRoute()
const router = useRouter()
const toast = useToast()
const documents = ref<RagDocument[]>([])
const diagnostics = ref<Record<string, RagDocumentDiagnostics | null>>({})
const isLoading = ref(false)
const loadError = ref(false)
const busy = ref(false)
const clearCacheOpen = ref(false)
const selectedIds = ref(new Set<string>())
const operationMessages = ref<string[]>([])
const query = computed({ get: () => String(route.query.q ?? ""), set: (q) => {
  router.replace({ query: { ...route.query, q: q || undefined } })
} })
const filter = computed({ get: () => String(route.query.status ?? "all"), set: (status) => {
  router.replace({ query: { ...route.query, status: status === "all" ? undefined : status } })
} })
function resetFilters() {
  const { q: _q, status: _status, ...query } = route.query
  router.replace({ query })
}
const state = (doc: RagDocument) => materialState(doc, diagnostics.value[doc.id])
const visible = computed(() => documents.value.filter(doc => (doc.title || doc.id).toLowerCase().includes(query.value.toLowerCase()) && (filter.value === "all" || state(doc).key === filter.value)))
const isAllSelected = computed(() => visible.value.length > 0 && visible.value.every(doc => selectedIds.value.has(doc.id)))
function toggleSelectAll() {
  for (const doc of visible.value) {
    if (isAllSelected.value) {
      break
    }
    selectedIds.value.add(doc.id)
  }
}
function toggleSelection(id: string) {
  if (selectedIds.value.has(id)) {
    selectedIds.value.delete(id)
  } else {
    selectedIds.value.add(id)
  }
}
let generation = 0
async function fetchDocuments() {
  const current = ++generation
  isLoading.value = true
  loadError.value = false
  try {
    const loaded = await listRagDocuments()
    if (current !== generation) {
      return
    }
    documents.value = loaded
    selectedIds.value = new Set([...selectedIds.value].filter(id => documents.value.some(doc => doc.id === id)))
    diagnostics.value = {}
    const queue = [...documents.value]
    await Promise.all(Array.from({ length: 3 }, async () => {
      while (queue.length) {
        if (current !== generation) {
          break
        }
        const doc = queue.shift()!
        try {
          const result = await getRagDocumentDiagnostics(doc.id)
          if (current === generation) {
            diagnostics.value[doc.id] = result
          }
        } catch {
          if (current === generation) {
            diagnostics.value[doc.id] = null
          }
        }
      }
    }))
  } catch {
    loadError.value = true
  } finally {
    if (current === generation) {
      isLoading.value = false
    }
  }
}
watch(() => route.query.doc, (id) => {
  if (typeof id === "string" && id) {
    const { doc: _doc, ...query } = route.query
    navigateTo({ path: `/rag/document/${encodeURIComponent(id)}`, query })
  }
}, { immediate: true })
onMounted(fetchDocuments)
onBeforeUnmount(() => {
  generation++
})
watch(() => props.refreshTrigger, fetchDocuments)
async function run(action: () => Promise<unknown>) {
  if (busy.value) {
    return
  }
  busy.value = true
  operationMessages.value = []
  try {
    await action()
  } catch {
    toast.add({ title: "Не удалось выполнить действие", color: "error" })
  } finally {
    busy.value = false
  }
}
async function check(update = false, all = false) {
  const ids = all ? undefined : [...selectedIds.value]
  if (ids && !ids.length) {
    return
  }
  await run(async () => {
    const result = await (update ? updateChangedRagDocuments(ids) : checkRagDocuments(ids))
    const summary = "updated_count" in result ? `Проверено: ${result.checked_count}. Обновлено: ${result.updated_count}.` : `Проверено: ${result.checked_count}. Изменено: ${result.changed_count}.`
    operationMessages.value = [summary, ...result.results.map(item => `${item.title || item.id}: ${item.message || item.status}`)]
    if (ids) {
      for (const id of ids) {
        if (!result.results.some(item => item.id === id)) {
          operationMessages.value.push(`${id}: результат не получен`)
        }
      }
    }
    await fetchDocuments()
  })
}
async function removeSelected() {
  await run(async () => {
    const results = await deleteRagDocuments([...selectedIds.value])
    for (const result of results) {
      if (result.status === "fulfilled") {
        selectedIds.value.delete(result.id)
      }
      operationMessages.value.push(`${documents.value.find(doc => doc.id === result.id)?.title || result.id}: ${result.status === "fulfilled" ? "Удалён" : "Не удалось удалить"}`)
    }
    await fetchDocuments()
  })
}
const editingDocument = ref<RagDocument | null>(null)
const editForm = reactive({ title: "", sourceUrl: "" })
const isEditDocumentOpen = computed({ get: () => editingDocument.value !== null, set: (value) => {
  if (!value) {
    editingDocument.value = null
  }
} })
const isSavingDocument = ref(false)
function openEditDocument(doc: RagDocument) {
  editingDocument.value = doc
  editForm.title = doc.title ?? ""
  editForm.sourceUrl = doc.url ?? ""
}
async function handleUpdateDocument() {
  if (!editingDocument.value) {
    return
  }
  isSavingDocument.value = true
  try {
    await updateRagDocument(editingDocument.value.id, { title: editForm.title.trim(), source_url: editForm.sourceUrl.trim() })
    editingDocument.value = null
    await fetchDocuments()
  } catch {
    toast.add({ title: "Не удалось сохранить документ", color: "error" })
  } finally {
    isSavingDocument.value = false
  }
}
const diagnosticsDocId = ref<string | null>(null)
const isDiagnosticsOpen = ref(false)
function openDiagnostics(doc: RagDocument) {
  diagnosticsDocId.value = doc.id
  isDiagnosticsOpen.value = true
}
</script>

<template lang="pug">
.materials
  .admin-table-wrap
    .admin-toolbar(v-if="isLoading || loadError || documents.length")
      u-input(v-model="query" placeholder="Найти материал" aria-label="Поиск материалов" icon="i-lucide-search" class="materials-search")
      u-select(v-model="filter" aria-label="Состояние" :items="[{ label: 'Все состояния', value: 'all' }, { label: 'Обработаны', value: 'ready' }, { label: 'Требуют внимания', value: 'attention' }, { label: 'Не подтверждены', value: 'unknown' }]")
      u-button(color="neutral" variant="outline" :loading="busy" @click="check(false, true)") Проверить все
      u-dropdown-menu(:items="[{ label: 'Обновить изменённые', onSelect: () => check(true, true) }, { label: 'Экспорт ZIP без эмбеддингов', onSelect: () => run(exportRagKnowledgeBase) }, { label: 'Очистить кэш', onSelect: () => { clearCacheOpen = true } }]")
        u-button(icon="i-lucide-ellipsis" color="neutral" variant="ghost" aria-label="Другие действия" :disabled="busy")
      u-modal(v-model:open="clearCacheOpen" title="Очистить кэш?" description="Сохранённые ответы модели будут удалены.")
        template(#footer="{ close }")
          u-button(color="neutral" variant="ghost" @click="close") Отмена
          u-button(@click="run(clearRagCache); close()") Очистить
    .admin-toolbar(v-if="selectedIds.size")
      span Выбрано: {{ selectedIds.size }}
      u-button(color="neutral" variant="ghost" @click="selectedIds.clear()") Снять выбор
      u-button(color="neutral" variant="outline" :disabled="busy" @click="check()") Проверить выбранные
      u-button(color="neutral" variant="outline" :disabled="busy" @click="check(true)") Обновить изменённые
      u-modal(title="Удалить материалы?" :description="`Выбрано: ${selectedIds.size}`")
        u-button(color="error" variant="ghost" :disabled="busy") Удалить
        template(#footer="{ close }")
          u-button(color="neutral" variant="ghost" @click="close") Отмена
          u-button(color="error" @click="removeSelected(); close()") Удалить
    .admin-empty(v-if="loadError" role="alert")
      p Не удалось загрузить материалы
      u-button(class="mt-3" color="neutral" variant="outline" @click="fetchDocuments") Повторить
    .admin-empty(v-else-if="isLoading && !documents.length" role="status") Загрузка материалов…
    .admin-empty(v-else-if="!visible.length")
      p {{ documents.length ? 'Ничего не найдено' : 'Материалов пока нет' }}
      u-button(v-if="documents.length" color="neutral" variant="ghost" @click="resetFilters") Сбросить фильтры
    table.admin-table.materials-table(v-else)
      thead
        tr
          th
            u-checkbox(:model-value="isAllSelected" aria-label="Выбрать видимые материалы" @update:model-value="value => value ? toggleSelectAll() : visible.forEach(doc => selectedIds.delete(doc.id))")
          th Название
          th Тип
          th Состояние
          th
      tbody
        tr(v-for="doc in visible" :key="doc.id")
          td
            u-checkbox(:model-value="selectedIds.has(doc.id)" :aria-label="`Выбрать ${doc.title || doc.id}`" @update:model-value="toggleSelection(doc.id)")
          td.materials-name
            nuxt-link(:to="{ path: `/rag/document/${encodeURIComponent(doc.id)}`, query: route.query }") {{ doc.title || doc.id }}
            small.admin-muted {{ doc.url ? 'Источник по ссылке' : 'Без ссылки' }}
          td.admin-muted.materials-type {{ materialType(doc.url) }}
          td
            span.materials-state(:data-state="state(doc).key") {{ state(doc).label }}
          td
            u-dropdown-menu(:items="[{ label: 'Редактировать', onSelect: () => openEditDocument(doc) }, { label: 'Диагностика', onSelect: () => openDiagnostics(doc) }]")
              u-button(icon="i-lucide-ellipsis" color="neutral" variant="ghost" :aria-label="`Действия: ${doc.title || doc.id}`")
    .materials-footer.admin-muted(v-if="documents.length")
      span Материалов: {{ visible.length }} из {{ documents.length }}
      span(v-if="isLoading") Проверка обработки…
  details.admin-detail(v-if="operationMessages.length")
    summary Результаты операции ({{ operationMessages.length }})
    ul(class="mt-3 space-y-2")
      li(v-for="(message, index) in operationMessages" :key="index" class="break-anywhere") {{ message }}
  u-slideover(v-model:open="isEditDocumentOpen" title="Редактирование документа")
    template(#body)
      div(v-if="editingDocument" class="space-y-4")
        u-form-field(label="Название")
          u-input(
            v-model="editForm.title"
            placeholder="Название документа"
            class="w-full"
          )
        u-form-field(label="Ссылка на источник")
          u-input(
            v-model="editForm.sourceUrl"
            placeholder="https://example.com/document.pdf"
            class="w-full"
          )
        div(class="rounded-lg bg-gray-50 dark:bg-gray-800 p-3 text-xs text-gray-500 break-anywhere")
          | ID: {{ editingDocument.id }}
    template(#footer)
      div(class="flex justify-end gap-2 w-full")
        u-button(color="neutral" variant="ghost" @click="editingDocument = null") Отмена
        u-button(color="primary" :loading="isSavingDocument" @click="handleUpdateDocument") Сохранить

  rag-diagnostics-modal(v-model:open="isDiagnosticsOpen" :doc-id="diagnosticsDocId")
</template>

<style scoped>
.materials-state[data-state="ready"] {
  color: var(--admin-success);
}

.materials-state[data-state="attention"] {
  color: var(--admin-warning);
}

.materials {
  display: grid;
  gap: 16px;
}

.materials-search {
  flex: 1;
  max-width: 300px;
  min-width: 160px;
}

.materials-name {
  min-width: 180px;
  overflow-wrap: anywhere;
}

.materials-name a {
  font-weight: 500;
}

.materials-name a:hover {
  color: var(--admin-primary);
}

.materials-name small {
  display: block;
  margin-top: 3px;
  font-size: 11px;
}

.materials-type {
  font-size: 12px;
}

.materials-footer {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  padding: 10px 16px;
  border-top: 1px solid var(--admin-rule);
  font-size: 11px;
}
@media (width <= 600px) {
  .materials-search {
    flex-basis: 100%;
    max-width: none;
  }

  .materials-table thead {
    display: none;
  }

  .materials-table tr {
    display: grid;
    grid-template-columns: 20px minmax(0, 1fr) 32px;
    padding: 12px;
    gap: 4px 8px;
    border-bottom: 1px solid var(--admin-rule);
  }

  .materials-table td {
    padding: 0;
    border: 0;
  }

  .materials-table td:nth-child(3) {
    grid-column: 2;
    font-size: 11px;
  }

  .materials-table td:nth-child(4) {
    grid-column: 2;
    font-size: 11px;
  }

  .materials-table td:last-child {
    grid-column: 3;
    grid-row: 1 / 4;
  }

  .materials-name {
    min-width: 0;
  }
}
</style>
