import type { BrowserContext } from "@playwright/test"
import { expect, test } from "@playwright/test"

// Every API response is local; unknown endpoints and mutations fail closed.
async function fixture(context: BrowserContext) {
  const overrides: Record<string, unknown> = {}
  const failures = new Set<string>()
  const unexpected: string[] = []
  const fixtures: Record<string, unknown> = {
    "/api/v1/auth/me": { id: "admin", username: "e2e-admin", role: "superadmin", is_active: true },
    "/api/v1/university": { profile: "custom", short_name: "Тестовый вуз", assistant_name: "Помощник" },
    "/api/v1/rag/docs": { documents: [] },
    "/api/v1/rag/docs/empty/content": { id: "empty", content: "" },
    "/api/v1/rag/docs/empty/diagnostics": { id: "empty", postgres_status: "indexed", lightrag_status: "processed", chunks_count: 0 },
    "/api/v1/faq": { items: [], total: 0 },
    "/api/v1/abbrev": { items: [], total: 0 },
    "/api/v1/faculties": [],
    "/api/v1/messages": [],
    "/api/v1/logs/session/local-session": { logs: [] },
    "/api/v1/feedback": { reports: [], total: 0 },
    "/api/v1/topics/": { topics: [] },
    "/api/v1/auth/admins": [],
    "/api/v1/settings/instance": { revision: 1, encryption_ready: true, settings: [] },
    "/api/v1/settings/crag": { enabled: true, relevance_threshold: 0.5, min_chunks: 2, allow_refine: true, use_faculty_table: true, max_graded_chunks: 12 },
    "/api/v1/settings/faq": { similarity_threshold: 0.95 },
    "/api/v1/settings/rate-limit": { system_requests_per_day: 10000, user_requests_per_day: 100 },
    "/api/v1/evals/status": { is_running: false, last_result: null },
    "/api/v1/system-logs/files": [],
    "/api/v1/system-logs/": [],
    "/api/v1/logs/request-stats": { buckets: [] },
    "/api/v1/logs/token-stats": { buckets: [] },
    "/api/v1/users/count-stats": {},
    "/api/v1/logs/popular": { questions: [] },
    "/api/v1/stats/topics": [],
  }
  await context.addCookies([{ name: "abitur-token", value: "e2e-session", domain: "127.0.0.1", path: "/" }])
  await context.addInitScript(() => localStorage.setItem("nuxt-color-mode", "light"))
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
    if (failures.has(url.pathname)) {
      return route.fulfill({ status: 503, headers, json: { detail: "Local fixture unavailable" } })
    }
    if (route.request().method() === "GET" && Object.hasOwn(fixtures, url.pathname)) {
      return route.fulfill({ headers, json: overrides[url.pathname] ?? fixtures[url.pathname] })
    }
    if (url.pathname === "/api/v1/rag/debug/query" && route.request().method() === "POST") {
      return route.fulfill({ headers, json: { answer: "Локальный ответ", settings: { mode: "hybrid" }, chunks: [], entities: [], relations: [], sources: [] } })
    }
    unexpected.push(`${route.request().method()} ${url.pathname}`)
    return route.fulfill({ status: 501, headers, json: { detail: "Unknown local fixture" } })
  })
  return { overrides, failures, unexpected }
}

const routes = [
  ["materials", "/", "Материалов пока нет"],
  ["faq", "/faq", "Вопросов пока нет"],
  ["abbrev", "/abbrev", "Аббревиатур пока нет"],
  ["faculties", "/faculties", "Факультетов пока нет"],
  ["messages", "/messages", "Сообщений пока нет"],
  ["feedback", "/feedback", "Обращений пока нет"],
  ["topics", "/settings?section=topics", "Тем пока нет"],
  ["team", "/settings?section=team", "Участников пока нет"],
  ["connections", "/settings?section=connections", "Настроек пока нет"],
  ["logs", "/system-logs", "Файлов логов пока нет"],
  ["evaluation", "/testing", "Результатов оценки пока нет"],
  ["stats", "/stats", "Нет данных по вопросам"],
  ["document", "/rag/document/empty", "Содержимого пока нет"],
] as const

for (const width of [1399, 1049, 390]) {
  test(`empty admin routes remain usable at ${width}px`, async ({ page, context }, testInfo) => {
    const local = await fixture(context)
    const errors: string[] = []
    page.on("pageerror", error => errors.push(error.message))
    await page.setViewportSize({ width, height: width === 390 ? 844 : 900 })
    for (const [name, url, title] of routes) {
      await page.goto(url)
      await expect(page.getByText(title, { exact: true })).toBeVisible()
      await expect(page.locator(".admin-empty[data-state=\"error\"]:visible")).toHaveCount(0)
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width)
      await page.screenshot({ path: testInfo.outputPath(`${name}-${width}.png`), fullPage: true })
    }
    expect(errors).toEqual([])
    expect(local.unexpected).toEqual([])
  })
}

for (const [url, endpoint, title] of [
  ["/faq", "/api/v1/faq", "Вопросов пока нет"],
  ["/abbrev", "/api/v1/abbrev", "Аббревиатур пока нет"],
  ["/faculties", "/api/v1/faculties", "Факультетов пока нет"],
  ["/messages", "/api/v1/messages", "Сообщений пока нет"],
  ["/feedback", "/api/v1/feedback", "Обращений пока нет"],
  ["/system-logs", "/api/v1/system-logs/files", "Файлов логов пока нет"],
  ["/settings?section=topics", "/api/v1/topics/", "Тем пока нет"],
  ["/settings?section=team", "/api/v1/auth/admins", "Участников пока нет"],
] as const) {
  test(`${url} API failure is recoverable and never shown as empty`, async ({ page, context }, testInfo) => {
    const local = await fixture(context)
    local.failures.add(endpoint)
    await page.goto(url)
    const error = page.locator(".admin-empty[data-state=\"error\"]:visible")
    await expect(error).toBeVisible()
    await expect(page.getByText(title, { exact: true })).toHaveCount(0)
    await page.screenshot({ path: testInfo.outputPath("error.png"), fullPage: true })
    local.failures.delete(endpoint)
    await error.getByRole("button", { name: "Повторить", exact: true }).click()
    await expect(page.getByText(title, { exact: true })).toBeVisible()
    expect(local.unexpected).toEqual([])
  })
}

for (const [url, endpoint, item] of [
  ["/faq", "/api/v1/faq", { id: "q1", question: "Правила приёма", answer: "Локальный ответ" }],
  ["/abbrev", "/api/v1/abbrev", { id: "a1", short: "НГУ", full: "Новосибирский университет" }],
] as const) {
  test(`${url} no results resets to the loaded collection`, async ({ page, context }, testInfo) => {
    const local = await fixture(context)
    local.overrides[endpoint] = { items: [item], total: 1 }
    await page.goto(url)
    await page.getByRole("textbox", { name: "Поиск по справочнику" }).fill("несуществующее")
    await expect(page.getByText("Ничего не найдено", { exact: true })).toBeVisible()
    await page.screenshot({ path: testInfo.outputPath("no-results.png"), fullPage: true })
    await page.getByRole("button", { name: "Сбросить поиск" }).click()
    await expect(page.locator(".admin-empty")).toHaveCount(0)
    expect(local.unexpected).toEqual([])
  })
}

const message = { id: 1, user_id: 42, user_text: "Правила приёма", bot_response: "Ответ", session_id: "local-session", created_at: "2026-10-01T10:00:00Z", messenger: "tg" }

test("message filtering resets and empty session logs stay inside the detail panel", async ({ page, context }, testInfo) => {
  const local = await fixture(context)
  local.overrides["/api/v1/messages"] = [message]
  await page.goto("/messages")
  await page.getByRole("textbox", { name: "Поиск сообщений" }).fill("несуществующее")
  await expect(page.getByText("Ничего не найдено", { exact: true })).toBeVisible()
  await page.getByRole("button", { name: "Сбросить фильтры" }).click()
  await expect(page.getByText("Правила приёма", { exact: true })).toBeVisible()
  await page.getByRole("button", { name: "Логи", exact: true }).click()
  await expect(page.getByRole("dialog").getByText("Логов сессии пока нет")).toBeVisible()
  await page.screenshot({ path: testInfo.outputPath("session-logs.png"), fullPage: true })
  expect(local.unexpected).toEqual([])
})

test("feedback applied filters reset without losing the filter controls", async ({ page, context }, testInfo) => {
  const local = await fixture(context)
  await page.goto("/feedback")
  await page.getByPlaceholder("Введите идентификатор сессии").fill("missing")
  await page.getByRole("button", { name: "Применить", exact: true }).click()
  await expect(page.getByText("Ничего не найдено", { exact: true })).toBeVisible()
  await page.screenshot({ path: testInfo.outputPath("feedback-filtered.png"), fullPage: true })
  await page.getByRole("button", { name: "Сбросить фильтры" }).click()
  await expect(page.getByText("Обращений пока нет", { exact: true })).toBeVisible()
  await expect(page.getByPlaceholder("Введите идентификатор сессии")).toHaveValue("")
  expect(local.unexpected).toEqual([])
})

test("nested collections, empty log file, evaluation summary and inspector results", async ({ page, context }, testInfo) => {
  const local = await fixture(context)
  local.overrides["/api/v1/faculties"] = [{ id: "f1", name: "Тестовый факультет", is_active: true, programs: [], aliases: [] }]
  local.overrides["/api/v1/system-logs/files"] = ["empty.log"]
  local.overrides["/api/v1/evals/status"] = { is_running: false, last_result: { total: 4, passed_perfectly: 3, pass_rate: 0.75 } }
  local.overrides["/api/v1/topics/"] = { topics: [{ id: 1, label: "Архивная тема", is_active: false }] }
  for (const [url, title, name] of [
    ["/faculties", "Направлений пока нет", "programs"],
    ["/system-logs", "Файл пуст", "empty-file"],
    ["/testing", "Подробных результатов нет", "evaluation-summary"],
    ["/settings?section=topics", "Активных тем пока нет", "inactive-topics"],
  ]) {
    await page.goto(url!)
    await expect(page.getByText(title!, { exact: true })).toBeVisible()
    await page.screenshot({ path: testInfo.outputPath(`${name}.png`), fullPage: true })
  }
  await page.goto("/rag/inspector")
  await expect(page.locator(".admin-empty")).toHaveCount(0)
  await page.getByRole("textbox", { name: "Вопрос", exact: true }).fill("Локальный вопрос")
  await page.getByRole("button", { name: "Выполнить", exact: true }).click()
  for (const title of ["Чанки не найдены", "Сущности не найдены", "Связи не найдены", "Источники не найдены"]) {
    await expect(page.getByText(title, { exact: true })).toBeVisible()
  }
  await page.screenshot({ path: testInfo.outputPath("inspector-results.png"), fullPage: true })
  expect(local.unexpected).toEqual([])
})

for (const width of [1399, 1049, 390]) {
  test(`refresh loading never flashes empty at ${width}px`, async ({ page, context }, testInfo) => {
    await fixture(context)
    await page.setViewportSize({ width, height: width === 390 ? 844 : 900 })
    await page.goto("/faq")
    await expect(page.getByText("Вопросов пока нет", { exact: true })).toBeVisible()
    let release = () => {}
    const pending = new Promise<void>((resolve) => {
      release = resolve
    })
    await page.route("**/api/v1/faq", async (route) => {
      await pending
      await route.fulfill({ headers: { "Access-Control-Allow-Origin": "*" }, json: { items: [], total: 0 } })
    })
    await page.getByRole("button", { name: "Обновить", exact: true }).click()
    await expect(page.getByText("Загрузка справочника…", { exact: true })).toBeVisible()
    await expect(page.getByText("Вопросов пока нет", { exact: true })).toHaveCount(0)
    await page.screenshot({ path: testInfo.outputPath(`loading-${width}.png`), fullPage: true })
    release()
    await expect(page.getByText("Вопросов пока нет", { exact: true })).toBeVisible()
  })
}

test("zero users is a measured value, while failed statistics stay errors", async ({ page, context }) => {
  const local = await fixture(context)
  local.overrides["/api/v1/users/count-stats"] = { day: 0 }
  local.failures.add("/api/v1/logs/request-stats")
  await page.goto("/stats")
  await expect(page.getByText("Количество новых пользователей", { exact: true })).toBeVisible()
  await expect(page.locator(".admin-detail").getByText("0", { exact: true })).toBeVisible()
  await expect(page.locator(".admin-empty[data-state=\"error\"]")).toHaveCount(1)
  expect(local.unexpected).toEqual([])
})

for (const width of [1399, 1049, 390]) {
  test(`search and error recovery at ${width}px`, async ({ page, context }, testInfo) => {
    const local = await fixture(context)
    await page.setViewportSize({ width, height: width === 390 ? 844 : 900 })
    local.overrides["/api/v1/faq"] = { items: [{ id: "q1", question: "Правила приёма", answer: "Ответ" }], total: 1 }
    await page.goto("/faq")
    await page.getByRole("textbox", { name: "Поиск по справочнику" }).fill("несуществующее")
    await expect(page.getByText("Ничего не найдено", { exact: true })).toBeVisible()
    await page.screenshot({ path: testInfo.outputPath(`search-${width}.png`), fullPage: true })
    local.failures.add("/api/v1/faq")
    await page.getByRole("button", { name: "Обновить", exact: true }).click()
    await expect(page.locator(".admin-empty[data-state=\"error\"]")).toBeVisible()
    await expect(page.getByText("Ничего не найдено", { exact: true })).toHaveCount(0)
    await page.screenshot({ path: testInfo.outputPath(`error-${width}.png`), fullPage: true })
    local.failures.clear()
    await page.getByRole("button", { name: "Повторить", exact: true }).click()
    await expect(page.getByText("Ничего не найдено", { exact: true })).toBeVisible()
    await page.getByRole("button", { name: "Сбросить поиск" }).click()
    await expect(page.getByText("Правила приёма", { exact: true })).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width)
    expect(local.unexpected).toEqual([])
  })
}

test("neutral empty states follow the existing dark theme", async ({ page, context }, testInfo) => {
  await fixture(context)
  await page.setViewportSize({ width: 1049, height: 900 })
  await page.goto("/faq")
  await expect(page.getByText("Вопросов пока нет", { exact: true })).toBeVisible()
  await page.getByRole("button", { name: "Переключиться на тёмный режим" }).click()
  await expect(page.locator("html")).toHaveClass(/dark/)
  await page.screenshot({ path: testInfo.outputPath("empty-dark-1049.png"), fullPage: true })
})
