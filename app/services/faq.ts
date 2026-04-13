import type { FaqListResponse } from "~/types/faq"

/**
 * Upload FAQ from CSV file
 */
export async function uploadFaqCsv(file: File): Promise<FaqListResponse> {
  const formData = new FormData()
  formData.append("file", file)

  return await apiFetch<FaqListResponse>("/api/v1/faq/upload", {
    method: "POST",
    body: formData,
  })
}
