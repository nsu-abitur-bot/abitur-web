import type { components } from "#openapi"

export type ScoreItem = components["schemas"]["ScoreItem"]
export type ScoreRow = components["schemas"]["ScoreRowSchema"]
export type ImportResponse = components["schemas"]["ImportResponse"]

export async function getAdmissionScores(): Promise<ScoreItem[]> {
  return await apiFetch<ScoreItem[]>("/api/v1/admission-scores")
}

export async function importAdmissionScore(row: ScoreRow): Promise<ImportResponse> {
  return await apiFetch<ImportResponse>("/api/v1/admission-scores/import", {
    method: "POST",
    body: { rows: [row] },
  })
}
