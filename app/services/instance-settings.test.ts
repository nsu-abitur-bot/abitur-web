import { describe, expect, it } from "vitest"

import type { InstanceSetting, InstanceSettings } from "./instance-settings"
import { collectChanges, connectionPurposes, isRevisionConflict, rebaseSettings } from "./instance-settings"

const settings: InstanceSetting[] = [
  { key: "BOT_TOKEN", label: "Token", group: "Telegram", kind: "text", choices: [], secret: true, configured: true, value: null },
  { key: "LLM_PROVIDER", label: "Provider", group: "Models", kind: "text", choices: [], secret: false, configured: true, value: "gemini" },
]

describe("collectChanges", () => {
  it("never submits a blank password as an accidental key removal", () => {
    expect(collectChanges(settings, { BOT_TOKEN: "", LLM_PROVIDER: "gemini" }, new Set())).toEqual({})
  })
  it("submits explicit deletion and a changed ordinary setting", () => {
    expect(collectChanges(settings, { BOT_TOKEN: "", LLM_PROVIDER: "openai" }, new Set(["BOT_TOKEN"]))).toEqual({ BOT_TOKEN: null, LLM_PROVIDER: "openai" })
  })
  it("submits a replacement key without resubmitting unchanged settings", () => {
    expect(collectChanges(settings, { BOT_TOKEN: "replacement", LLM_PROVIDER: "gemini" }, new Set())).toEqual({ BOT_TOKEN: "replacement" })
  })
})

describe("revision rebase", () => {
  const snapshot = (revision: number, items: InstanceSetting[] = settings): InstanceSettings => ({ revision, settings: items, encryption_ready: true })
  it("adopts remote changes only for untouched fields and keeps replacement secrets", () => {
    const latest = snapshot(2, settings.map(item => item.key === "LLM_PROVIDER" ? { ...item, value: "remote-provider" } : item))
    const result = rebaseSettings(snapshot(1), latest, { BOT_TOKEN: "local-key", LLM_PROVIDER: "gemini" }, new Set())
    expect(result.draft).toEqual({ BOT_TOKEN: "local-key", LLM_PROVIDER: "remote-provider" })
    expect(collectChanges(latest.settings, result.draft, result.removed)).toEqual({ BOT_TOKEN: "local-key" })
    expect(result.conflicts).toEqual(["BOT_TOKEN"])
  })
  it("retains overlapping local edits and explicit secret deletion for review", () => {
    const latest = snapshot(3, settings.map(item => item.key === "LLM_PROVIDER" ? { ...item, value: "third-provider" } : item))
    const result = rebaseSettings(snapshot(1), latest, { BOT_TOKEN: "", LLM_PROVIDER: "openai" }, new Set(["BOT_TOKEN"]))
    expect(collectChanges(latest.settings, result.draft, result.removed)).toEqual({ BOT_TOKEN: null, LLM_PROVIDER: "openai" })
    expect(result.conflicts).toEqual(["BOT_TOKEN", "LLM_PROVIDER"])
  })
  it("reports removed schema fields rather than silently dropping their edits", () => {
    expect(rebaseSettings(snapshot(1), snapshot(2, []), { BOT_TOKEN: "new-key" }, new Set()).missing).toEqual(["BOT_TOKEN"])
  })
  it("does not mark a null optional ordinary value as dirty", () => {
    expect(collectChanges([{ ...settings[1]!, value: null }], { LLM_PROVIDER: "" }, new Set())).toEqual({})
  })
  it("recognizes HTTP 409 shapes without treating network errors as conflicts", () => {
    for (const error of [{ status: 409 }, { statusCode: 409 }, { response: { status: 409 } }]) {
      expect(isRevisionConflict(error)).toBe(true)
    }
    expect(isRevisionConflict(new Error("network"))).toBe(false)
  })
})

describe("connectionPurposes", () => {
  const model = (group: string, suffix: string): InstanceSetting => ({ key: `${group.toUpperCase()}_${suffix}`, group, label: suffix, kind: "text", choices: [], secret: false, configured: true, value: "model" })

  it("offers DeepSeek chat and graph without unsupported vision or embeddings", () => {
    const schema = [model("DeepSeek", "MODEL"), model("DeepSeek", "GRAPH_MODEL"), model("Gemini", "MODEL_VISION")]
    expect(connectionPurposes(schema, "DeepSeek").map(purpose => purpose.value)).toEqual(["chat", "graph"])
  })

  it("preserves all checks for Gemini and OpenAI when exposed by the schema", () => {
    for (const group of ["Gemini", "OpenAI"]) {
      const schema = ["MODEL", "GRAPH_MODEL", "MODEL_VISION", "EMBEDDING_MODEL", "GRAPH_EMBEDDING_MODEL"].map(suffix => model(group, suffix))
      expect(connectionPurposes(schema, group).map(purpose => purpose.value)).toEqual(["chat", "graph", "vision", "embedding", "graph_embedding"])
      expect(connectionPurposes(schema, "Telegram")).toEqual([])
    }
  })
})

it("offers one shared embedding check for GigaChat", () => {
  const setting = { key: "GIGACHAT_EMBEDDING_MODEL", group: "GigaChat", label: "Модель эмбеддингов", kind: "text", choices: [], secret: false, configured: true, value: "EmbeddingsGigaR" }
  expect(connectionPurposes([setting], "GigaChat")).toEqual([{ suffix: "EMBEDDING_MODEL", value: "embedding", label: "эмбеддинги" }])
})
