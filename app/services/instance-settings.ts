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
    } else if (draft[setting.key] !== undefined && draft[setting.key] !== setting.value) {
      changes[setting.key] = draft[setting.key]!
    }
  }
  return changes
}
