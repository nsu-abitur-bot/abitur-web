<script setup lang="ts">
import type { Document } from "~/components/document/list.vue"

const documents = ref<Document[]>([
  {
    id: 1,
    name: "Документ 1",
    date: "2025-06-01",
    status: "pending",
  },
  {
    id: 2,
    name: "Документ 2",
    date: "2025-06-02",
    status: "processing",
  },
  {
    id: 3,
    name: "Документ 3",
    date: "2025-06-03",
    status: "success",
  },
  {
    id: 4,
    name: "Документ 4",
    date: "2025-06-04",
    status: "error",
  },
])
</script>

<template lang="pug">
u-container(class="py-8")
  div(class="flex flex-col gap-6 lg:flex-row items-start")
    document-list(:documents="documents" class="flex-1")
    document-uploader(class="flex-1")
</template>
