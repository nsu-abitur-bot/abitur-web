<script setup lang="ts">
import type { TableColumn } from "@nuxt/ui"
import { h, resolveComponent } from "vue"

export type Document = {
  id: number | string
  name: string
  date: string
  status: "pending" | "processing" | "success" | "error"
}

defineProps<{
  documents: Document[]
}>()

const emit = defineEmits<{
  delete: [id: number | string]
}>()

const columns: TableColumn<Document>[] = [
  {
    accessorKey: "name",
    header: "Название / URL",
  },
  {
    accessorKey: "date",
    header: "Дата",
  },
  {
    accessorKey: "status",
    header: "Статус",
    cell: ({ row }) => {
      const status = row.getValue("status") as Document["status"]

      const color = {
        success: "success" as const,
        processing: "warning" as const,
        error: "error" as const,
        pending: "neutral" as const,
      }[status]

      const label = {
        success: "Успешно",
        processing: "В обработке",
        error: "Ошибка",
        pending: "Ожидает",
      }[status]

      return h(resolveComponent("UBadge"), { color, variant: "subtle" }, () => label)
    },
  },
  {
    id: "actions",
    cell: ({ row }) => {
      return h(resolveComponent("UButton"), {
        color: "error",
        variant: "ghost",
        icon: "lucide:trash",
        size: "xs",
        onClick: () => emit("delete", row.original.id),
      })
    },
  },
]
</script>

<template lang="pug">
ui-box(title="Загруженные документы")
  u-table(
    :columns="columns"
    :data="documents"
  )
</template>
