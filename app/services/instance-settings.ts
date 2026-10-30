import type { components } from "#openapi"

export type InstanceSetting = components["schemas"]["InstanceSettingResponse"]
export type InstanceSettings = components["schemas"]["InstanceSettingsResponse"]

export type SettingChanges = Record<string, string | null>

export function getInstanceSettings(): Promise<InstanceSettings> {
  return apiFetch<InstanceSettings>("/api/v1/settings/instance")
}

export function saveInstanceSettings(revision: number, changes: SettingChanges): Promise<InstanceSettings> {
  return apiFetch<InstanceSettings>("/api/v1/settings/instance", {
    method: "PUT",
    body: { revision, changes },
  })
}

export function checkInstanceConnection(revision: number, changes: SettingChanges, target: string): Promise<{ message: string }> {
  return apiFetch<{ message: string }>("/api/v1/settings/instance/check", {
    method: "POST",
    body: { revision, changes, target },
  })
}

export function collectChanges(settings: InstanceSetting[], draft: Record<string, string>, removed: Set<string>): SettingChanges {
  const changes: SettingChanges = {}
  for (const setting of settings) {
    if (removed.has(setting.key)) {
      changes[setting.key] = null
    } else if (setting.secret) {
      if (draft[setting.key]) {
        changes[setting.key] = draft[setting.key]!
      }
    } else if (draft[setting.key] !== undefined && draft[setting.key] !== (setting.value ?? "")) {
      changes[setting.key] = draft[setting.key]!
    }
  }
  return changes
}

/** Rebase only local edits; untouched fields adopt the current server version. */
export function rebaseSettings(previous: InstanceSettings, latest: InstanceSettings, draft: Record<string, string>, removed: Set<string>) {
  const changes = collectChanges(previous.settings, draft, removed)
  const nextDraft: Record<string, string> = {}
  const nextRemoved = new Set<string>()
  const conflicts: string[] = []
  for (const setting of latest.settings) {
    nextDraft[setting.key] = setting.secret ? "" : setting.value ?? ""
    if (!Object.hasOwn(changes, setting.key)) {
      continue
    }
    const old = previous.settings.find(item => item.key === setting.key)
    if (old && (setting.secret || old.value !== setting.value)) {
      conflicts.push(setting.key)
    }
    const value = changes[setting.key]
    if (value === null) {
      nextRemoved.add(setting.key)
    } else if (value !== undefined) {
      nextDraft[setting.key] = value
    }
  }
  // A removed schema field must not silently discard a local edit.
  const missing = Object.keys(changes).filter(key => !latest.settings.some(setting => setting.key === key))
  return { draft: nextDraft, removed: nextRemoved, conflicts, missing }
}

export function isRevisionConflict(error: unknown): boolean {
  const response = error as { status?: number, statusCode?: number, response?: { status?: number } }
  return response?.status === 409 || response?.statusCode === 409 || response?.response?.status === 409
}
