import { parsePublicBranding } from "~/utils/branding-bootstrap"

export default defineNuxtPlugin({
  name: "branding-bootstrap",
  enforce: "pre",
  setup(nuxtApp) {
    const element = document.getElementById("branding-bootstrap")
    if (element?.textContent) {
      try {
        const brand = parsePublicBranding(JSON.parse(element.textContent), useApiBaseUrl())
        if (brand) {
          nuxtApp.payload.data.branding = brand
        }
      } catch {
        // A missing/invalid bootstrap can still use the bounded public client request.
      }
    }
  },
})
