import { useLocalStorage } from "@vueuse/core"

export interface StatsTopic {
  id: string
  label: string
}

export interface PopularQuestion {
  question: string
  count: number
}

const defaultTopics: StatsTopic[] = [
  { id: "topic-1", label: "Общежитие" },
  { id: "topic-2", label: "Поступление" },
  { id: "topic-3", label: "Проходные баллы" },
]

const defaultPopularLimit = 5

export function useStatsSettings() {
  const topics = useLocalStorage<StatsTopic[]>("stats-topics", defaultTopics)
  const popularLimit = useLocalStorage<number>("stats-popular-limit", defaultPopularLimit)

  return { topics, popularLimit }
}

export function useTopicClassification() {
  const topicMap = useLocalStorage<Record<string, string>>("stats-topic-map", {})

  const setTopicForQuestion = (question: string, topicId: string | null) => {
    if (!question) {
      return
    }

    if (!topicId) {
      delete topicMap.value[question]
      topicMap.value = { ...topicMap.value }
      return
    }

    topicMap.value = {
      ...topicMap.value,
      [question]: topicId,
    }
  }

  return { topicMap, setTopicForQuestion }
}
