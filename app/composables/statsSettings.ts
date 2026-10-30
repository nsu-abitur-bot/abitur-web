import { useLocalStorage } from "@vueuse/core"

import type { Topic, TopicCreate, TopicUpdate } from "~/services/topics"
import { createTopic, deleteTopic, listTopics, updateTopic } from "~/services/topics"

export interface PopularQuestion {
  question: string
  count: number
  variants: string[]
}

const defaultPopularLimit = 5

export function useStatsSettings() {
  const popularLimit = useLocalStorage<number>("stats-popular-limit", defaultPopularLimit)

  return { popularLimit }
}

export function useTopics() {
  const topics = useState<Topic[]>("topics-cache", () => [])
  const isLoading = useState<boolean>("topics-loading", () => false)

  const error = useState<string | null>("topics-error", () => null)

  const refresh = async (): Promise<void> => {
    isLoading.value = true
    error.value = null
    try {
      topics.value = await listTopics()
    } catch {
      error.value = "Не удалось загрузить темы"
    } finally {
      isLoading.value = false
    }
  }

  const create = async (payload: TopicCreate): Promise<Topic> => {
    const created = await createTopic(payload)
    await refresh()
    return created
  }

  const update = async (id: number, payload: TopicUpdate): Promise<Topic> => {
    const updated = await updateTopic(id, payload)
    await refresh()
    return updated
  }

  const remove = async (id: number): Promise<void> => {
    await deleteTopic(id)
    await refresh()
  }

  return { topics, isLoading, error, refresh, create, update, remove }
}
