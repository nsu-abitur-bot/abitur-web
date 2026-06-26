import type { AbbrevListResponse } from "~/types/abbrev"

/**
 * Upload abbreviations from CSV file
 */
export async function uploadAbbrevCsv(file: File): Promise<AbbrevListResponse> {
  const formData = new FormData()
  formData.append("file", file)

  return await apiFetch<AbbrevListResponse>("/api/v1/abbrev/upload", {
    method: "POST",
    body: formData,
  })
}
