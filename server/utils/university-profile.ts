import { createError } from "h3"

import { useRuntimeConfig } from "#imports"

// Always revalidate: an administrator may switch the instance profile at runtime.
// This public contract must never receive staff cookies or service credentials.
export async function getPublicUniversityProfile(): Promise<"nsu" | "custom"> {
  try {
    const data = await $fetch<{ profile?: unknown }>("/api/v1/university/profile", {
      baseURL: useRuntimeConfig().public.apiBaseUrl,
      retry: 0,
      timeout: 5000,
    })
    if (data?.profile === "nsu" || data?.profile === "custom") {
      return data.profile
    }
  } catch {
    // Missing contracts and backend outages are not evidence of a custom profile.
  }
  throw createError({ statusCode: 503, statusMessage: "University profile unavailable" })
}
