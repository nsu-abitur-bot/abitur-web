import type { components } from "#openapi"

export type FeedbackStatus = "open" | "reviewed" | "ignored"
export type FeedbackReportListItem = components["schemas"]["FeedbackReportListItem"]
export type FeedbackReportListResponse = components["schemas"]["FeedbackReportListResponse"]
export type FeedbackReportResponse = components["schemas"]["FeedbackReportResponse"]
export type FeedbackReportStatusUpdate = components["schemas"]["FeedbackReportStatusUpdate"]

export interface FeedbackReportFilters {
  status?: FeedbackStatus | null
  user_id?: number | null
  session_id?: string | null
  limit?: number
  offset?: number
}
