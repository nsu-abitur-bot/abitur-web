import { describe, expect, it } from "vitest"

import { parseUserId } from "./message-filters"

describe("user filter input", () => {
  it("accepts both string and numeric values from UInput and preserves zero", () => {
    expect(parseUserId(" 42 ")).toBe(42)
    expect(parseUserId(42)).toBe(42)
    expect(parseUserId(0)).toBe(0)
    expect(parseUserId(" ")).toBeUndefined()
  })
  it("rejects invalid identifiers before querying the API", () => {
    for (const value of ["wrong", "1.2", -1, Infinity, Number.MAX_SAFE_INTEGER + 1]) {
      expect(() => parseUserId(value)).toThrow("Введите целый идентификатор пользователя.")
    }
  })
})
