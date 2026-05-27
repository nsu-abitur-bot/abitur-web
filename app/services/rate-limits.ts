import type { components } from "#openapi"

export type RateLimitSettings = components["schemas"]["RateLimitSettings"]
export type RateLimitSettingsUpdate = components["schemas"]["RateLimitSettingsUpdate"]

export async function getRateLimitSettings(): Promise<RateLimitSettings> {
  return await apiFetch<RateLimitSettings>("/api/v1/settings/rate-limit")
}

export async function updateRateLimitSettings(payload: RateLimitSettingsUpdate): Promise<RateLimitSettings> {
  return await apiFetch<RateLimitSettings>("/api/v1/settings/rate-limit", {
    method: "PUT",
    body: payload,
  })
}
