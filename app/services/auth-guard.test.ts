import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

type Destination = { path: string, query: Record<string, string> }
let guard: (to: Destination) => Promise<unknown>
const token: { value: string | null } = { value: "token" }
const fetchMe = vi.fn()
const navigate = vi.fn((path: string) => path)

beforeEach(async () => {
  vi.resetModules()
  vi.clearAllMocks()
  token.value = "token"
  vi.stubGlobal("defineNuxtRouteMiddleware", (callback: typeof guard) => {
    guard = callback
    return callback
  })
  vi.stubGlobal("useAuthToken", () => token)
  vi.stubGlobal("apiFetch", fetchMe)
  vi.stubGlobal("navigateTo", navigate)
  vi.stubGlobal("createError", (options: object) => Object.assign(new Error("route error"), options))
  await import("../middleware/auth.global")
})

afterEach(() => vi.unstubAllGlobals())

describe("authorization guard", () => {
  it("leaves public rating and login accessible with an expired cookie", async () => {
    for (const path of ["/rating", "/login", "/register"]) {
      await guard({ path, query: {} })
    }
    expect(fetchMe).not.toHaveBeenCalled()
    expect(navigate).not.toHaveBeenCalled()
  })
  it("clears a rejected token and sends the visitor to login", async () => {
    fetchMe.mockRejectedValueOnce({ statusCode: 401 })
    expect(await guard({ path: "/settings", query: {} })).toBe("/login")
    expect(token.value).toBeNull()
  })
  it("redirects viewer home and blocks admin deep links", async () => {
    fetchMe.mockResolvedValue({ role: "viewer" })
    expect(await guard({ path: "/", query: {} })).toBe("/feedback")
    await expect(guard({ path: "/rag/document/42", query: {} })).rejects.toMatchObject({ statusCode: 403 })
    await expect(guard({ path: "/feedback", query: {} })).resolves.toBeUndefined()
  })
  it("does not downgrade a transient me failure to anonymous or clear the cookie", async () => {
    fetchMe.mockRejectedValueOnce(new Error("network"))
    await expect(guard({ path: "/settings", query: {} })).rejects.toMatchObject({ statusCode: 503 })
    expect(token.value).toBe("token")
    expect(navigate).not.toHaveBeenCalled()
  })
  it("requires superadmin for team deep links", async () => {
    fetchMe.mockResolvedValueOnce({ role: "admin" })
    await expect(guard({ path: "/settings", query: { section: "team" } })).rejects.toMatchObject({ statusCode: 403 })
  })
})
