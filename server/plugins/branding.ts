import { setResponseHeader } from "h3"

import { useRuntimeConfig } from "#imports"

import { brandPaletteCss, escapeBrandHtml, serializeBranding } from "../../app/utils/branding-bootstrap"
import { getStartupBranding } from "../utils/branding-bootstrap"

export default defineNitroPlugin((nitro) => {
  nitro.hooks.hook("render:html", async (html, { event }) => {
    const brand = await getStartupBranding(useRuntimeConfig(event).public.apiBaseUrl)
    // The HTML contains per-instance runtime data and must not be reused by a CDN.
    setResponseHeader(event, "Cache-Control", "no-store")
    html.head = html.head.map(part => part
      .replace(/<title\b[^>]*>[\s\S]*?<\/title>/gi, "")
      .replace(/<link\s[^>]*>/gi, tag => /\brel=["']icon["']/i.test(tag) ? "" : tag))
    const title = escapeBrandHtml(brand.short_name || brand.full_name || "Университет")
    const icon = escapeBrandHtml(brand.favicon_url || "/favicon.svg")
    html.head.push(
      `<title>${title}</title>`,
      `<style id="brand-palette" data-hid="brand-palette">${brandPaletteCss(brand)}</style>`,
      `<link rel="icon" href="${icon}" type="${brand.favicon_url ? "image/png" : "image/svg+xml"}" data-hid="brand-icon">`,
      `<script id="branding-bootstrap" type="application/json">${serializeBranding(brand)}</script>`,
    )
    if (brand.logo_url) {
      html.head.push(`<link rel="preload" as="image" href="${escapeBrandHtml(brand.logo_url)}" fetchpriority="high">`)
    }
  })
})
