<script setup lang="ts">
import type { RagUploadViewModel } from "~/components/document/list.vue"
import type { RagUploadResponse } from "~/types/rag-upload"

const uploadResult = ref<RagUploadViewModel | null>(null)

function handleUploaded(payload: { response: RagUploadResponse }) {
  uploadResult.value = {
    indexedCount: payload.response.indexed_count,
    skippedCount: payload.response.skipped_count,
    results: payload.response.results,
  }
}
</script>

<template lang="pug">
u-container(class="py-8")
  div(class="flex flex-col gap-6 lg:flex-row items-start")
    document-list(:upload-result="uploadResult" class="flex-1")
    document-uploader(class="flex-1" @uploaded="handleUploaded")
</template>
