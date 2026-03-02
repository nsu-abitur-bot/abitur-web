<script setup lang="ts">
defineProps<{
  documents: {
    id: number | string
    name: string
    date: string
    status: "pending" | "processing" | "success" | "error"
  }[]
}>()

defineEmits<{
  (e: "delete", id: number | string): void
}>()

const columns = [
  { id: "name", label: "Название / URL" },
  { id: "date", label: "Дата" },
  { id: "status", label: "Статус", class: "w-[1%] whitespace-nowrap" },
  { id: "actions", label: "", class: "w-[1%] whitespace-nowrap" },
]

function getStatusColor(status: string): "success" | "warning" | "error" | "neutral" {
  switch (status) {
    case "success": return "success"
    case "processing": return "warning"
    case "error": return "error"
    default: return "neutral"
  }
}

function getStatusLabel(status: string) {
  switch (status) {
    case "success": return "Успешно"
    case "processing": return "В обработке"
    case "error": return "Ошибка"
    case "pending": return "Ожидает"
    default: return status
  }
}
</script>

<template lang="pug">
ui-box(title="Загруженные документы")
  u-table(
    :columns="columns"
    :data="documents"
  )
    template(#status-data="{ row }")
      u-badge(:color="getStatusColor(row.original.status)" variant="subtle")
        | {{ getStatusLabel(row.original.status) }}

    template(#actions-data="{ row }")
      u-button(
        color="error"
        variant="ghost"
        icon="heroicons:trash"
        size="xs"
        @click="$emit('delete', row.original.id)"
      )
</template>
