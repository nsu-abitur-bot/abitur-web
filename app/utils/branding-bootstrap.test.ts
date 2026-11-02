import { afterEach, describe, expect, it, vi } from "vitest"

import { brandPaletteCss, escapeBrandHtml, FALLBACK_BRANDING, parsePublicBranding, serializeBranding } from "./branding-bootstrap"

const brand = { revision: 8, short_name: "НГУ", full_name: "Университет", accent_color: "#72C81E", logo_url: "/media/logo.png", favicon_url: "/media/icon.png" }

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  vi.resetModules()
})

describe("startup branding trust boundary", () => {
  it("drops private fields, resolves URLs against the trusted API and rejects active URLs/CSS", () => {
    const parsed = parsePublicBranding({ ...brand, token: "private", contacts: "private" }, "https://api.example")!
    expect(Object.keys(parsed).sort()).toEqual(Object.keys(brand).sort())
    expect(parsed.logo_url).toBe("https://api.example/media/logo.png")
    for (const data of [{ accent_color: "red;}</style><script>bad()" }, { logo_url: "javascript:bad()" }, { favicon_url: "//evil.example/a" }, { revision: -1 }, { short_name: {} }]) {
      expect(parsePublicBranding({ ...brand, ...data }, "https://api.example")).toBeUndefined()
    }
  })
  it("escapes text, attributes and script-closing payloads without losing the original names", () => {
    const hostile = "</script><script>alert(\"x\")</script>&\u2028\u2029"
    const parsed = parsePublicBranding({ ...brand, short_name: hostile, full_name: hostile, logo_url: "https://api.example/a?x=\"<script>&" }, "https://api.example")!
    const serialized = serializeBranding(parsed)
    expect(serialized).not.toMatch(/[<>&\u2028\u2029]/)
    expect(JSON.parse(serialized)).toEqual(parsed)
    expect(escapeBrandHtml(hostile)).not.toContain("<script>")
    expect(escapeBrandHtml("\" onload=\"bad()")).toBe("&quot; onload=&quot;bad()")
    expect(brandPaletteCss(parsed)).toMatch(/^:root\{(?:--[a-z\d-]+:#[a-f\d]{6};?)+\}$/i)
  })
  it("retains last-good data only for the same configured API and expires it", async () => {
    const { getStartupBranding } = await import("../../server/utils/branding-bootstrap")
    const upstream = vi.fn().mockResolvedValue(new Response(JSON.stringify(brand)))
    vi.stubGlobal("fetch", upstream)
    const saved = await getStartupBranding("https://api-a.example")
    const [url, options] = upstream.mock.calls[0]!
    expect(String(url)).toBe("https://api-a.example/api/v1/branding")
    expect(options).toMatchObject({ credentials: "omit", redirect: "error", headers: { accept: "application/json" } })
    expect(options.signal).toBeInstanceOf(AbortSignal)
    upstream.mockRejectedValue(new Error("offline"))
    expect(await getStartupBranding("https://api-a.example")).toEqual(saved)
    expect(await getStartupBranding("https://api-b.example")).toEqual(FALLBACK_BRANDING)
    const calls = upstream.mock.calls.length
    expect(await getStartupBranding("/api-from-host")).toEqual(FALLBACK_BRANDING)
    expect(await getStartupBranding("file:///etc/passwd")).toEqual(FALLBACK_BRANDING)
    expect(upstream).toHaveBeenCalledTimes(calls)
    vi.spyOn(Date, "now").mockReturnValue(Date.now() + 6 * 60 * 1000)
    expect(await getStartupBranding("https://api-a.example")).toEqual(FALLBACK_BRANDING)
  })
  it("honours runtime API path prefixes and rejects oversized or invalid upstream payloads", async () => {
    const { getStartupBranding } = await import("../../server/utils/branding-bootstrap")
    const upstream = vi.fn().mockImplementation(async () => new Response(JSON.stringify(brand)))
    vi.stubGlobal("fetch", upstream)
    const saved = await getStartupBranding("https://api.example/prefix/")
    expect(String(upstream.mock.calls[0]![0])).toBe("https://api.example/prefix/api/v1/branding")
    upstream.mockImplementation(async () => new Response(JSON.stringify({ ...brand, accent_color: "evil" })))
    expect(await getStartupBranding("https://api.example/prefix/")).toEqual(saved)
    upstream.mockImplementation(async () => new Response("x".repeat(20_000)))
    expect(await getStartupBranding("https://other.example")).toEqual(FALLBACK_BRANDING)
    const calls = upstream.mock.calls.length
    expect(await getStartupBranding("https://user:password@api.example")).toEqual(FALLBACK_BRANDING)
    expect(await getStartupBranding("https://api.example?url=evil")).toEqual(FALLBACK_BRANDING)
    expect(upstream).toHaveBeenCalledTimes(calls)
  })
})
