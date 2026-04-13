import type { components } from "#openapi"

export type FaqItem = components["schemas"]["FaqItem"]
export type FaqListResponse = components["schemas"]["FaqListResponse"]

export interface FaqUploadResponse {
  items: FaqItem[]
}
