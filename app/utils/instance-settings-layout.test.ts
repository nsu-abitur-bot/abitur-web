import { describe, expect, it } from "vitest"

import type { InstanceSetting } from "~/services/instance-settings"
import { instanceGroup, instanceSection, instanceSections, isAdvancedSetting, isBrandingSetting } from "~/utils/instance-settings-layout"

function field(key: string, group: string): InstanceSetting {
  return { key, group, label: key, kind: "text", secret: false, configured: false, choices: [], value: "" }
}

describe("instance settings presentation", () => {
  it("keeps every assignment visible and preserves the API group and value", () => {
    for (const key of ["LLM_PROVIDER", "FAQ_EMBEDDING_PROVIDER", "LIGHTRAG_LLM_PROVIDER", "LIGHTRAG_EMBEDDING_PROVIDER", "PDF_PARSER_PROVIDER"]) {
      const setting = { ...field(key, "Назначение моделей"), choices: ["openai", "gemini", "deepseek"], value: "deepseek" }
      const original = structuredClone(setting)
      expect(instanceSection(setting)).toBe("Модели")
      expect(isAdvancedSetting(setting)).toBe(false)
      expect(setting).toEqual(original)
    }
  })

  it("discloses transport and tuning fields without hiding provider models", () => {
    for (const provider of ["OPENAI", "GEMINI", "DEEPSEEK"]) {
      for (const suffix of ["MODEL", "GRAPH_MODEL", "MODEL_VISION", "EMBEDDING_MODEL", "GRAPH_EMBEDDING_MODEL", "API_KEY"]) {
        expect(isAdvancedSetting(field(`${provider}_${suffix}`, provider))).toBe(false)
      }
      for (const suffix of ["BASE_URL", "SOCKS5_PROXY", "TEMPERATURE", "TIMEOUT_SECONDS", "MAX_TOKENS"]) {
        expect(isAdvancedSetting(field(`${provider}_${suffix}`, provider))).toBe(true)
      }
    }
  })

  it("retains university contacts, technical profile and future schema fields", () => {
    expect(instanceSection(field("ADMISSIONS_EMAIL", "Вуз"))).toBe("Оформление")
    expect(instanceGroup(field("ADMISSIONS_EMAIL", "Вуз"))).toBe("Контакты и помощник")
    expect(isBrandingSetting(field("UNIVERSITY_SHORT_NAME", "Вуз"))).toBe(true)
    expect(instanceSection(field("UNIVERSITY_PROFILE", "Вуз"))).toBe("Дополнительно")
    expect(instanceSection(field("BOT_TOKEN", "Telegram"))).toBe("Боты")
    const future = field("FUTURE_OPTION", "Новая группа")
    expect(instanceSections).toContain(instanceSection(future))
    expect(instanceGroup(future)).toBe("Новая группа")
  })
})
