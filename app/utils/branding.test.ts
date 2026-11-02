import { describe, expect, it } from "vitest"

import { brandPalette, contrast, resolveBrandMedia } from "./branding"

describe("branding", () => {
  it("resolves own media against API origin on client and server", () => {
    expect(resolveBrandMedia("/api/v1/branding/media/a.png", "https://api.example/")).toBe("https://api.example/api/v1/branding/media/a.png")
    expect(resolveBrandMedia("javascript:alert(1)", "https://api.example")).toBe("")
    expect(resolveBrandMedia("//evil.example/a.png", "https://api.example")).toBe("")
  })
  it("keeps accessible text for extreme and saturated accents", () => {
    for (const hex of ["#ffffff", "#000000", "#ffff00", "#00ff00", "#ff0000", "#006633", "#bb00ff"]) {
      const palette = brandPalette(hex)
      expect(contrast(palette[600]!, "#ffffff")).toBeGreaterThanOrEqual(4.5)
      expect(contrast(palette[600]!, palette[50]!)).toBeGreaterThanOrEqual(4.5)
      expect(contrast(palette[300]!, palette[900]!)).toBeGreaterThanOrEqual(4.5)
      expect(contrast(palette[300]!, "#1d212c")).toBeGreaterThanOrEqual(4.5)
    }
  })
})
