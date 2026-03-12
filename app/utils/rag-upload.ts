import type { RagFileValidationResult, RagUploadResponse, RagUploadState } from "~/types/rag-upload"
import {
  RAG_ACCEPTED_EXTENSIONS,
  RAG_MAX_FILE_SIZE_BYTES,

} from "~/types/rag-upload"

export function getFileExtension(fileName: string): string {
  const lastDotIndex = fileName.lastIndexOf(".")
  if (lastDotIndex === -1) {
    return ""
  }

  return fileName.slice(lastDotIndex).toLowerCase()
}

export function validateRagFiles(files: File[]): RagFileValidationResult {
  const validFiles: File[] = []
  const rejectedFiles: RagFileValidationResult["rejectedFiles"] = []

  for (const file of files) {
    const extension = getFileExtension(file.name)

    if (!RAG_ACCEPTED_EXTENSIONS.includes(extension as (typeof RAG_ACCEPTED_EXTENSIONS)[number])) {
      rejectedFiles.push({
        file,
        reason: `Неподдерживаемый формат (${extension || "без расширения"}). Допустимые: ${RAG_ACCEPTED_EXTENSIONS.join(", ")}`,
      })
      continue
    }

    if (file.size > RAG_MAX_FILE_SIZE_BYTES) {
      rejectedFiles.push({
        file,
        reason: `Файл превышает 5 MB (${formatBytes(file.size)})`,
      })
      continue
    }

    validFiles.push(file)
  }

  return {
    validFiles,
    rejectedFiles,
  }
}

export function getUploadStateFromResponse(response: RagUploadResponse): RagUploadState {
  if (response.skipped_count > 0) {
    return "partial"
  }

  return "success"
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function extractErrorStatus(error: unknown): number | undefined {
  if (typeof error !== "object" || error === null) {
    return undefined
  }

  const candidate = error as {
    status?: number
    statusCode?: number
    response?: { status?: number }
    data?: { status?: number }
  }

  return candidate.status ?? candidate.statusCode ?? candidate.response?.status ?? candidate.data?.status
}

export function mapRagUploadError(error: unknown): string {
  const status = extractErrorStatus(error)

  if (status === 400) {
    return "Сервер не получил файлы (400). Проверьте, что выбраны валидные документы."
  }

  if (status === 503) {
    return "Сервис индексации RAG временно недоступен (503). Попробуйте позже."
  }

  return "Не удалось загрузить документы из-за сетевой ошибки. Проверьте подключение и повторите попытку."
}
