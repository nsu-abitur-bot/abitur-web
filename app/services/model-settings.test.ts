import { describe, expect, it } from "vitest"

import { checkModelChanges, isModelJobActive, modelChoices, modelSnapshot } from "./model-settings"

describe("unified model settings", () => {
  it("checks use the same chosen model as the save without deleting hidden keys", () => {
    const draft = { TEXT_PROVIDER: "deepseek", TEXT_MODEL: "text-new", EMBEDDING_PROVIDER: "gigachat", EMBEDDING_MODEL: "EmbeddingsGigaR" }
    const changes = checkModelChanges(draft, { DEEPSEEK_API_KEY: "replacement" })
    expect(changes).toMatchObject({ DEEPSEEK_MODEL: "text-new", LLM_PROVIDER: "deepseek", FAQ_EMBEDDING_PROVIDER: "gigachat", GIGACHAT_EMBEDDING_MODEL: "EmbeddingsGigaR" })
    expect(changes).not.toHaveProperty("GEMINI_API_KEY")
    expect(Object.keys(modelChoices(draft))).toHaveLength(4)
  })
  it("recognizes only nonterminal jobs as blocking changes", () => {
    expect(isModelJobActive(null)).toBe(false)
    for (const status of ["queued", "running", "cancelling"] as const) {
      expect(isModelJobActive({ id: "job", status, progress: {}, error: null })).toBe(true)
    }
    for (const status of ["completed", "failed", "cancelled"] as const) {
      expect(isModelJobActive({ id: "job", status, progress: {}, error: null })).toBe(false)
    }
  })
  it("legacy defaults are displayed without making the initial form dirty", () => {
    const snapshot = { revision: 1, encryption_ready: true, settings: [{ key: "TEXT_MODEL", label: "Текстовая модель", group: "Модели", kind: "text", choices: [], configured: false, secret: false, value: "" }] }
    const config = { snapshot, revision: 1, version: 1, assignments: { TEXT_MODEL: "existing-model" }, legacy: [], job: null }
    expect(modelSnapshot(snapshot, config).settings[0]?.value).toBe("existing-model")
    expect(snapshot.settings[0]?.value).toBe("")
  })
})
