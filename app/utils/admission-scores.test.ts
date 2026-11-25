import { expect, it } from "vitest"

import { httpUrl, MAX_SEAT_COUNT, optionalNumber, validSeatCount } from "./admission-scores"

it("treats a blank number and zero separately", () => {
  expect(optionalNumber("")).toBeNull()
  expect(optionalNumber("0")).toBe(0)
  expect(optionalNumber(0)).toBe(0)
})

it("accepts only whole non-negative seat counts in the server range", () => {
  expect([null, 0, MAX_SEAT_COUNT].every(validSeatCount)).toBe(true)
  expect([-1, 0.5, MAX_SEAT_COUNT + 1, Number.NaN].some(validSeatCount)).toBe(false)
})

it("uses only HTTP and HTTPS as source links", () => {
  expect(httpUrl(" https://example.org/source ")).toBe("https://example.org/source")
  expect(httpUrl("http://example.org/source")).toBeDefined()
  expect(httpUrl("https://")).toBeUndefined()
  expect(httpUrl("ftp://example.org/source")).toBeUndefined()
})
