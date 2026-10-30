import type { BrowserContext, Page } from "@playwright/test"
import { expect, test } from "@playwright/test"

const cookie = { name: "abitur-token", value: "e2e-session", domain: "127.0.0.1", path: "/" }

async function mockSettings(context: BrowserContext, role = "superadmin") {
  let revision = 1
  let conflict = false
  let expired = false
  const puts: { revision: number, changes: Record<string, string | null> }[] = []
  const settings = [
    { key: "OPENAI_API_KEY", label: "API-ключ", group: "OpenAI", choices: [], kind: "text", secret: true, configured: true, value: null },
    { key: "OPENAI_BASE_URL", label: "Адрес API", group: "OpenAI", choices: [], kind: "url", secret: false, configured: true, value: "https://original.invalid/v1" },
  ]
  await context.route("**/*", async (route) => {
    const url = new URL(route.request().url())
    if (url.hostname !== "127.0.0.1" || !["9464", "9465"].includes(url.port)) {
      return route.abort("blockedbyclient")
    }
    if (!url.pathname.startsWith("/api/v1/")) {
      return route.continue()
    }
    const headers = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "*", "Access-Control-Allow-Methods": "*" }
    if (route.request().method() === "OPTIONS") {
      return route.fulfill({ status: 204, headers })
    }
    const reply = (body: unknown, status = 200) => route.fulfill({ status, headers, json: body })
    if (url.pathname === "/api/v1/auth/me") {
      return reply({ id: 1, username: "e2e-admin", role, is_active: true })
    }
    if (url.pathname === "/api/v1/settings/instance") {
      if (route.request().method() === "PUT") {
        if (expired) {
          return reply({ detail: "Expired session" }, 401)
        }
        const payload = route.request().postDataJSON()
        puts.push(payload)
        if (conflict) {
          conflict = false
          revision = 2
          settings[1]!.value = "https://remote.invalid/v1"
          return reply({ detail: "Version conflict" }, 409)
        }
        revision++
        for (const [key, value] of Object.entries(payload.changes)) {
          const setting = settings.find(item => item.key === key)!
          if (setting.secret) {
            setting.configured = value !== null
          } else {
            setting.value = value as string
          }
        }
      }
      return reply({ revision, encryption_ready: true, settings })
    }
    const fixtures: Record<string, unknown> = {
      "/api/v1/settings/crag": { enabled: true, relevance_threshold: 0.5, min_chunks: 2, allow_refine: true, use_faculty_table: true, max_graded_chunks: 12 },
      "/api/v1/settings/faq": { similarity_threshold: 0.95 },
      "/api/v1/settings/rate-limit": { system_requests_per_day: 10000, user_requests_per_day: 100 },
      "/api/v1/topics/": { topics: [] },
      "/api/v1/logs/request-stats": { buckets: [{ period: "2026-10-30T09:00:00Z", count: 14 }] },
      "/api/v1/logs/token-stats": { total: 1000, buckets: [{ period: "2026-10-30T09:00:00Z", tokens: 1000 }] },
      "/api/v1/users/count-stats": { day: 5, week: 20, month: 100, year: 200, all_time: 300 },
      "/api/v1/logs/popular": { questions: [] },
      "/api/v1/stats/topics": [{ topic_id: 1, label: "Поступление", count: 8 }, { topic_id: 2, label: "Документы", count: 6 }],
      "/api/v1/feedback": { reports: [], total: 0 },
    }
    return Object.hasOwn(fixtures, url.pathname) ? reply(fixtures[url.pathname]) : route.continue()
  })
  await context.addCookies([cookie])
  return {
    puts,
    conflict: () => {
      conflict = true
    },
    expire: () => {
      expired = true
    },
  }
}

async function openDraft(page: Page) {
  await page.goto("/settings?section=connections")
  await page.locator("#instance-OPENAI_API_KEY").fill("local-secret-replacement")
}

test("dirty settings cancel preserves session and draft; confirmed logout survives reload", async ({ page, context }) => {
  await mockSettings(context)
  await openDraft(page)
  await page.getByRole("button", { name: "Выйти", exact: true }).click()
  const dialog = page.getByRole("dialog")
  await expect(dialog.getByText("Есть несохранённые изменения")).toBeVisible()
  await dialog.getByRole("button", { name: "Продолжить редактирование" }).click()
  await expect(page).toHaveURL(/\/settings\?section=connections$/)
  await expect(page.locator("#instance-OPENAI_API_KEY")).toHaveValue("local-secret-replacement")
  expect((await context.cookies()).find(item => item.name === cookie.name)?.value).toBe(cookie.value)
  await page.getByRole("button", { name: "Выйти", exact: true }).click()
  await dialog.getByRole("button", { name: "Уйти без сохранения" }).click()
  await expect(page).toHaveURL(/\/login$/)
  await expect.poll(async () => (await context.cookies()).some(item => item.name === cookie.name)).toBe(false)
  await page.reload()
  await page.goto("/settings")
  await expect(page).toHaveURL(/\/login$/)
})

test("401 while saving a dirty page reaches login without a leave prompt", async ({ page, context }) => {
  const fixture = await mockSettings(context)
  await openDraft(page)
  fixture.expire()
  await page.getByRole("button", { name: /Сохранить изменения/ }).click()
  await expect(page).toHaveURL(/\/login$/)
  await expect(page.getByRole("dialog")).toHaveCount(0)
  await expect.poll(async () => (await context.cookies()).some(item => item.name === cookie.name)).toBe(false)
  await page.goto("/register")
  await expect(page).toHaveURL(/\/register$/)
  await page.goto("/login")
  await expect(page).toHaveURL(/\/login$/)
})

test("409 keeps the secret draft, rebases untouched fields, and clears secrets only explicitly", async ({ page, context }) => {
  const fixture = await mockSettings(context)
  await openDraft(page)
  fixture.conflict()
  await page.getByRole("button", { name: /Сохранить изменения/ }).click()
  await expect(page.getByText(/Черновик сохранён/)).toBeVisible()
  await expect(page.locator("#instance-OPENAI_API_KEY")).toHaveValue("local-secret-replacement")
  await page.getByRole("button", { name: /Загрузить версию и сверить/ }).click()
  await expect(page.locator("#instance-OPENAI_BASE_URL")).toHaveValue("https://remote.invalid/v1")
  await expect(page.locator("#instance-OPENAI_API_KEY")).toHaveValue("local-secret-replacement")
  await page.getByRole("button", { name: /Сохранить изменения/ }).click()
  await expect(page.getByText("Настройки сохранены.", { exact: true })).toBeVisible()
  expect(fixture.puts[1]).toEqual({ revision: 2, changes: { OPENAI_API_KEY: "local-secret-replacement" } })
  await expect(page.locator("#instance-OPENAI_API_KEY")).toHaveValue("")
  await page.getByRole("button", { name: "Удалить ключ", exact: true }).click()
  await page.getByRole("button", { name: /Сохранить изменения/ }).click()
  await expect(page.getByText("Секрет не задан.", { exact: true })).toBeVisible()
  expect(fixture.puts[2]?.changes).toEqual({ OPENAI_API_KEY: null })
})

test("viewer home redirects to feedback and cannot open privileged settings", async ({ page, context }) => {
  await mockSettings(context, "viewer")
  await page.goto("/")
  await expect(page).toHaveURL(/\/feedback$/)
  await expect(page.getByRole("heading", { name: "Обратная связь", exact: true })).toBeVisible()
  await expect(page.locator("#admin-navigation").getByRole("link", { name: "Подключения", exact: true })).toHaveCount(0)
  await page.goto("/settings?section=connections")
  await expect(page.getByRole("heading", { name: "Недостаточно прав для этого раздела", exact: true })).toBeVisible()
  await expect(page.locator("#instance-OPENAI_API_KEY")).toHaveCount(0)
})

test("admin can edit rules but cannot open superadmin team settings", async ({ page, context }) => {
  await mockSettings(context, "admin")
  await page.goto("/settings?section=rules")
  await expect(page.getByRole("heading", { name: "Правила и лимиты", exact: true })).toBeVisible()
  await expect(page.locator("#instance-OPENAI_API_KEY")).toHaveCount(0)
  await expect(page.locator("nav[aria-label='Разделы настроек']").getByRole("button", { name: "Команда", exact: true })).toHaveCount(0)
  await page.goto("/settings?section=team")
  await expect(page.getByRole("heading", { name: "Недостаточно прав для этого раздела", exact: true })).toBeVisible()
})

test("charts read semantic colors without pinning the global theme", async ({ page, context }, testInfo) => {
  await mockSettings(context)
  await page.setViewportSize({ width: 1049, height: 881 })
  await context.addInitScript(() => localStorage.setItem("nuxt-color-mode", "light"))
  await page.goto("/stats")
  await expect(page.locator("canvas")).toHaveCount(3)
  // A legend alone must not count as a rendered data chart.
  const dataPixels = () => page.locator("canvas").nth(2).evaluate((canvas: HTMLCanvasElement) => {
    const pixels = canvas.getContext("2d")!.getImageData(0, 0, canvas.width, canvas.height).data
    let purple = 0
    for (let index = 0; index < pixels.length; index += 4) {
      if (pixels[index]! < 120 && pixels[index + 1]! < 120 && pixels[index + 2]! > 130 && pixels[index + 3]! > 200) {
        purple++
      }
    }
    return purple
  })
  await expect.poll(dataPixels).toBeGreaterThan(1000)
  await page.screenshot({ path: testInfo.outputPath("stats-light.png"), fullPage: true })
  const ruleColor = () => page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--admin-rule").trim())
  await expect.poll(ruleColor).toBe("#e2e5ec")
  await page.getByRole("button", { name: "Переключиться на тёмный режим" }).click()
  await expect.poll(ruleColor).toBe("#343a49")
  await expect.poll(dataPixels).toBeGreaterThan(1000)
  expect(await page.evaluate(() => document.documentElement.style.getPropertyValue("--admin-rule"))).toBe("")
  await page.getByRole("button", { name: "Переключиться на светлый режим" }).click()
  await expect.poll(ruleColor).toBe("#e2e5ec")
})
