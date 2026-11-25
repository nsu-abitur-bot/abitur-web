<script setup lang="ts">
import type { PreviewResponse } from "~/services/admission-scores"
import { importAdmissionScores, previewAdmissionScores } from "~/services/admission-scores"
import { httpUrl } from "~/utils/admission-scores"

const emit = defineEmits<{ imported: [] }>()
const toast = useToast()
const open = ref(false)
const state = reactive({ url: "" })
const preview = ref<PreviewResponse>()
const error = ref("")
const loading = ref(false)
const importing = ref(false)
const rows = computed(() => preview.value?.rows ?? [])

function show() {
  state.url = ""
  preview.value = undefined
  error.value = ""
  open.value = true
}

watch(() => state.url, () => {
  preview.value = undefined
  error.value = ""
})

async function loadPreview() {
  const input = state.url.trim()
  const url = httpUrl(input) ?? null
  if (input && !url) {
    error.value = "Укажите ссылку, которая начинается с http:// или https://."
    return
  }

  error.value = ""
  preview.value = undefined
  loading.value = true
  try {
    preview.value = await previewAdmissionScores(url)
  } catch {
    error.value = "Не удалось получить предпросмотр импорта."
  } finally {
    loading.value = false
  }
}

async function submitImport() {
  if (rows.value.length === 0) {
    return
  }

  error.value = ""
  importing.value = true
  try {
    const result = await importAdmissionScores(rows.value)
    toast.add({
      title: "Импорт завершён",
      description: `Добавлено: ${result.created}, обновлено: ${result.updated}, пропущено: ${result.skipped}.`,
      color: "success",
    })
    open.value = false
    emit("imported")
  } catch {
    error.value = "Не удалось импортировать данные приёма."
  } finally {
    importing.value = false
  }
}
</script>

<template lang="pug">
u-button(variant="outline" icon="i-lucide-upload" :disabled="loading || importing" @click="show") Импорт с сайта НГУ
ui-detail-dialog(v-model:open="open" title="Импорт с сайта НГУ" :dismissible="!loading && !importing")
  div(class="space-y-4")
    u-form(:state="state" class="flex flex-wrap items-end gap-3" @submit="loadPreview")
      u-form-field(label="Страница итогов приёма" name="url" description="Пустое поле использует стандартную страницу НГУ." class="min-w-0 grow")
        u-input(v-model="state.url" type="url" placeholder="https://" class="w-full" :disabled="loading || importing")
      u-button(type="submit" variant="outline" :loading="loading" :disabled="importing") Предпросмотр
    p(v-if="error" role="alert" class="text-sm text-error") {{ error }}
    template(v-if="preview")
      p(class="text-sm text-muted") Строк: {{ preview.summary.total }}. Сопоставлено: {{ preview.summary.matched }}. Без совпадения: {{ preview.summary.unmatched }}.
      ul(v-if="preview.summary.unmatched_samples?.length" class="list-disc pl-5 text-sm text-muted")
        li(v-for="sample in preview.summary.unmatched_samples" :key="JSON.stringify([sample.faculty_name, sample.program_name])") {{ sample.program_name }}, {{ sample.faculty_name }}
      admission-scores-records-table(v-if="rows.length" :rows="rows")
  template(#footer)
    u-button(variant="outline" color="neutral" :disabled="loading || importing" @click="open = false") Закрыть
    u-button(:disabled="!rows.length || loading || !preview?.summary.matched" :loading="importing" @click="submitImport") Импортировать записи
</template>
