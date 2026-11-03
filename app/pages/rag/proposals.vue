<script setup lang="ts">
import type { ContentProposal } from "~/services/content-proposals"
import { listContentProposals, reviewContentProposal } from "~/services/content-proposals"

const proposals = ref<ContentProposal[]>([])
const loading = ref(false)
const reviewing = ref<string | null>(null)
const error = ref("")
const toast = useToast()

async function refresh() {
  loading.value = true
  error.value = ""
  try {
    proposals.value = await listContentProposals()
  } catch {
    error.value = "Не удалось загрузить очередь предложений. Повторите попытку."
  } finally {
    loading.value = false
  }
}

async function decide(proposal: ContentProposal, action: "approve" | "reject") {
  if (reviewing.value) {
    return
  }
  reviewing.value = proposal.id
  error.value = ""
  try {
    await reviewContentProposal(proposal.id, action)
    toast.add({ title: action === "approve" ? "Материал добавлен в базу знаний" : "Предложение отклонено", color: "success" })
    await refresh()
  } catch {
    error.value = "Не удалось сохранить решение. Обновите очередь и повторите попытку."
  } finally {
    reviewing.value = null
  }
}

onMounted(refresh)
</script>

<template lang="pug">
ui-page(title="Предложения" description="Материалы модели и парсеров добавляются в базу знаний после проверки редактором.")
  template(#actions)
    u-button(color="neutral" variant="outline" icon="i-lucide-refresh-cw" :loading="loading" @click="refresh") Обновить
  u-alert(v-if="error" color="error" title="Ошибка" :description="error" role="alert")
  ui-empty-state(v-if="!loading && !proposals.length && !error" title="Новых предложений нет")
  div(v-if="loading" class="admin-muted") Загружаем предложения…
  div(v-for="proposal in proposals" :key="proposal.id" class="rounded-lg border border-default p-4 space-y-3")
    div(class="flex flex-wrap items-center gap-2")
      h2(class="text-lg font-semibold") {{ proposal.title }}
      u-badge(color="neutral" variant="subtle") {{ proposal.source === 'model' ? 'Модель' : 'Парсер' }}
    a(v-if="proposal.source_url" :href="proposal.source_url" target="_blank" rel="noopener noreferrer" class="text-primary underline break-all") Источник
    p(v-else class="admin-muted text-sm") Источник не указан
    pre(class="whitespace-pre-wrap break-words max-h-80 overflow-auto text-sm") {{ proposal.text }}
    p(class="admin-muted text-xs") Получено: {{ new Date(proposal.created_at).toLocaleString('ru-RU') }}
    div(class="flex gap-2")
      u-button(color="success" :loading="reviewing === proposal.id" :disabled="!!reviewing" @click="decide(proposal, 'approve')") Принять
      u-button(color="error" variant="outline" :disabled="!!reviewing" @click="decide(proposal, 'reject')") Отклонить
</template>
