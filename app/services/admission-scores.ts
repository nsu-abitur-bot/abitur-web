import type { components } from "#openapi"

export type AdmissionBasis = components["schemas"]["AdmissionBasis"]
export type StudyForm = components["schemas"]["StudyForm"]
export type ScoreItem = components["schemas"]["ScoreItem"]
export type ScoreUpdate = Omit<components["schemas"]["ScoreUpdate"], "admission_basis"> & { admission_basis?: AdmissionBasis }
type ScoreInput = components["schemas"]["ScoreRowSchema-Input"]
type LegacyScoreInput = Omit<ScoreInput, "admission_basis"> & { admission_basis?: never, form: string }
export type ScoreRow = ScoreInput | LegacyScoreInput
export type ImportResponse = components["schemas"]["ImportResponse"]
export type PreviewResponse = components["schemas"]["PreviewResponse"]

export async function getAdmissionScores(): Promise<ScoreItem[]> {
  return await apiFetch<ScoreItem[]>("/api/v1/admission-scores")
}

export async function importAdmissionScores(rows: ScoreRow[]): Promise<ImportResponse> {
  return await apiFetch<ImportResponse>("/api/v1/admission-scores/import", {
    method: "POST",
    body: { rows },
  })
}

export async function importAdmissionScore(row: ScoreRow): Promise<ImportResponse> {
  return await importAdmissionScores([row])
}

export async function previewAdmissionScores(url: string | null): Promise<PreviewResponse> {
  return await apiFetch<PreviewResponse>("/api/v1/admission-scores/preview", {
    method: "POST",
    body: { url },
  })
}

export async function updateAdmissionScore(id: string, changes: ScoreUpdate): Promise<ScoreItem> {
  return await apiFetch<ScoreItem>(`/api/v1/admission-scores/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: changes,
  })
}
