import { describe, expect, it } from "vitest"

import { formatPassRate, summarizeEvaluation } from "./evaluations"

describe("evaluation pass rate", () => {
  it("preserves zero and converts fractions to percent", () => {
    expect(formatPassRate(0)).toBe("0%")
    expect(formatPassRate(0.895)).toBe("89.5%")
    expect(formatPassRate(1)).toBe("100%")
  })
  it("does not invent values for absent or invalid metrics", () => {
    for (const value of [undefined, null, Number.NaN, Infinity, -1, 94]) {
      expect(formatPassRate(value)).toBe("—")
    }
  })
})

describe("actual evaluator response", () => {
  it("keeps product results, zero scores, per-case failures and diagnostics", () => {
    const response = {
      schema_version: 1,
      mode: "product",
      total: 2,
      passed_perfectly: 0,
      pass_rate: 0,
      skipped_ids: ["skip"],
      results: [
        { id: "case-1", question: "Вопрос", session_id: "session", passed: false, answer: "Ответ", checks: [{ kind: "tool", passed: false }], judge_score: 0, reasoning: "Причина", tools_called: ["rag"], faq_matched: false },
        { id: "case-2", passed: false, error: "Model unavailable" },
      ],
    }
    const summary = summarizeEvaluation(response)
    expect(summary).toMatchObject({ passRate: "0%", total: 2, passed: 0, failed: 2, errors: 1 })
    expect(summary.cases).toBe(response.results)
    expect(summary.cases[0]?.judge_score).toBe(0)
  })
  it("does not derive absent counters or pretend total is progress", () => {
    expect(summarizeEvaluation({})).toEqual({ passRate: "—", total: null, passed: null, failed: 0, errors: 0, cases: [] })
  })
})
