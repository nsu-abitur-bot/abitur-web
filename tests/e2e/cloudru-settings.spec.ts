import { expect, test } from "@playwright/test"

test("Cloud.ru appears under models, masks credentials, checks connection, and formats choices", async ({ page, context }) => {
  let revision = 1
  const checks: string[] = []
  const saves: Record<string, string>[] = []
  let finishSave!: () => void
  const saving = new Promise<void>((resolve) => {
    finishSave = resolve
  })
  const settings = [
    { key: "FAQ_EMBEDDING_PROVIDER", label: "Эмбеддинги FAQ", group: "Назначение моделей", kind: "text", secret: false, choices: ["openai", "gemini", "gigachat", "cloudru"], configured: true, value: "cloudru" },
    { key: "CLOUDRU_API_KEY", label: "API-ключ", group: "Cloud.ru", kind: "text", secret: true, choices: [], configured: false, value: null },
    { key: "CLOUDRU_EMBEDDING_MODEL", label: "Модель эмбеддингов", group: "Cloud.ru", kind: "text", secret: false, choices: [], configured: true, value: "ai-sage/Giga-Embeddings-instruct-3B" },
    { key: "UNIVERSITY_PROFILE", label: "Профиль вуза", group: "Вуз", kind: "text", secret: false, choices: ["nsu", "custom"], configured: true, value: "nsu" },
  ]
  await context.route("**/api/v1/settings/instance**", async (route) => {
    const headers = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "*", "Access-Control-Allow-Methods": "*" }
    if (route.request().method() === "OPTIONS") {
      return route.fulfill({ status: 204, headers })
    }
    if (new URL(route.request().url()).pathname.endsWith("/check")) {
      checks.push(route.request().postDataJSON().target)
      return route.fulfill({ headers, json: { message: "Подключение проверено" } })
    }
    if (route.request().method() === "PUT") {
      saves.push(route.request().postDataJSON().changes)
      await saving
      settings[1]!.configured = true
      settings[2]!.value = saves[0]!.CLOUDRU_EMBEDDING_MODEL ?? settings[2]!.value
      revision++
    }
    return route.fulfill({ headers, json: { revision, encryption_ready: true, settings } })
  })
  await page.goto("/login")
  await page.getByLabel("Логин", { exact: false }).fill("e2e-admin")
  await page.getByLabel("Пароль", { exact: false }).fill("local-test-password")
  await page.getByRole("button", { name: "Войти", exact: true }).click()
  await expect(page).toHaveURL("http://127.0.0.1:9464/")
  await page.goto("/settings?section=connections")

  // Ensure Cloud.ru provider label appears correctly in assignments
  const embeddingSelect = page.getByRole("combobox", { name: "Эмбеддинги FAQ", exact: true })
  await expect(embeddingSelect).toContainText("Cloud.ru")

  // Cloud.ru is under Модели, not in Дополнительно
  await expect(page.locator("summary").filter({ hasText: "Cloud.ru" })).toBeVisible()
  await page.getByRole("button", { name: "Дополнительно", exact: true }).click()
  await expect(page.locator("summary").filter({ hasText: "Cloud.ru" })).toHaveCount(0)

  // Switch back to Модели
  await page.getByRole("button", { name: "Модели", exact: true }).click()
  await page.locator("summary").filter({ hasText: "Cloud.ru" }).click()

  const key = page.locator("#instance-CLOUDRU_API_KEY")
  await expect(key).toHaveAttribute("type", "password")
  await expect(key).toHaveAttribute("placeholder", "Не задан")
  await key.fill("isolated-cloudru-test-key")

  const model = page.locator("#instance-CLOUDRU_EMBEDDING_MODEL")
  await expect(model).toHaveValue("ai-sage/Giga-Embeddings-instruct-3B")
  await model.fill("custom-cloudru-model")

  // Verify connection check sends cloudru:embedding
  await page.getByRole("button", { name: "Проверить: эмбеддинги", exact: true }).click()
  await expect.poll(() => checks).toEqual(["cloudru:embedding"])

  // Save changes
  await page.getByRole("button", { name: "Сохранить изменения (2)", exact: true }).click()
  await expect.poll(() => saves.length).toBe(1)
  await expect(key).toBeDisabled()
  await expect(model).toBeDisabled()
  finishSave()

  expect(saves[0]).toEqual({
    CLOUDRU_API_KEY: "isolated-cloudru-test-key",
    CLOUDRU_EMBEDDING_MODEL: "custom-cloudru-model",
  })

  // Once saved and reloaded, key is masked and model has new value
  await expect(key).toHaveValue("")
  await expect(key).toHaveAttribute("placeholder", "Задан — оставьте пустым, чтобы сохранить")
  await expect(model).toBeEnabled()
  await expect(model).toHaveValue("custom-cloudru-model")
})
