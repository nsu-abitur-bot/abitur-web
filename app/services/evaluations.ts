export interface EvaluationCase {
  id?: string | number
  question?: string
  session_id?: string
  passed?: boolean
  answer?: string | null
  tools_called?: unknown
  faq_matched?: unknown
  checks?: Array<{ kind: string, passed: boolean }>
  judge_score?: number | null
  reasoning?: string | null
  error?: string | null
  [key: string]: unknown
}

export interface EvaluationResult {
  schema_version?: number
  mode?: string
  total?: number
  passed_perfectly?: number
  pass_rate?: number | null
  results?: EvaluationCase[]
  errors?: unknown
  skipped_ids?: unknown[]
  rag_results?: unknown
  faq_results?: unknown
}

export interface EvaluationStatus {
  is_running: boolean
  error?: string | null
  last_result?: EvaluationResult | null
}

export function formatPassRate(value: number | null | undefined): string {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 1
    ? `${Math.round(value * 1000) / 10}%`
    : "—"
}

export function summarizeEvaluation(result: EvaluationResult) {
  const cases = result.results ?? []
  return {
    passRate: formatPassRate(result.pass_rate),
    total: result.total ?? null,
    passed: result.passed_perfectly ?? null,
    failed: cases.filter(item => item.passed === false).length,
    errors: cases.filter(item => !!item.error).length,
    cases,
  }
}
