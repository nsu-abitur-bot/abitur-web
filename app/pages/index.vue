<script setup lang="ts">
import type { Document } from "~/components/document/list.vue"

const documents: Document[] = [
  {
    id: 1,
    name: "Документ 1",
    date: "2024-06-01",
    status: "pending",
  },
  {
    id: 2,
    name: "Документ 2",
    date: "2024-06-02",
    status: "processing",
  },
  {
    id: 3,
    name: "Документ 3",
    date: "2024-06-03",
    status: "success",
  },
  {
    id: 4,
    name: "Документ 4",
    date: "2024-06-04",
    status: "error",
  },
]
</script>

<template lang="pug">
u-container(class="py-8 space-y-6")
  document-uploader
  document-list(:documents="documents")
</template>
