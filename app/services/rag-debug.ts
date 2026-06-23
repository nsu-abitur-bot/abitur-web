import type {
  RagDebugQueryRequest,
  RagDebugQueryResponse,
  RagDocumentDiagnostics,
} from "~/types/rag-debug"

/** Инспектор поиска: прогоняет вопрос через RAG и возвращает чанки/сущности/связи. */
export async function debugRagQuery(
  payload: RagDebugQueryRequest,
): Promise<RagDebugQueryResponse> {
  return await apiFetch<RagDebugQueryResponse>("/api/v1/rag/debug/query", {
    method: "POST",
    body: payload,
  })
}

/** Диагностика конкретного документа (статусы Postgres/LightRAG, счётчики). */
export async function getRagDocumentDiagnostics(
  docId: string,
): Promise<RagDocumentDiagnostics> {
  return await apiFetch<RagDocumentDiagnostics>(
    `/api/v1/rag/docs/${encodeURIComponent(docId)}/diagnostics`,
  )
}

/** Скачивает ZIP-экспорт базы знаний (без эмбеддингов). */
export async function exportRagKnowledgeBase(): Promise<void> {
  const baseUrl = useApiBaseUrl()
  const token = useAuthToken()

  const response = await fetch(`${baseUrl}/api/v1/rag/export`, {
    headers: token.value ? { Authorization: `Bearer ${token.value}` } : {},
  })

  if (!response.ok) {
    throw new Error(`Export failed with status ${response.status}`)
  }

  const blob = await response.blob()
  const fileName = parseFileName(response.headers.get("content-disposition"))

  const objectUrl = URL.createObjectURL(blob)
  try {
    const link = document.createElement("a")
    link.href = objectUrl
    link.download = fileName
    document.body.appendChild(link)
    link.click()
    link.remove()
  } finally {
    URL.revokeObjectURL(objectUrl)
  }
}

function parseFileName(contentDisposition: string | null): string {
  const fallback = "rag-export.zip"
  if (!contentDisposition) {
    return fallback
  }

  const utf8Match = contentDisposition.match(/filename\*=(?:UTF-8'')?([^;]+)/i)
  if (utf8Match?.[1]) {
    try {
      return decodeURIComponent(utf8Match[1].trim().replaceAll("\"", ""))
    } catch {
      // игнорируем и пробуем обычный filename
    }
  }

  const match = contentDisposition.match(/filename="?([^";]+)"?/i)
  return match?.[1]?.trim() || fallback
}
