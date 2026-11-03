import { afterEach, describe, expect, it, vi } from "vitest"

import { listContentProposals, reviewContentProposal } from "./content-proposals"

afterEach(() => vi.unstubAllGlobals())

describe("content proposals", () => {
  it("loads the editor queue", async () => {
    const request = vi.fn(async () => [])
    vi.stubGlobal("apiFetch", request)
    expect(await listContentProposals()).toEqual([])
    expect(request).toHaveBeenCalledWith("/api/v1/content-proposals")
  })

  it("sends one decision for a proposal", async () => {
    const request = vi.fn(async () => ({ status: "approved" }))
    vi.stubGlobal("apiFetch", request)
    await reviewContentProposal("a/b", "approve")
    expect(request).toHaveBeenCalledWith("/api/v1/content-proposals/a%2Fb/approve", { method: "POST" })
  })
})
