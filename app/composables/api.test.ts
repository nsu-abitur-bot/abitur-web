import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { effectScope, ref, watch } from "vue"

import { apiFetch, useApi } from "./api"

const token = ref<string | null>(null)
const error = ref<unknown>(null)
const navigate = vi.fn()
const fetch = vi.fn()
let scope = effectScope()

beforeEach(() => {
  scope = effectScope()
  token.value = "expired-session"
  error.value = null
  vi.clearAllMocks()
  vi.stubGlobal("useCookie", () => token)
  vi.stubGlobal("useRuntimeConfig", () => ({ public: { apiBaseUrl: "http://localhost" } }))
  vi.stubGlobal("useNuxtApp", () => ({ runWithContext: (callback: () => unknown) => callback() }))
  vi.stubGlobal("useMyApi", () => ({ error }))
  vi.stubGlobal("watch", (...args: Parameters<typeof watch>) => scope.run(() => watch(...args)))
  vi.stubGlobal("navigateTo", navigate)
  vi.stubGlobal("$fetch", fetch)
})

afterEach(() => {
  scope.stop()
  vi.unstubAllGlobals()
})

describe("expired API session", () => {
  it("redirects when a refresh fails after the page has mounted", async () => {
    useApi("/api/v1/auth/me")
    error.value = { statusCode: 401 }
    await Promise.resolve()
    expect(token.value).toBeNull()
    expect(navigate).toHaveBeenCalledWith("/login")
  })

  it("expires a session after an imperative request is rejected", async () => {
    const failure = { statusCode: 401 }
    fetch.mockRejectedValueOnce(failure)
    await expect(apiFetch("/api/v1/auth/me")).rejects.toBe(failure)
    expect(token.value).toBeNull()
    expect(navigate).toHaveBeenCalledWith("/login")
  })

  it("keeps a session after forbidden access", async () => {
    fetch.mockRejectedValueOnce({ statusCode: 403 })
    await expect(apiFetch("/api/v1/auth/me")).rejects.toMatchObject({ statusCode: 403 })
    expect(token.value).toBe("expired-session")
    expect(navigate).not.toHaveBeenCalled()
  })

  it("does not discard a newly authenticated session after an old request fails", async () => {
    useApi("/api/v1/auth/me")
    token.value = "new-session"
    error.value = { statusCode: 401 }
    await Promise.resolve()
    expect(token.value).toBe("new-session")
    expect(navigate).not.toHaveBeenCalled()
  })

  it("does not clear a new session when an older imperative request returns 401", async () => {
    let rejectRequest!: (reason: unknown) => void
    fetch.mockReturnValueOnce(new Promise((_resolve, reject) => {
      rejectRequest = reject
    }))
    const request = apiFetch("/api/v1/auth/me")
    token.value = "new-session"
    rejectRequest({ statusCode: 401 })
    await expect(request).rejects.toMatchObject({ statusCode: 401 })
    expect(token.value).toBe("new-session")
    expect(navigate).not.toHaveBeenCalled()
  })
})
