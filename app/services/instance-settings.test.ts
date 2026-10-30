import { describe, expect, it } from "vitest"

import type { InstanceSetting } from "./instance-settings"
import { collectChanges } from "./instance-settings"

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
