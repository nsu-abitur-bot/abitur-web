import type { components } from "#openapi"

import { brandVariables, resolveBrandMedia } from "./branding"

export type PublicBranding = components["schemas"]["BrandingResponse"]

export const FALLBACK_BRANDING: PublicBranding = {
  revision: 0,
  short_name: "Университет",
  full_name: "Университет",
  logo_url: "",
  favicon_url: "",
  accent_color: "#64748b",
}

/** A fresh whitelist, never serialize the upstream object or trust its CSS. */
export function parsePublicBranding(input: unknown, apiBase: string): PublicBranding | undefined {
  if (!input || typeof input !== "object") {
    return
  }
  const data = input as Record<string, unknown>
  if (!Number.isSafeInteger(data.revision) || Number(data.revision) < 0
    || typeof data.short_name !== "string" || data.short_name.length > 300
    || typeof data.full_name !== "string" || data.full_name.length > 300
    || typeof data.accent_color !== "string" || !/^#[\da-f]{6}$/i.test(data.accent_color)
    || typeof data.logo_url !== "string" || data.logo_url.length > 2000
    || typeof data.favicon_url !== "string" || data.favicon_url.length > 2000) {
    return
  }
  const logo = resolveBrandMedia(data.logo_url, apiBase)
  const icon = resolveBrandMedia(data.favicon_url, apiBase)
  if ((data.logo_url && !logo) || (data.favicon_url && !icon)) {
    return
  }
  return {
    revision: Number(data.revision),
    short_name: data.short_name,
    full_name: data.full_name,
    logo_url: logo,
    favicon_url: icon,
    accent_color: data.accent_color,
  }
}

export function escapeBrandHtml(value: string): string {
  return value.replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" })[char]!)
}

export function serializeBranding(brand: PublicBranding): string {
  return JSON.stringify(brand).replace(/[<>&\u2028\u2029]/g, char => `\\u${char.charCodeAt(0).toString(16).padStart(4, "0")}`)
}

export function brandPaletteCss(brand: PublicBranding): string {
  return `:root{${Object.entries(brandVariables(brand.accent_color)).map(([key, value]) => `${key}:${value}`).join(";")}}`
}
