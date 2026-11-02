import type { InstanceSetting } from "~/services/instance-settings"

export const instanceSections = ["Оформление", "Модели", "Боты", "Дополнительно"] as const
export type InstanceSection = typeof instanceSections[number]

const brandingKeys = new Set(["UNIVERSITY_SHORT_NAME", "UNIVERSITY_FULL_NAME", "UNIVERSITY_LOGO_URL", "UNIVERSITY_ACCENT_COLOR"])
export function isBrandingSetting(setting: InstanceSetting) {
  return brandingKeys.has(setting.key)
}

export function instanceSection(setting: InstanceSetting): InstanceSection {
  if (setting.key === "UNIVERSITY_PROFILE") {
    return "Дополнительно"
  }
  if (brandingKeys.has(setting.key) || ["Вуз", "Университет"].includes(setting.group)) {
    return "Оформление"
  }
  if (["Назначение моделей", "OpenAI", "Gemini", "DeepSeek"].includes(setting.group)) {
    return "Модели"
  }
  return ["Telegram", "MAX"].includes(setting.group) ? "Боты" : "Дополнительно"
}

export function isAdvancedSetting(setting: InstanceSetting) {
  return /_(?:BASE_URL|SOCKS5_PROXY|TEMPERATURE|TIMEOUT_SECONDS|MAX_TOKENS)$/.test(setting.key)
}

export function instanceGroup(setting: InstanceSetting) {
  if (setting.key === "UNIVERSITY_PROFILE") {
    return "Профиль вуза"
  }
  if (instanceSection(setting) === "Оформление") {
    return isBrandingSetting(setting) ? "Оформление" : "Контакты и помощник"
  }
  if (setting.group === "Параметры вызовов") {
    const purpose = setting.key.split("_")[1] ?? ""
    const labels: Record<string, string> = { CHAT: "Ответы", GRAPH: "Граф знаний", PARSER: "Подготовка текста", VISION: "Документы и изображения", INTENT: "Классификация", TITLE: "Заголовки", EMBEDDING: "Эмбеддинги" }
    return labels[purpose] ? `Параметры вызовов · ${labels[purpose]}` : setting.group
  }
  if (setting.group === "Обработка и источники") {
    if (/^(?:SEED_|ADMISSION_SCORES_)/.test(setting.key)) {
      return "Начальное наполнение"
    }
    if (/^(?:RATING_|MOCK_RATING_|SCHEDULER_)/.test(setting.key)) {
      return "Конкурсные списки"
    }
    if (setting.key.startsWith("MAX_DOCUMENT_")) {
      return "Загрузка документов"
    }
    return "Обработка и уведомления"
  }
  return setting.group
}
