import type { PublicBranding } from "../../app/utils/branding-bootstrap"
import { FALLBACK_BRANDING, parsePublicBranding } from "../../app/utils/branding-bootstrap"

const TIMEOUT_MS = 1200
const STALE_MS = 5 * 60 * 1000
// One trusted runtime endpoint per entry, never Host, cookies, query or forwarded headers.
const lastGood = new Map<string, { brand: PublicBranding, time: number }>()

export async function getStartupBranding(apiBase: string): Promise<PublicBranding> {
  let endpoint: URL
  try {
    const base = new URL(apiBase)
    if (!["http:", "https:"].includes(base.protocol) || base.username || base.password || base.search || base.hash) {
      return FALLBACK_BRANDING
    }
    base.pathname = base.pathname.replace(/\/$/, "") + "/api/v1/branding"
    endpoint = base
  } catch {
    return FALLBACK_BRANDING
  }
  const key = endpoint.href
  try {
    const response = await fetch(endpoint, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
      credentials: "omit",
      redirect: "error",
      headers: { accept: "application/json" },
    })
    if (!response.ok) {
      throw new Error("Brand unavailable")
    }
    const reader = response.body?.getReader()
    if (!reader) {
      throw new Error("Brand unavailable")
    }
    let raw = ""
    let bytes = 0
    const decoder = new TextDecoder()
    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) {
          break
        }
        bytes += value.byteLength
        if (bytes > 16_384) {
          throw new Error("Brand too large")
        }
        raw += decoder.decode(value, { stream: true })
      }
      raw += decoder.decode()
    } finally {
      await reader.cancel()
    }
    const brand = parsePublicBranding(JSON.parse(raw), apiBase)
    if (!brand) {
      throw new Error("Invalid brand")
    }
    // Bounded in case runtime configuration changes during a long-running process.
    if (lastGood.size >= 8 && !lastGood.has(key)) {
      lastGood.delete(lastGood.keys().next().value!)
    }
    lastGood.set(key, { brand, time: Date.now() })
    return brand
  } catch {
    const saved = lastGood.get(key)
    if (saved && Date.now() - saved.time < STALE_MS) {
      return saved.brand
    }
    lastGood.delete(key)
    return FALLBACK_BRANDING
  }
}
