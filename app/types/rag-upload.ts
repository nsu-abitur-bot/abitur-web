export const RAG_ACCEPTED_EXTENSIONS = [
  ".txt",
  ".md",
  ".markdown",
  ".json",
  ".csv",
  ".html",
  ".htm",
] as const

export const RAG_MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024

export type RagUploadFileStatus = "indexed" | "skipped"

export interface RagUploadFileResult {
  filename: string
  status: RagUploadFileStatus
  message: string
  chars: number
}

export interface RagUploadResponse {
  accepted_formats: string[]
  indexed_count: number
  skipped_count: number
  results: RagUploadFileResult[]
}

export interface RejectedRagFile {
  file: File
  reason: string
}

export interface RagFileValidationResult {
  validFiles: File[]
  rejectedFiles: RejectedRagFile[]
}

export type RagUploadState = "idle" | "uploading" | "success" | "partial" | "error"
