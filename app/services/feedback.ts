import type {
  FeedbackReportFilters,
  FeedbackReportListResponse,
  FeedbackReportResponse,
  FeedbackReportStatusUpdate,
} from "~/types/feedback"

export async function listFeedbackReports(filters: FeedbackReportFilters = {}): Promise<FeedbackReportListResponse> {
  return await apiFetch<FeedbackReportListResponse>("/api/v1/feedback", {
    query: {
      ...filters,
      status: filters.status || undefined,
      user_id: filters.user_id ?? undefined,
      session_id: filters.session_id || undefined,
      limit: filters.limit ?? 50,
      offset: filters.offset ?? 0,
    },
  })
}

export async function getFeedbackReport(reportId: number): Promise<FeedbackReportResponse> {
  return await apiFetch<FeedbackReportResponse>(`/api/v1/feedback/${reportId}`)
}

export async function updateFeedbackReportStatus(
  reportId: number,
  payload: FeedbackReportStatusUpdate,
): Promise<FeedbackReportResponse> {
  return await apiFetch<FeedbackReportResponse>(`/api/v1/feedback/${reportId}`, {
    method: "PATCH",
    body: payload,
  })
}
