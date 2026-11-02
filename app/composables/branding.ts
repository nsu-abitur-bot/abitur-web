import type { components } from "#openapi"

export function useBranding() {
  const baseURL = useApiBaseUrl()
  // Public endpoint must never carry an expired login token or redirect login.
  return useAsyncData("branding", () => $fetch<components["schemas"]["BrandingResponse"]>("/api/v1/branding", { baseURL, retry: 0 }))
}
