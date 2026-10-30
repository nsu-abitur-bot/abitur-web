import { beforeEach, describe, expect, it, vi } from "vitest"
import type { Ref } from "vue"
import { shallowRef } from "vue"

import { listTopics } from "~/services/topics"

import { useTopics } from "./statsSettings"

vi.mock("~/services/topics", () => ({
  listTopics: vi.fn(),
  createTopic: vi.fn(),
  updateTopic: vi.fn(),
  deleteTopic: vi.fn(),
}))

beforeEach(() => {
  vi.clearAllMocks()
  const state = new Map<string, Ref<unknown>>()
  vi.stubGlobal("useState", (key: string, init: () => unknown) => {
    if (!state.has(key)) {
      state.set(key, shallowRef(init()))
    }
    return state.get(key)
  })
})

describe("topic cache loading", () => {
  it("preserves existing topics and distinguishes a failed refresh from empty data", async () => {
    const cache = useTopics()
    cache.topics.value = [{ id: 7, label: "Приём", is_active: true, created_at: "2026-10-30T09:00:00Z" }]
    vi.mocked(listTopics).mockRejectedValueOnce(new Error("Unavailable"))
    await cache.refresh()
    expect(cache.topics.value).toHaveLength(1)
    expect(cache.error.value).toBe("Не удалось загрузить темы")
    expect(cache.isLoading.value).toBe(false)
    vi.mocked(listTopics).mockResolvedValueOnce([])
    await cache.refresh()
    expect(cache.error.value).toBeNull()
    expect(cache.topics.value).toEqual([])
  })
})
