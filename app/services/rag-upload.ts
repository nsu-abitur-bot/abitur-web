import type { RagUploadResponse } from "~/types/rag-upload"

export type RagUploadRequest = (formData: FormData) => Promise<RagUploadResponse>

type RagUploadRawResponse = Partial<RagUploadResponse> & {
  graphId?: string
  indexedCount?: number
  skippedCount?: number
  acceptedFormats?: string[]
  data?: Partial<RagUploadResponse>
}

function safeNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value
  }

  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) {
      return parsed
    }
  }

  return null
}

function normalizeRagUploadResponse(raw: RagUploadRawResponse): RagUploadResponse {
  const payload = raw.data && typeof raw.data === "object" ? { ...raw, ...raw.data } : raw
  const results = Array.isArray(payload.results) ? payload.results : []

  const indexedCountFromPayload = safeNumber(payload.indexed_count ?? payload.indexedCount)
  const skippedCountFromPayload = safeNumber(payload.skipped_count ?? payload.skippedCount)

  const indexedCountFromResults = results.filter(item => item?.status === "indexed").length
  const skippedCountFromResults = results.filter(item => item?.status === "skipped").length

  const indexedCount = indexedCountFromPayload ?? indexedCountFromResults
  const skippedCount = skippedCountFromPayload ?? skippedCountFromResults

  return {
    accepted_formats: Array.isArray(payload.accepted_formats)
      ? payload.accepted_formats
      : Array.isArray(payload.acceptedFormats)
        ? payload.acceptedFormats
        : [],
    indexed_count: indexedCount,
    skipped_count: skippedCount,
    results,
  }
}

async function defaultRagUploadRequest(formData: FormData): Promise<RagUploadResponse> {
  const apiBaseUrl = useRuntimeConfig().public.apiBaseUrl

  const data = await $fetch<RagUploadRawResponse>("/api/v1/rag/upload", {
    baseURL: apiBaseUrl,
    method: "POST",
    body: formData,
  })

  return normalizeRagUploadResponse(data)
}

export async function uploadRagDocuments(params: {
  files: File[]
  request?: RagUploadRequest
}): Promise<RagUploadResponse> {
  const { files, request = defaultRagUploadRequest } = params

  const formData = new FormData()
  for (const file of files) {
    formData.append("files", file)
  }

  return await request(formData)
}
