import type {
  ConfirmUploadRequest,
  CsvImportPreviewResponse,
  CsvImportResponse,
  DocumentCheckRequest,
  DocumentCheckResponse,
  DocumentUpdateResponse,
  ParsedPageResult,
  PreprocessDocumentRequest,
  PreprocessDocumentResponse,
  RagDocument,
  RagDocumentContentResponse,
  RagDocumentUpdateRequest,
  RagUploadResponse,
} from "~/types/rag-upload"

export type RagUploadRequest = (formData: FormData) => Promise<RagUploadResponse>

async function defaultRagUploadRequest(formData: FormData): Promise<RagUploadResponse> {
  return await apiFetch<RagUploadResponse>("/api/v1/rag/upload", {
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

export async function uploadCsvDocuments(file: File): Promise<CsvImportResponse> {
  const formData = new FormData()
  formData.append("file", file)

  return await apiFetch<CsvImportResponse>("/api/v1/rag/upload/csv", {
    method: "POST",
    body: formData,
  })
}

export async function previewCsvDocuments(file: File): Promise<CsvImportPreviewResponse> {
  const formData = new FormData()
  formData.append("file", file)

  return await apiFetch<CsvImportPreviewResponse>("/api/v1/rag/upload/csv/preview", {
    method: "POST",
    body: formData,
  })
}

export async function listRagDocuments(): Promise<RagDocument[]> {
  const data = await apiFetch<{ documents: RagDocument[] }>("/api/v1/rag/docs")
  return data.documents
}
export async function parsePageForRag(url: string): Promise<ParsedPageResult> {
  return await apiFetch<ParsedPageResult>("/api/v1/rag/parse", {
    method: "POST",
    params: { url },
  })
}

export async function confirmRagUpload(payload: ConfirmUploadRequest): Promise<void> {
  await apiFetch("/api/v1/rag/confirm", {
    method: "POST",
    body: payload,
  })
}

export async function preprocessRagDocument(text: string): Promise<PreprocessDocumentResponse> {
  const body: PreprocessDocumentRequest = { text }

  return await apiFetch<PreprocessDocumentResponse>("/api/v1/rag/preprocess", {
    method: "POST",
    body,
  })
}

export async function getRagDocumentContent(docId: string): Promise<RagDocumentContentResponse> {
  return await apiFetch<RagDocumentContentResponse>(`/api/v1/rag/docs/${encodeURIComponent(docId)}/content`)
}

export async function updateRagDocument(
  docId: string,
  payload: RagDocumentUpdateRequest,
): Promise<RagDocument> {
  return await apiFetch<RagDocument>(`/api/v1/rag/docs/${encodeURIComponent(docId)}`, {
    method: "PATCH",
    body: payload,
  })
}

export interface PopularQuestion {
  question: string
  count: number
}

export async function getPopularQuestions(limit = 10): Promise<PopularQuestion[]> {
  const data = await apiFetch<{ questions: PopularQuestion[] }>("/api/v1/logs/popular", {
    query: {
      limit,
    },
  })
  return data.questions ?? []
}

export async function clearRagCache(): Promise<void> {
  await apiFetch("/api/v1/rag/cache/clear", {
    method: "POST",
  })
}

export async function deleteRagDocuments(ids: string[]): Promise<void> {
  await Promise.all(ids.map(id => apiFetch(`/api/v1/rag/docs/${encodeURIComponent(id)}`, {
    method: "DELETE",
  })))
}

function buildDocumentCheckBody(ids?: string[]): DocumentCheckRequest {
  return ids?.length ? { document_ids: ids } : {}
}

export async function checkRagDocuments(ids?: string[]): Promise<DocumentCheckResponse> {
  return await apiFetch<DocumentCheckResponse>("/api/v1/rag/docs/check", {
    method: "POST",
    body: buildDocumentCheckBody(ids),
  })
}

export async function updateChangedRagDocuments(ids?: string[]): Promise<DocumentUpdateResponse> {
  return await apiFetch<DocumentUpdateResponse>("/api/v1/rag/docs/update-changed", {
    method: "POST",
    body: buildDocumentCheckBody(ids),
  })
}
