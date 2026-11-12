import type { InstanceSettings, SettingChanges } from "~/services/instance-settings"

export interface ModelJob {
  id: string
  target_models?: Record<string, string>
  status: "queued" | "running" | "cancelling" | "completed" | "failed" | "cancelled"
  progress: { stage?: string, completed_vectors?: number }
  error: string | null
  completed_revision?: number | null
}
export interface ModelConfiguration {
  snapshot: InstanceSettings
  revision: number
  version: number
  assignments: Record<string, string>
  legacy: { label: string, provider: string, model: string }[]
  job: ModelJob | null
}
export function getModelConfiguration(): Promise<ModelConfiguration> {
  return apiFetch<ModelConfiguration>("/api/v1/settings/instance/models")
}
export function saveModelConfiguration(revision: number, changes: SettingChanges, confirmReindex: boolean): Promise<{ revision?: number, job: ModelJob | null }> {
  return apiFetch("/api/v1/settings/instance/models", { method: "POST", body: { revision, changes, confirm_reindex: confirmReindex } })
}
export function controlModelJob(id: string, action: "retry" | "cancel"): Promise<ModelJob> {
  return apiFetch(`/api/v1/settings/instance/models/job/${id}/${action}`, { method: "POST" })
}
export function modelSnapshot(snapshot: InstanceSettings, configuration: ModelConfiguration): InstanceSettings {
  return { ...snapshot, settings: snapshot.settings.map(setting => Object.hasOwn(configuration.assignments, setting.key) ? { ...setting, value: configuration.assignments[setting.key] ?? "" } : setting) }
}
export function modelChoices(draft: Record<string, string>): SettingChanges {
  return Object.fromEntries(["TEXT_PROVIDER", "TEXT_MODEL", "EMBEDDING_PROVIDER", "EMBEDDING_MODEL"].map(key => [key, draft[key] ?? ""]))
}
export function checkModelChanges(draft: Record<string, string>, changes: SettingChanges): SettingChanges {
  const text = draft.TEXT_PROVIDER ?? "gemini"
  const embedding = draft.EMBEDDING_PROVIDER ?? "gemini"
  return {
    ...changes,
    ...modelChoices(draft),
    LLM_PROVIDER: text,
    FAQ_EMBEDDING_PROVIDER: embedding,
    [`${text.toUpperCase()}_MODEL`]: draft.TEXT_MODEL ?? "",
    [`${embedding.toUpperCase()}_EMBEDDING_MODEL`]: draft.EMBEDDING_MODEL ?? "",
  }
}
export function isModelJobActive(job: ModelJob | null | undefined) {
  return Boolean(job && ["queued", "running", "cancelling"].includes(job.status))
}
