import { describe, expect, it } from "vitest"

import { canAccessRoute, publicPaths } from "./auth-access"

describe("route permissions", () => {
  it("keeps rating public", () => expect(publicPaths.has("/rating")).toBe(true))
  it("permits viewer feedback and analytics while blocking admin deep links", () => {
    for (const path of ["/messages", "/feedback", "/stats"]) {
      expect(canAccessRoute("viewer", path)).toBe(true)
    }
    for (const path of ["/", "/rag/document/42", "/rag/inspector", "/faq", "/testing", "/settings", "/system-logs"]) {
      expect(canAccessRoute("viewer", path)).toBe(false)
    }
  })
  it("restricts connections and team without blocking admin rules", () => {
    expect(canAccessRoute("admin", "/settings", "rules")).toBe(true)
    expect(canAccessRoute("admin", "/settings", "topics")).toBe(true)
    for (const section of ["team", "connections"]) {
      expect(canAccessRoute("admin", "/settings", section)).toBe(false)
      expect(canAccessRoute("superadmin", "/settings", section)).toBe(true)
    }
  })
})
