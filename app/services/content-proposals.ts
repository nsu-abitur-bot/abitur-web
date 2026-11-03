import type { components } from "#openapi"

export type ContentProposal = components["schemas"]["ProposalResponse"]

export async function listContentProposals(): Promise<ContentProposal[]> {
  return await apiFetch<ContentProposal[]>("/api/v1/content-proposals")
}

export async function reviewContentProposal(id: string, action: "approve" | "reject"): Promise<ContentProposal> {
  return await apiFetch<ContentProposal>(`/api/v1/content-proposals/${encodeURIComponent(id)}/${action}`, {
    method: "POST",
  })
}
