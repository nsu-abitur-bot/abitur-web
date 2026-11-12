import type { BrowserContext } from "@playwright/test"
import { expect, test } from "@playwright/test"

interface ModelJob {
  id: string
  status: "running" | "completed" | "failed"
  progress: { completed_vectors: number }
  error: string | null
}

async function models(context: BrowserContext) {
  const row = (key: string, value: string | null, choices: string[] = []) => ({
    key,
    value,
    choices,
    label: key.endsWith("API_KEY") ? (key.startsWith("GIGACHAT") ? "Ключ авторизации" : "API-ключ") : key,
    group:
      key.startsWith("TEXT_") || key.startsWith("EMBEDDING_")
        ? "Модели"
        : key.startsWith("DEEPSEEK_")
          ? "DeepSeek"
          : key.startsWith("GIGACHAT_")
            ? "GigaChat"
            : "Gemini",
    kind: "text",
    secret: key.endsWith("API_KEY"),
    configured: Boolean(value) || key.endsWith("API_KEY"),
  })
  const settings = [
    row("TEXT_PROVIDER", "gemini"),
    row("TEXT_MODEL", ""),
    row("EMBEDDING_PROVIDER", "gemini"),
    row("EMBEDDING_MODEL", ""),
    row("DEEPSEEK_API_KEY", null),
    row("DEEPSEEK_MODEL", "deepseek-flash"),
    row("GEMINI_API_KEY", null),
    row("GEMINI_EMBEDDING_MODEL", "old-embedding"),
    row("GIGACHAT_API_KEY", null),
    row("GIGACHAT_EMBEDDING_MODEL", "EmbeddingsGigaR"),
    row("DOCUMENT_RECOGNITION_ENABLED", "false"),
    row("PDF_PARSER_PROVIDER", "openai", ["openai", "gemini"]),
  ]
  settings.push({ ...row("BOT_TOKEN", null), group: "Telegram", secret: true })
  let revision = 1
  let version = 1
  let conflictNext = false
  let checkHold: Promise<void> | null = null
  let releaseCheck = () => {}
  let checks = 0
  let job: ModelJob | null = null
  let assignments = {
    TEXT_PROVIDER: "deepseek",
    TEXT_MODEL: "deepseek-flash",
    EMBEDDING_PROVIDER: "gemini",
    EMBEDDING_MODEL: "old-embedding",
  }
  const saves: {
    revision: number
    changes: Record<string, string>
    confirm_reindex: boolean
  }[] = []
  const actions: string[] = []
  await context.route("**/api/v1/settings/instance**", async (route) => {
    const headers = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "*",
      "Access-Control-Allow-Methods": "*",
    }
    if (route.request().method() === "OPTIONS") {
      return route.fulfill({ status: 204, headers })
    }
    const path = new URL(route.request().url()).pathname
    if (path.endsWith("/check")) {
      checks++
      if (checkHold) {
        await checkHold
      }
      return route.fulfill({
        headers,
        json: { message: "Подключение проверено" },
      })
    }
    if (
      path === "/api/v1/settings/instance"
      && route.request().method() === "PUT"
    ) {
      revision++
    }
    const snapshot = { revision, encryption_ready: true, settings }
    if (path === "/api/v1/settings/instance") {
      return route.fulfill({ headers, json: snapshot })
    }
    if (path.includes("/job/")) {
      actions.push(path.split("/").at(-1)!)
      job = {
        id: "job-46",
        status: "running",
        progress: { completed_vectors: 3 },
        error: null,
      }
      return route.fulfill({ headers, json: job })
    }
    if (route.request().method() === "POST") {
      saves.push(route.request().postDataJSON())
      if (conflictNext) {
        conflictNext = false
        revision++
        return route.fulfill({
          status: 409,
          headers,
          json: { detail: "Настройки изменились" },
        })
      }
      job = {
        id: "job-46",
        status: "running",
        progress: { completed_vectors: 3 },
        error: null,
      }
      return route.fulfill({ headers, json: { job } })
    }
    return route.fulfill({
      headers,
      json: {
        snapshot,
        revision,
        version,
        assignments,
        legacy:
          version === 1
            ? [
                { label: "FAQ", provider: "gemini", model: "old-embedding" },
                {
                  label: "База знаний",
                  provider: "gigachat",
                  model: "EmbeddingsGigaR",
                },
              ]
            : [],
        job,
      },
    })
  })
  await context.addCookies([
    {
      name: "abitur-token",
      value: "e2e-local-admin-token",
      domain: "127.0.0.1",
      path: "/",
    },
  ])
  return {
    saves,
    actions,
    get checks() {
      return checks
    },
    holdCheck() {
      checkHold = new Promise<void>((resolve) => {
        releaseCheck = resolve
      })
    },
    releaseCheck() {
      releaseCheck()
    },
    conflict() {
      conflictNext = true
    },
    finish() {
      revision++
      version = 2
      assignments = {
        ...assignments,
        EMBEDDING_PROVIDER: "gigachat",
        EMBEDDING_MODEL: "EmbeddingsGigaR",
      }
      job = {
        id: "job-46",
        status: "completed",
        progress: { completed_vectors: 6 },
        error: null,
      }
    },
    fail() {
      job = {
        id: "job-46",
        status: "failed",
        progress: { completed_vectors: 3 },
        error: "Старый индекс сохранён",
      }
    },
  }
}

test("two model assignments, shared credentials and explicit migration consent", async ({
  page,
  context,
}) => {
  const api = await models(context)
  await page.goto("/settings?section=connections")
  await expect(
    page.getByRole("heading", { name: "Текстовая модель", exact: true }),
  ).toBeVisible()
  await expect(
    page.getByRole("combobox", { name: "Провайдер текста", exact: true }),
  ).toContainText("DeepSeek")
  await page
    .getByRole("combobox", { name: "Провайдер эмбеддингов", exact: true })
    .click()
  await page.getByRole("option", { name: "GigaChat", exact: true }).click()
  await expect(page.locator("#instance-GEMINI_API_KEY")).toHaveCount(0)
  await expect(page.locator("#instance-GIGACHAT_API_KEY")).toHaveAttribute(
    "type",
    "password",
  )
  const screenshot = await page.screenshot({ path: test.info().outputPath("models.png"), fullPage: true })
  await test.info().attach("Два назначения моделей", { body: screenshot, contentType: "image/png" })
  await page
    .getByRole("button", { name: "Применить общие модели", exact: true })
    .click()
  await expect(
    page.getByRole("dialog", { name: "Пересчитать эмбеддинги?" }),
  ).toBeVisible()
  expect(api.saves).toHaveLength(0)
  await page
    .getByRole("button", { name: "Сохранить и пересчитать", exact: true })
    .click()
  await expect.poll(() => api.saves.length).toBe(1)
  expect(api.saves[0]).toMatchObject({
    revision: 1,
    confirm_reindex: true,
    changes: {
      EMBEDDING_PROVIDER: "gigachat",
      EMBEDDING_MODEL: "EmbeddingsGigaR",
      TEXT_PROVIDER: "deepseek",
    },
  })
  expect(api.saves[0]?.changes).not.toHaveProperty("GEMINI_API_KEY")
  await expect(
    page.getByRole("heading", { name: "Пересчёт эмбеддингов", exact: true }),
  ).toBeVisible()
  await expect(
    page.getByRole("combobox", { name: "Провайдер текста", exact: true }),
  ).toBeDisabled()
  api.finish()
  await expect(
    page.getByRole("heading", { name: "Новый индекс включён", exact: true }),
  ).toBeVisible({ timeout: 8000 })
  await expect(
    page.getByRole("combobox", { name: "Провайдер текста", exact: true }),
  ).toBeEnabled()
})

test("failed migration retains the active configuration and offers durable retry", async ({
  page,
  context,
}) => {
  const api = await models(context)
  await page.goto("/settings?section=connections")
  await page
    .getByRole("button", { name: "Применить общие модели", exact: true })
    .click()
  await page
    .getByRole("button", { name: "Сохранить и пересчитать", exact: true })
    .click()
  await expect.poll(() => api.saves.length).toBe(1)
  api.fail()
  await expect(
    page.getByRole("heading", { name: "Пересчёт не завершён", exact: true }),
  ).toBeVisible({ timeout: 8000 })
  await expect(
    page.getByText("Старый индекс сохранён", { exact: true }),
  ).toBeVisible()
  await page
    .getByRole("button", { name: "Продолжить пересчёт", exact: true })
    .click()
  await expect.poll(() => api.actions).toEqual(["retry"])
  await expect(
    page.getByRole("heading", { name: "Пересчёт эмбеддингов", exact: true }),
  ).toBeVisible()
})

test("revision conflict preserves a model draft and secret for explicit rebase", async ({
  page,
  context,
}) => {
  const api = await models(context)
  await page.goto("/settings?section=connections")
  const model = page.getByRole("textbox", {
    name: "Текстовая модель",
    exact: true,
  })
  const key = page.locator("#instance-DEEPSEEK_API_KEY")
  await model.fill("another-text-model")
  await key.fill("isolated-secret-replacement")
  api.conflict()
  await page
    .getByRole("button", { name: "Применить общие модели", exact: true })
    .click()
  await page
    .getByRole("button", { name: "Сохранить и пересчитать", exact: true })
    .click()
  await expect(
    page.getByText("Настройки изменились", { exact: true }),
  ).toBeVisible()
  await expect(model).toHaveValue("another-text-model")
  await expect(key).toHaveValue("isolated-secret-replacement")
  await page
    .getByRole("button", {
      name: "Загрузить версию и сверить черновик",
      exact: true,
    })
    .click()
  await expect(model).toHaveValue("another-text-model")
  await expect(key).toHaveValue("isolated-secret-replacement")
  expect(api.saves).toHaveLength(1)
})

test("saving another section during a model check preserves the model and secret draft", async ({
  page,
  context,
}) => {
  const api = await models(context)
  await page.goto("/settings?section=connections")
  const model = page.getByRole("textbox", {
    name: "Текстовая модель",
    exact: true,
  })
  await model.fill("pending-model")
  await page
    .locator("#instance-DEEPSEEK_API_KEY")
    .fill("pending-isolated-secret")
  api.holdCheck()
  await page
    .getByRole("button", { name: "Проверить текстовую модель", exact: true })
    .click()
  await expect.poll(() => api.checks).toBe(1)
  await page.getByRole("button", { name: "Боты", exact: true }).click()
  await page.locator("#instance-BOT_TOKEN").fill("replacement-bot-token")
  await page
    .getByRole("button", { name: "Сохранить изменения (1)", exact: true })
    .click()
  await page.getByRole("button", { name: "Модели", exact: true }).click()
  api.releaseCheck()
  await expect(model).toHaveValue("pending-model")
  await expect(page.locator("#instance-DEEPSEEK_API_KEY")).toHaveValue(
    "pending-isolated-secret",
  )
  await expect(
    page.getByRole("button", {
      name: "Загрузить версию и сверить черновик",
      exact: true,
    }),
  ).toBeVisible()
})
