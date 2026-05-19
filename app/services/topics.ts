import type { components } from "#openapi"

export type Topic = components["schemas"]["TopicResponse"]
export type TopicCreate = components["schemas"]["TopicCreate"]
export type TopicUpdate = components["schemas"]["TopicUpdate"]
export type TopicListResponse = components["schemas"]["TopicListResponse"]

export type TopicStat = {
  topic_id?: number | null
  label?: string | null
  count?: number | null
  [key: string]: unknown
}

export async function listTopics(): Promise<Topic[]> {
  const data = await apiFetch<TopicListResponse>("/api/v1/topics/")
  return data.topics ?? []
}

export async function createTopic(payload: TopicCreate): Promise<Topic> {
  return await apiFetch<Topic>("/api/v1/topics/", {
    method: "POST",
    body: payload,
  })
}

export async function updateTopic(id: number, payload: TopicUpdate): Promise<Topic> {
  return await apiFetch<Topic>(`/api/v1/topics/${id}`, {
    method: "PUT",
    body: payload,
  })
}

export async function deleteTopic(id: number): Promise<void> {
  await apiFetch(`/api/v1/topics/${id}`, {
    method: "DELETE",
  })
}

export async function getTopicStats(): Promise<TopicStat[]> {
  return await apiFetch<TopicStat[]>("/api/v1/stats/topics")
}
