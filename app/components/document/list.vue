<script setup lang="ts">
import type { TableColumn } from "@nuxt/ui"
import { h, resolveComponent } from "vue"

import type { RagUploadFileResult } from "~/types/rag-upload"

export interface RagUploadViewModel {
  indexedCount: number
  skippedCount: number
  results: RagUploadFileResult[]
}

defineProps<{
  uploadResult: RagUploadViewModel | null
}>()

const columns: TableColumn<RagUploadFileResult>[] = [
  {
    accessorKey: "filename",
    header: "Файл",
  },
  {
    accessorKey: "status",
    header: "Статус",
    cell: ({ row }) => {
      const status = row.getValue("status") as RagUploadFileResult["status"]

      const color = {
        indexed: "success" as const,
        skipped: "warning" as const,
      }[status]

      const label = {
        indexed: "Indexed",
        skipped: "Skipped",
      }[status]

      return h(resolveComponent("UBadge"), { color, variant: "subtle" }, () => label)
    },
  },
  {
    accessorKey: "message",
    header: "Message",
  },
  {
    accessorKey: "chars",
    header: "Chars",
  },
]
</script>

<template lang="pug">
ui-box(title="Результаты индексации документов")
  div(v-if="!uploadResult" class="py-10 text-center text-gray-500")
    p Пока нет результатов загрузки.

  div(v-else class="space-y-4")
    .grid.grid-cols-1.md.grid-cols-3.gap-3
      .rounded-lg.border.border-gray-200.dark.border-gray-800.p-3
      .rounded-lg.border.border-gray-200.dark.border-gray-800.p-3
        p.text-xs.text-gray-500 Indexed
        p.font-semibold.text-success {{ uploadResult.indexedCount }}
      .rounded-lg.border.border-gray-200.dark.border-gray-800.p-3
        p.text-xs.text-gray-500 Skipped
        p.font-semibold.text-warning {{ uploadResult.skippedCount }}

    u-table(
      :columns="columns"
      :data="uploadResult.results"
    )
</template>
