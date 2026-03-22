import type {
  ConfirmUploadRequest,
  ParsedPageResult,
  RagDocument,
  RagUploadResponse,
} from "~/types/rag-upload"

export type RagUploadRequest = (formData: FormData) => Promise<RagUploadResponse>

async function defaultRagUploadRequest(formData: FormData): Promise<RagUploadResponse> {
  const apiBaseUrl = useRuntimeConfig().public.apiBaseUrl

  return await $fetch<RagUploadResponse>("/api/v1/rag/upload", {
    baseURL: apiBaseUrl,
    method: "POST",
    body: formData,
  })
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

export async function listRagDocuments(): Promise<RagDocument[]> {
  const apiBaseUrl = useRuntimeConfig().public.apiBaseUrl
  const data = await $fetch<{ documents: RagDocument[] }>("/api/v1/rag/docs", {
    baseURL: apiBaseUrl,
  })
  return data.documents
}

export async function deleteRagDocument(docId: string): Promise<void> {
  const apiBaseUrl = useRuntimeConfig().public.apiBaseUrl
  await $fetch(`/api/v1/rag/docs/${encodeURIComponent(docId)}`, {
    baseURL: apiBaseUrl,
    method: "DELETE",
  })
}

export async function parsePageForRag(url: string): Promise<ParsedPageResult> {
  const apiBaseUrl = useRuntimeConfig().public.apiBaseUrl
  return await $fetch<ParsedPageResult>("/api/v1/rag/parse", {
    baseURL: apiBaseUrl,
    method: "POST",
    params: { url },
  })
}

export async function confirmRagUpload(payload: ConfirmUploadRequest): Promise<void> {
  const apiBaseUrl = useRuntimeConfig().public.apiBaseUrl
  await $fetch("/api/v1/rag/confirm", {
    baseURL: apiBaseUrl,
    method: "POST",
    body: payload,
  })
}
