import type { PublicBranding } from "~/utils/branding-bootstrap"
import { FALLBACK_BRANDING, parsePublicBranding } from "~/utils/branding-bootstrap"

export function useBranding() {
  const baseURL = useApiBaseUrl()
  const nuxtApp = useNuxtApp()
  const saved = useState<PublicBranding>("saved-branding", () => parsePublicBranding(nuxtApp.payload.data.branding, baseURL) ?? FALLBACK_BRANDING)
  // Initial data comes from Nitro before mounting, never from another browser/session.
  return useAsyncData("branding", async () => {
    const raw = await $fetch<unknown>("/api/v1/branding", { baseURL, retry: 0, timeout: 1200, credentials: "omit" })
    const brand = parsePublicBranding(raw, baseURL)
    if (!brand) {
      throw new Error("Invalid public brand")
    }
    saved.value = brand
    return brand
  }, { default: () => saved.value })
}
