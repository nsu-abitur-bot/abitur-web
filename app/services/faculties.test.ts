import { afterEach, describe, expect, it, vi } from "vitest"

import type { ProgramItem } from "./faculties"
import {
  createProgram,
  EDUCATION_LEVELS,
  educationLevelLabel,
  getFaculties,
  updateProgram,
} from "./faculties"

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("education levels", () => {
  it("offers СПО alongside the existing higher education levels", () => {
    expect(EDUCATION_LEVELS).toEqual([
      { label: "Бакалавриат", value: "bachelor" },
      { label: "Специалитет", value: "specialist" },
      { label: "Магистратура", value: "master" },
      { label: "СПО", value: "spo" },
    ])
    expect(educationLevelLabel("spo")).toBe("СПО")
    expect(educationLevelLabel("unknown")).toBe("unknown")
  })

  it("passes СПО through create, update and subsequent faculty reads", async () => {
    const program: ProgramItem = {
      id: "college-program",
      faculty_id: "college",
      name: "Информационные системы и программирование",
      code: "09.02.07",
      level: "spo",
      is_active: true,
    }
    const updated = { ...program, name: "Программирование в компьютерных системах" }
    const request = vi.fn()
      .mockResolvedValueOnce(program)
      .mockResolvedValueOnce(updated)
      .mockResolvedValueOnce([{ id: "college", programs: [updated] }])
    vi.stubGlobal("apiFetch", request)

    const payload = {
      name: program.name,
      code: program.code,
      level: program.level,
      is_active: program.is_active,
    }
    expect(await createProgram("college", payload)).toEqual(program)
    expect(request).toHaveBeenNthCalledWith(1, "/api/v1/faculties/college/programs", {
      method: "POST",
      body: payload,
    })
    expect(await updateProgram(program.id, { name: updated.name, level: "spo" })).toEqual(updated)
    expect(request).toHaveBeenNthCalledWith(2, "/api/v1/faculties/programs/college-program", {
      method: "PUT",
      body: { name: updated.name, level: "spo" },
    })
    const faculties = await getFaculties()
    expect(faculties[0]?.programs?.[0]?.level).toBe("spo")
  })
})
