import type { components } from "#openapi"

export type CragSettings = components["schemas"]["CragSettings"]
export type CragSettingsUpdate = components["schemas"]["CragSettingsUpdate"]

export async function getCragSettings(): Promise<CragSettings> {
  return await apiFetch<CragSettings>("/api/v1/settings/crag")
}

export async function updateCragSettings(payload: CragSettingsUpdate): Promise<CragSettings> {
  return await apiFetch<CragSettings>("/api/v1/settings/crag", {
    method: "PUT",
    body: payload,
  })
}
