import type { components } from "#openapi"

export const RAG_ACCEPTED_EXTENSIONS = [
  ".txt",
  ".md",
  ".markdown",
  ".json",
  ".csv",
  ".html",
  ".htm",
  ".pdf",
] as const

export const RAG_MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024

export type RagDocument = components["schemas"]["RagDocument"]
export type ParsedPageResult = components["schemas"]["ParsedPageResult"]
export type ParsedDocument = components["schemas"]["ParsedDocument"]
export type ConfirmUploadRequest = components["schemas"]["ConfirmUploadRequest"]
export type RagUploadResponse = components["schemas"]["RagUploadResponse"]
export type UploadedDocumentResult = components["schemas"]["UploadedDocumentResult"]
export type RagDocumentContentResponse = components["schemas"]["RagDocumentContentResponse"]

export type RagUploadFileStatus = "indexed" | "skipped"

export interface RejectedRagFile {
  file: File
  reason: string
}

export interface RagFileValidationResult {
  validFiles: File[]
  rejectedFiles: RejectedRagFile[]
}

export type RagUploadState = "idle" | "uploading" | "success" | "partial" | "error"
