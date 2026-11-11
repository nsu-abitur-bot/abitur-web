<script setup lang="ts">
import { useIntervalFn } from "@vueuse/core"

import { exportRagKnowledgeBase } from "~/services/rag-debug"
import { materialState, materialType } from "~/services/rag-status"
import { checkRagDocuments, clearRagCache, deleteRagDocuments, listRagDocuments, updateChangedRagDocuments, updateRagDocument } from "~/services/rag-upload"
import type { RagDocument } from "~/types/rag-upload"

const props = defineProps<{ refreshTrigger?: number }>()
const route = useRoute()
const router = useRouter()
const toast = useToast()
const documents = ref<RagDocument[]>([])
const pageSize = 20
const total = ref(0)
const totalAll = ref(0)
const hasPending = ref(false)
const page = computed({ get: () => {
  const value = Number(route.query.page ?? 1)
  return Number.isSafeInteger(value) && value > 0 ? value : 1
}, set: (page) => {
  router.replace({ query: { ...route.query, page: page > 1 ? page : undefined } })
} })
const isLoading = ref(false)
const loadError = ref(false)
const busy = ref(false)
const clearCacheOpen = ref(false)
const selectedIds = ref(new Set<string>())
const operationMessages = ref<string[]>([])
const query = computed({ get: () => String(route.query.q ?? ""), set: (q) => {
  router.replace({ query: { ...route.query, q: q || undefined, page: undefined } })
} })
const filter = computed({ get: () => ["ready", "attention", "unknown"].includes(String(route.query.status)) ? String(route.query.status) : "all", set: (status) => {
  router.replace({ query: { ...route.query, status: status === "all" ? undefined : status, page: undefined } })
} })
function resetFilters() {
  const { q: _q, status: _status, page: _page, ...query } = route.query
  router.replace({ query })
}
const state = (doc: RagDocument) => materialState(doc)
const visible = computed(() => documents.value)
const canManage = (doc: RagDocument) => !doc.proposal_only && doc.import_state !== "queued" && doc.import_state !== "processing"
const selectable = computed(() => visible.value.filter(canManage))
const isAllSelected = computed(() => selectable.value.length > 0 && selectable.value.every(doc => selectedIds.value.has(doc.id)))
function toggleSelectAll() {
  for (const doc of selectable.value) {
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
let searchTimer: ReturnType<typeof setTimeout> | undefined
let controller: AbortController | undefined
const requestKey = () => JSON.stringify([page.value, query.value, filter.value])
async function fetchDocuments(background = false) {
  clearTimeout(searchTimer)
  const current = ++generation
  const key = requestKey()
  controller?.abort()
  controller = new AbortController()
  isLoading.value = true
  if (!background) {
    loadError.value = false
  }
  try {
    const loaded = await listRagDocuments({ limit: pageSize, offset: (page.value - 1) * pageSize, q: query.value, state: filter.value }, controller.signal)
    if (current !== generation || key !== requestKey()) {
      return
    }
    total.value = loaded.total ?? loaded.documents.length
    totalAll.value = loaded.total_all ?? total.value
    hasPending.value = loaded.has_pending ?? false
    const lastPage = Math.max(1, Math.ceil(total.value / pageSize))
    if (page.value > lastPage) {
      page.value = lastPage
      return
    }
    documents.value = loaded.documents
    loadError.value = false
    selectedIds.value = new Set([...selectedIds.value].filter(id => loaded.documents.some(doc => doc.id === id && canManage(doc))))
  } catch {
    if (current === generation && key === requestKey() && !background) {
      loadError.value = true
    }
  } finally {
    if (current === generation) {
      isLoading.value = false
    }
  }
}
watch([page, query, filter], (values, previous) => {
  generation++
  controller?.abort()
  selectedIds.value.clear()
  documents.value = []
  clearTimeout(searchTimer)
  if (values[1] !== previous[1]) {
    isLoading.value = true
    searchTimer = setTimeout(() => {
      void fetchDocuments()
    }, 300)
  } else {
    void fetchDocuments()
  }
})
watch(() => route.query.doc, (id) => {
  if (typeof id === "string" && id) {
    const { doc: _doc, ...query } = route.query
    navigateTo({ path: `/rag/document/${encodeURIComponent(id)}`, query })
  }
}, { immediate: true })
onMounted(() => fetchDocuments())
useIntervalFn(() => {
  if (hasPending.value && !isLoading.value && !busy.value && !document.hidden) {
    void fetchDocuments(true)
  }
}, 5000)
onBeforeUnmount(() => {
  clearTimeout(searchTimer)
  generation++
  controller?.abort()
})
watch(() => props.refreshTrigger, () => fetchDocuments())
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
  if (!editingDocument.value || isSavingDocument.value) {
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
  div(:class="{ 'admin-table-wrap': totalAll }")
    .admin-toolbar(v-if="isLoading || loadError || totalAll")
      u-input(v-model="query" placeholder="Найти материал" aria-label="Поиск материалов" icon="i-lucide-search" class="materials-search")
      u-select(v-model="filter" aria-label="Состояние" :items="[{ label: 'Все состояния', value: 'all' }, { label: 'Обработаны', value: 'ready' }, { label: 'Требуют внимания', value: 'attention' }, { label: 'Не подтверждены', value: 'unknown' }]")
      u-button(icon="i-lucide-refresh-cw" color="neutral" variant="ghost" aria-label="Обновить материалы" :loading="isLoading" @click="fetchDocuments()")
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
    ui-empty-state(v-if="loadError" kind="error" title="Не удалось загрузить материалы")
      u-button(color="neutral" variant="outline" @click="fetchDocuments()") Повторить
    ui-empty-state(v-else-if="isLoading && !documents.length" kind="loading" title="Загрузка материалов…")
    ui-empty-state(v-else-if="!visible.length" :kind="totalAll ? 'no-results' : 'empty'" :title="totalAll ? 'Ничего не найдено' : 'Материалов пока нет'")
      u-button(v-if="totalAll && (query || filter !== 'all')" color="neutral" variant="outline" @click="resetFilters") Сбросить фильтры
      u-button(v-if="!totalAll" color="neutral" variant="outline" icon="i-lucide-refresh-cw" @click="fetchDocuments()") Обновить материалы
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
            u-checkbox(v-if="canManage(doc)" :model-value="selectedIds.has(doc.id)" :aria-label="`Выбрать ${doc.title || doc.id}`" @update:model-value="toggleSelection(doc.id)")
          td.materials-name
            nuxt-link(v-if="!doc.proposal_only" :to="{ path: `/rag/document/${encodeURIComponent(doc.id)}`, query: route.query }") {{ doc.title || doc.id }}
            nuxt-link(v-else-if="doc.import_state === 'review'" to="/rag/proposals") {{ doc.title || doc.id }}
            span(v-else) {{ doc.title || doc.id }}
            small.admin-muted {{ doc.url ? 'Источник по ссылке' : 'Без ссылки' }}
          td.admin-muted.materials-type {{ materialType(doc.url) }}
          td
            span.materials-state(:data-state="state(doc).key") {{ state(doc).label }}
            small.admin-muted.block(v-if="doc.import_state === 'index_failed' && doc.last_check_message") {{ doc.last_check_message }}
          td
            u-dropdown-menu(v-if="canManage(doc)" :items="[{ label: 'Редактировать', onSelect: () => openEditDocument(doc) }, { label: 'Диагностика', onSelect: () => openDiagnostics(doc) }]")
              u-button(icon="i-lucide-ellipsis" color="neutral" variant="ghost" :aria-label="`Действия: ${doc.title || doc.id}`")
    .materials-footer.admin-muted(v-if="totalAll")
      span Найдено: {{ total }} из {{ totalAll }}
      u-pagination(v-if="total > pageSize" v-model:page="page" :total="total" :items-per-page="pageSize" :sibling-count="1" :show-edges="false" aria-label="Страницы материалов")
  details.admin-detail(v-if="operationMessages.length")
    summary Результаты операции ({{ operationMessages.length }})
    ul(class="mt-3 space-y-2")
      li(v-for="(message, index) in operationMessages" :key="index" class="break-anywhere") {{ message }}
  ui-form-dialog(v-model:open="isEditDocumentOpen" title="Редактирование документа")
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
