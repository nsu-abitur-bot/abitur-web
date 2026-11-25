import { afterEach, describe, expect, it, vi } from "vitest"

import { importAdmissionScore, updateAdmissionScore } from "./admission-scores"

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("importAdmissionScore", () => {
  it("submits a historical year and its score to the backend import endpoint", async () => {
    const request = vi.fn(async () => ({ created: 1, updated: 0, skipped: 0 }))
    vi.stubGlobal("apiFetch", request)
    const row = {
      faculty_name: "Факультет информационных технологий",
      program_name: "Программная инженерия",
      code: "09.03.04",
      level: "bachelor",
      year: 2021,
      form: "budget",
      passing_score: 246,
      average_score: null,
    }

    const result = await importAdmissionScore(row)

    expect(request).toHaveBeenCalledWith("/api/v1/admission-scores/import", {
      method: "POST",
      body: { rows: [row] },
    })
    expect(result.created).toBe(1)
  })
})

describe("updateAdmissionScore", () => {
  it("keeps omitted fields separate from explicit clearing and accepts zero", async () => {
    const request = vi.fn(async () => ({ id: "score/1", source_url: null, seat_count: 0 }))
    vi.stubGlobal("apiFetch", request)

    const changes = { source_url: null, seat_count: 0 }
    const result = await updateAdmissionScore("score/1", changes)

    expect(request).toHaveBeenCalledWith("/api/v1/admission-scores/score%2F1", {
      method: "PATCH",
      body: { source_url: null, seat_count: 0 },
    })
    expect(result).toMatchObject(changes)
  })
})
