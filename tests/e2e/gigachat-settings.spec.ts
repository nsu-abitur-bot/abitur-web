import { expect, test } from "@playwright/test"

test("GigaChat has a masked credential and one shared embedding model check", async ({ page, context }) => {
  let revision = 1
  const checks: string[] = []
  const saves: Record<string, string>[] = []
  let finishSave!: () => void
  const saving = new Promise<void>((resolve) => {
    finishSave = resolve
  })
  const settings = [
    { key: "GIGACHAT_API_KEY", label: "Ключ авторизации", group: "GigaChat", kind: "text", secret: true, choices: [], configured: false, value: null },
    { key: "GIGACHAT_SCOPE", label: "Тип доступа", group: "GigaChat", kind: "text", secret: false, choices: ["GIGACHAT_API_PERS", "GIGACHAT_API_B2B", "GIGACHAT_API_CORP"], configured: true, value: "GIGACHAT_API_PERS" },
    { key: "GIGACHAT_EMBEDDING_MODEL", label: "Модель эмбеддингов", group: "GigaChat", kind: "text", secret: false, choices: ["Embeddings", "Embeddings-2", "EmbeddingsGigaR"], configured: true, value: "EmbeddingsGigaR" },
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
      settings[0]!.configured = true
      settings[1]!.value = saves[0]!.GIGACHAT_SCOPE!
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
  await page.locator("summary").filter({ hasText: "GigaChat" }).click()
  const key = page.locator("#instance-GIGACHAT_API_KEY")
  await expect(key).toHaveAttribute("type", "password")
  await key.fill("isolated-test-auth-key")
  const scope = page.getByRole("combobox", { name: "Тип доступа", exact: true })
  await expect(scope).toContainText("GIGACHAT_API_PERS")
  await scope.focus()
  await page.keyboard.press("Enter")
  await expect(page.getByRole("option", { name: "GIGACHAT_API_PERS", exact: true })).toBeFocused()
  await page.keyboard.press("ArrowDown")
  await expect(page.getByRole("option", { name: "GIGACHAT_API_B2B", exact: true })).toBeFocused()
  await page.keyboard.press("Enter")
  await expect(scope).toContainText("GIGACHAT_API_B2B")
  await page.getByRole("button", { name: "Проверить: эмбеддинги", exact: true }).click()
  await expect.poll(() => checks).toEqual(["gigachat:embedding"])
  await page.getByRole("button", { name: "Сохранить изменения (2)", exact: true }).click()
  await expect.poll(() => saves.length).toBe(1)
  await expect(scope).toBeDisabled()
  await expect(key).toBeDisabled()
  finishSave()
  expect(saves[0]).toEqual({ GIGACHAT_API_KEY: "isolated-test-auth-key", GIGACHAT_SCOPE: "GIGACHAT_API_B2B" })
  await expect(key).toHaveValue("")
  await expect(scope).toBeEnabled()
  await expect(scope).toContainText("GIGACHAT_API_B2B")
})
