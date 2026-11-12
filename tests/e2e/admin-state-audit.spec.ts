import { readdir } from "node:fs/promises"

import { expect, test } from "@playwright/test"

import { emptyFixture } from "./fixtures/empty-states"

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "*", "Access-Control-Allow-Methods": "*" }

// Keep the audit exhaustive when a route is added, including routes outside the admin shell.
const routeFiles = ["abbrev.vue", "admission-scores.vue", "faculties.vue", "faq.vue", "feedback.vue", "gaps.vue", "index.vue", "login.vue", "messages.vue", "rag/document/[id].vue", "rag/inspector.vue", "rag/proposals.vue", "rating.vue", "register.vue", "settings.vue", "stats.vue", "system-logs.vue", "testing.vue"]

test("state audit includes every route file", async () => {
  expect((await readdir("app/pages", { recursive: true })).filter(file => file.endsWith(".vue")).sort()).toEqual(routeFiles)
})

const collections = [
  { name: "materials", url: "/", endpoints: ["/api/v1/rag/docs"], empty: "Материалов пока нет" },
  { name: "faculties", url: "/faculties", endpoints: ["/api/v1/faculties"], empty: "Факультетов пока нет" },
  { name: "faq", url: "/faq", endpoints: ["/api/v1/faq"], empty: "Вопросов пока нет" },
  { name: "abbrev", url: "/abbrev", endpoints: ["/api/v1/abbrev"], empty: "Аббревиатур пока нет" },
  { name: "messages", url: "/messages", endpoints: ["/api/v1/messages/page"], empty: "Сообщений пока нет" },
  { name: "feedback", url: "/feedback", endpoints: ["/api/v1/feedback"], empty: "Обращений пока нет" },
  { name: "scores", url: "/admission-scores", endpoints: ["/api/v1/faculties", "/api/v1/admission-scores"], empty: "Баллы пока не добавлены." },
  { name: "document", url: "/rag/document/empty", endpoints: ["/api/v1/rag/docs/empty/content"], empty: "Содержимого пока нет" },
  { name: "logs", url: "/system-logs", endpoints: ["/api/v1/system-logs/files"], empty: "Файлов логов пока нет" },
  { name: "topics", url: "/settings?section=topics", endpoints: ["/api/v1/topics/"], empty: "Тем пока нет" },
  { name: "team", url: "/settings?section=team", endpoints: ["/api/v1/auth/admins"], empty: "Участников пока нет" },
  { name: "connections", url: "/settings?section=connections", endpoints: ["/api/v1/settings/instance"], empty: "Настроек пока нет" },
  { name: "rules", url: "/settings?section=rules", endpoints: ["/api/v1/settings/rate-limit", "/api/v1/settings/crag", "/api/v1/settings/faq"], empty: null },
  { name: "stats", url: "/stats", endpoints: ["/api/v1/logs/request-stats", "/api/v1/logs/token-stats", "/api/v1/stats/topics", "/api/v1/users/count-stats", "/api/v1/logs/popular"], empty: "Нет данных по вопросам" },
  { name: "evaluation", url: "/testing", endpoints: ["/api/v1/evals/status"], empty: "Результатов оценки пока нет" },
  { name: "gaps", url: "/gaps", endpoints: ["/api/v1/reports/gaps"], empty: null },
]

for (const width of [1399, 390]) {
  for (const theme of ["light", "dark"]) {
    test(`all admin state surfaces ${width}px ${theme}`, async ({ page, context }, testInfo) => {
      test.setTimeout(90_000)
      const local = await emptyFixture(context, theme)
      await page.setViewportSize({ width, height: 900 })
      for (const surface of collections) {
        let release = () => {}
        const pending = new Promise<void>((resolve) => {
          release = resolve
        })
        local.requested.clear()
        for (const endpoint of surface.endpoints) {
          local.holds.set(endpoint, pending)
          local.failures.add(endpoint)
        }
        await page.goto(surface.url)
        for (const endpoint of surface.name === "scores" ? surface.endpoints.slice(0, 1) : surface.endpoints) {
          await expect.poll(() => local.requested.has(endpoint)).toBe(true)
        }
        // Async setup may suspend the page; neither a suspended page nor a loading
        // component may claim that an unanswered request returned an empty database.
        await expect(page.locator(".admin-empty[data-state=\"empty\"]:visible")).toHaveCount(0)
        await page.screenshot({ path: testInfo.outputPath(`${surface.name}-loading.png`), fullPage: true })
        release()
        for (const endpoint of surface.endpoints) {
          local.holds.delete(endpoint)
        }
        const failure = surface.name === "evaluation" ? page.getByRole("alert").filter({ hasText: "Не удалось получить статус" }) : page.locator(".admin-empty[data-state=\"error\"]:visible")
        await expect(failure).toHaveCount(surface.name === "evaluation" ? 1 : surface.endpoints.length)
        await expect(failure.first()).toBeVisible()
        await expect(page.locator(".admin-empty[data-state=\"empty\"]:visible")).toHaveCount(0)
        await page.screenshot({ path: testInfo.outputPath(`${surface.name}-error.png`), fullPage: true })
        for (const endpoint of surface.endpoints) {
          local.failures.delete(endpoint)
        }
        const retry = page.locator(".admin-empty[data-state=error]:visible").getByRole("button", { name: /Повторить|Загрузить настройки/ }).first()
        if (await retry.count()) {
          let finishRetry = () => {}
          const retryPending = new Promise<void>((resolve) => {
            finishRetry = resolve
          })
          for (const endpoint of surface.endpoints) {
            local.holds.set(endpoint, retryPending)
          }
          await retry.click()
          await expect(page.locator(".admin-empty[data-state=loading]:visible").first()).toBeVisible()
          await page.screenshot({ path: testInfo.outputPath(`${surface.name}-retry-loading.png`), fullPage: true })
          finishRetry()
          local.holds.clear()
        }
        await page.reload()
        if (surface.empty) {
          await expect(page.getByText(surface.empty, { exact: true })).toBeVisible()
        } else {
          await expect(page.getByRole("button", { name: "Сохранить порог FAQ" })).toBeVisible()
        }
        await expect(page.locator(".admin-empty[data-state=\"error\"]:visible")).toHaveCount(0)
        await expect(page.locator("html")).toHaveClass(new RegExp(theme))
        for (const empty of await page.locator(".admin-empty:visible").all()) {
          await expect(empty.locator(".admin-empty-icon")).toBeVisible()
          expect(await empty.evaluate(el => getComputedStyle(el).minHeight)).toBe("208px")
          expect(await empty.evaluate(el => getComputedStyle(el).padding)).toBe("32px 16px")
        }
        expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width)
        await page.screenshot({ path: testInfo.outputPath(`${surface.name}-settled.png`), fullPage: true })
      }
      expect(local.unexpected).toEqual([])
    })

    test(`conditional connections and nested lists ${width}px ${theme}`, async ({ page, context }, testInfo) => {
      const local = await emptyFixture(context, theme)
      await page.setViewportSize({ width, height: 900 })
      local.overrides["/api/v1/settings/instance"] = { revision: 1, encryption_ready: true, settings: [{ key: "OPENAI_API_KEY", label: "API-ключ", group: "OpenAI", choices: [], kind: "text", secret: true, configured: false, value: null }] }
      await page.goto("/settings?section=connections")
      for (const section of ["Оформление", "Боты", "Дополнительно"]) {
        await page.getByRole("button", { name: section, exact: true }).click()
        await expect(page.getByText("Настроек в этом разделе пока нет", { exact: true })).toBeVisible()
        await page.screenshot({ path: testInfo.outputPath(`connections-${section}.png`), fullPage: true })
      }
      await page.getByRole("button", { name: "Модели", exact: true }).click()
      await expect(page.getByText("Настроек в этом разделе пока нет")).toHaveCount(0)
      local.overrides["/api/v1/faculties"] = [{ id: "f1", name: "Тестовый факультет", is_active: true, programs: [], aliases: [] }]
      await page.goto("/faculties")
      await expect(page.getByText("Направлений пока нет", { exact: true })).toBeVisible()
      await page.screenshot({ path: testInfo.outputPath("programs-empty.png"), fullPage: true })
      local.overrides["/api/v1/topics/"] = { topics: [{ id: 1, label: "Архивная тема", is_active: false }] }
      await page.goto("/settings?section=topics")
      await expect(page.getByText("Активных тем пока нет", { exact: true })).toBeVisible()
      await page.screenshot({ path: testInfo.outputPath("topics-inactive.png"), fullPage: true })
      local.overrides["/api/v1/evals/status"] = { is_running: false, last_result: { total: 4, passed_perfectly: 3, pass_rate: 0.75 } }
      await page.goto("/testing")
      await expect(page.getByText("Подробных результатов нет", { exact: true })).toBeVisible()
      await page.screenshot({ path: testInfo.outputPath("evaluation-summary.png"), fullPage: true })
      expect(local.unexpected).toEqual([])
    })
  }
}

for (const width of [1399, 390]) {
  for (const theme of ["light", "dark"]) {
    test(`filters inspector and list dialogs ${width}px ${theme}`, async ({ page, context }, testInfo) => {
      test.setTimeout(90_000)
      const local = await emptyFixture(context, theme)
      await page.setViewportSize({ width, height: 900 })
      const shot = async (name: string) => {
        expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width)
        await page.screenshot({ path: testInfo.outputPath(`${name}.png`), fullPage: true })
      }
      for (const [url, endpoint, item] of [
        ["/faq", "/api/v1/faq", { id: "q1", question: "Правила приёма", answer: "Ответ" }],
        ["/abbrev", "/api/v1/abbrev", { id: "a1", short: "ФИТ", full: "Факультет" }],
      ] as const) {
        local.overrides[endpoint] = { items: [item], total: 1 }
        await page.goto(url)
        await page.getByRole("textbox", { name: "Поиск по справочнику" }).fill("missing")
        await expect(page.locator(".admin-empty[data-state=\"no-results\"]")).toBeVisible()
        await shot(`${url.slice(1)}-filtered`)
        await page.getByRole("button", { name: "Сбросить поиск" }).click()
        await expect(page.locator(".admin-empty:visible")).toHaveCount(0)
      }
      local.overrides["/api/v1/rag/docs"] = { documents: [{ id: "empty", title: "Локальный документ", status: "indexed" }] }
      await page.goto("/")
      await page.getByRole("textbox", { name: "Поиск материалов" }).fill("missing")
      await expect(page.locator(".admin-empty[data-state=\"no-results\"]")).toBeVisible()
      await shot("materials-filtered")
      await page.getByRole("button", { name: "Сбросить фильтры" }).click()
      await expect(page.getByText("Локальный документ", { exact: true })).toBeVisible()
      local.overrides["/api/v1/messages/page"] = { items: [{ id: 1, user_id: 42, user_text: "Вопрос", bot_response: "Ответ", session_id: "local-session", created_at: "2026-10-01T10:00:00Z", messenger: "tg" }], total: 1 }
      await page.goto("/messages")
      await page.getByRole("textbox", { name: "Поиск сообщений" }).fill("missing")
      await expect(page.locator(".admin-empty[data-state=\"no-results\"]")).toBeVisible()
      await shot("messages-filtered")
      await page.getByRole("button", { name: "Сбросить фильтры" }).click()
      await page.getByRole("button", { name: "Логи", exact: true }).click()
      const dialog = page.getByRole("dialog")
      await expect(dialog.getByText("Логов сессии пока нет")).toBeVisible()
      await shot("session-empty")
      await page.keyboard.press("Escape")
      await page.goto("/feedback")
      await page.getByPlaceholder("Введите идентификатор сессии").fill("missing")
      await page.getByRole("button", { name: "Применить", exact: true }).click()
      await expect(page.locator(".admin-empty[data-state=\"no-results\"]")).toBeVisible()
      await shot("feedback-filtered")
      await page.getByRole("button", { name: "Сбросить фильтры" }).click()
      // Optional snapshot is not a remotely fetched list: absent snapshots stay absent.
      const report = { id: 41, user_id: 42, channel: "telegram", session_id: "local-session", status: "open", created_at: "2026-10-01T10:00:00Z", comment: "Обращение", logs_snapshot: [] }
      local.overrides["/api/v1/feedback"] = { reports: [report], total: 1 }
      await context.route("**/api/v1/feedback/41", route => route.fulfill({ headers: cors, json: report }))
      await page.reload()
      await page.getByRole("button", { name: "Детали", exact: true }).click()
      await expect(dialog.getByText("Обращение", { exact: true })).toBeVisible()
      await expect(dialog.getByText("Снимок логов", { exact: true })).toHaveCount(0)
      await shot("feedback-no-snapshot")
      await page.keyboard.press("Escape")
      // Both detail endpoints expose loading/error instead of claiming missing data.
      for (const detail of [
        { endpoint: "/api/v1/logs/session/local-session", url: "/messages", trigger: "Логи", empty: "Логов сессии пока нет" },
        { endpoint: "/api/v1/rag/docs/empty/diagnostics", url: "/rag/document/empty", trigger: "Диагностика", empty: null },
        { endpoint: "/api/v1/feedback/41", url: "/feedback", trigger: "Детали", empty: null },
      ]) {
        let release = () => {}
        const held = new Promise<void>((resolve) => {
          release = resolve
        })
        // A page route takes precedence over the shared context fixture.
        let fail = true
        await page.route(`**${detail.endpoint}*`, async (route) => {
          await held
          await route.fulfill({ headers: cors, status: fail ? 503 : 200, json: detail.endpoint.includes("feedback") ? report : detail.empty ? { logs: [] } : { id: "empty", title: "Документ", postgres_status: "indexed", lightrag_status: "not_found", chunks_count: 0, entities_count: 0, relations_count: 0 } })
        })
        await page.goto(detail.url)
        await page.getByRole("button", { name: detail.trigger, exact: true }).click()
        await expect(dialog.locator(".admin-empty[data-state=\"loading\"]")).toBeVisible()
        await shot(`${detail.trigger}-loading`)
        release()
        await expect(dialog.locator(".admin-empty[data-state=\"error\"]")).toBeVisible()
        await expect(dialog.locator(".admin-empty[data-state=\"empty\"]")).toHaveCount(0)
        await shot(`${detail.trigger}-error`)
        fail = false
        const retry = dialog.getByRole("button", { name: "Повторить", exact: true })
        if (detail.trigger === "Детали") {
          await page.keyboard.press("Escape")
          await page.getByRole("button", { name: detail.trigger, exact: true }).click()
        } else {
          await retry.click()
        }
        if (detail.empty) {
          await expect(dialog.getByText(detail.empty)).toBeVisible()
        } else if (detail.trigger === "Диагностика") {
          await expect(dialog.getByText("Статус LightRAG: Обработка не подтверждена.", { exact: true })).toBeVisible()
          await expect(dialog.getByText("Сущности не извлечены", { exact: true })).toHaveCount(0)
          await expect(dialog.locator(".admin-empty[data-state=\"empty\"]")).toHaveCount(0)
        } else {
          await expect(dialog.getByText("Обращение", { exact: true })).toBeVisible()
        }
        await shot(`${detail.trigger}-recovered`)
        await page.keyboard.press("Escape")
        await page.unroute(`**${detail.endpoint}*`)
      }
      await page.goto("/rag/inspector")
      await expect(page.locator(".admin-empty")).toHaveCount(0)
      await page.getByRole("textbox", { name: "Вопрос", exact: true }).fill("Локальный вопрос")
      let releaseQuery = () => {}
      const heldQuery = new Promise<void>((resolve) => {
        releaseQuery = resolve
      })
      let failQuery = true
      await page.route("**/api/v1/rag/debug/query", async (route) => {
        if (route.request().method() === "OPTIONS") {
          return route.fulfill({ headers: cors, status: 204 })
        }
        await heldQuery
        await route.fulfill({ headers: cors, status: failQuery ? 503 : 200, json: { answer: "Ответ", settings: { mode: "hybrid" }, chunks: [], entities: [], relations: [], sources: [] } })
      })
      await page.getByRole("button", { name: "Выполнить", exact: true }).click()
      await expect(page.locator(".admin-empty[data-state=\"loading\"]")).toBeVisible()
      await shot("inspector-loading")
      releaseQuery()
      await expect(page.getByRole("alert").filter({ hasText: "Вопрос сохранён" })).toBeVisible()
      await expect(page.locator(".admin-empty[data-state=\"no-results\"]")).toHaveCount(0)
      await shot("inspector-error")
      failQuery = false
      await page.getByRole("button", { name: "Выполнить", exact: true }).click()
      await expect(page.locator(".admin-empty[data-state=\"no-results\"]")).toHaveCount(4)
      await shot("inspector-no-results")
      expect(local.unexpected).toEqual([])
    })
  }
}

for (const width of [1399, 390]) {
  for (const theme of ["light", "dark"]) {
    test(`auth and public routes are not empty admin collections ${width}px ${theme}`, async ({ page, context }, testInfo) => {
      await emptyFixture(context, theme)
      await page.setViewportSize({ width, height: 900 })
      for (const [url, action, endpoint] of [["/login", "Войти", "/api/v1/auth/login"], ["/register", "Зарегистрироваться", "/api/v1/auth/register"]]) {
        let release = () => {}
        const pending = new Promise<void>((resolve) => {
          release = resolve
        })
        await page.route(`**${endpoint}`, async (route) => {
          if (route.request().method() === "OPTIONS") {
            return route.fulfill({ headers: cors, status: 204 })
          }
          await pending
          await route.fulfill({ headers: cors, status: 400, json: { detail: "Локальная ошибка формы" } })
        })
        await page.goto(url!)
        await expect(page.locator(".admin-empty")).toHaveCount(0)
        await page.getByLabel("Логин", { exact: false }).fill("local-admin")
        await page.getByLabel("Пароль", { exact: false }).fill("local-password")
        await page.getByRole("button", { name: action, exact: true }).click()
        await expect(page.getByRole("button", { name: action, exact: true })).toBeDisabled()
        await page.screenshot({ path: testInfo.outputPath(`${url!.slice(1)}-pending.png`), fullPage: true })
        release()
        await expect(page.getByRole("alert").filter({ hasText: /Не удалось/ }).first()).toBeVisible()
        await expect(page.getByLabel("Логин", { exact: false })).toHaveValue("local-admin")
        await page.screenshot({ path: testInfo.outputPath(`${url!.slice(1)}-error.png`), fullPage: true })
      }
      await page.route("**/api/rating", route => route.fulfill({ headers: cors, status: 404, json: { statusCode: 404 } }))
      await page.goto("/rating")
      await expect(page.getByText("Рейтинг недоступен для этого университета")).toBeVisible()
      await expect(page.locator(".admin-empty")).toHaveCount(0)
      await page.screenshot({ path: testInfo.outputPath("rating-unavailable.png"), fullPage: true })
      await page.route("**/api/rating", route => route.fulfill({ headers: cors, status: 503, json: { statusCode: 503 } }))
      await page.reload()
      await expect(page.getByRole("button", { name: "Повторить", exact: true })).toBeVisible()
      await page.screenshot({ path: testInfo.outputPath("rating-error.png"), fullPage: true })
    })

    test(`rules retry has one state per card ${width}px ${theme}`, async ({ page, context }) => {
      const local = await emptyFixture(context, theme)
      await page.setViewportSize({ width, height: 900 })
      const endpoints = ["/api/v1/settings/rate-limit", "/api/v1/settings/crag", "/api/v1/settings/faq"]
      for (const endpoint of endpoints) {
        local.failures.add(endpoint)
      }
      await page.goto("/settings?section=rules")
      await expect(page.locator(".admin-empty[data-state=\"error\"]:visible")).toHaveCount(3)
      const cards = page.locator(".admin-panel:visible")
      for (let i = 0; i < 3; i++) {
        const card = cards.nth(i)
        let release = () => {}
        const pending = new Promise<void>((resolve) => {
          release = resolve
        })
        for (const endpoint of endpoints) {
          local.holds.set(endpoint, pending)
        }
        await card.getByRole("button", { name: /Повторить/ }).click()
        await expect(card.locator(".admin-empty[data-state=\"loading\"]")).toBeVisible()
        await expect(card.locator(".admin-empty[data-state=\"error\"]")).toHaveCount(0)
        local.failures.clear()
        release()
        await expect(card.locator("form")).toBeVisible()
        local.holds.clear()
      }
      expect(local.unexpected).toEqual([])
    })
  }
}

for (const width of [1399, 390]) {
  for (const theme of ["light", "dark"]) {
    test(`domain states and conditional access ${width}px ${theme}`, async ({ page, context }, testInfo) => {
      const local = await emptyFixture(context, theme)
      await page.setViewportSize({ width, height: 900 })
      const shot = async (name: string) => page.screenshot({ path: testInfo.outputPath(`${name}.png`), fullPage: true })
      local.overrides["/api/v1/settings/instance"] = { revision: 1, encryption_ready: true, settings: [{ key: "FUTURE_OPTION", label: "Будущая настройка", group: "Будущий раздел", choices: [], kind: "text", secret: false, configured: false, value: "" }] }
      await page.goto("/settings?section=connections")
      await expect(page.getByText("Будущий раздел", { exact: true })).toBeVisible()
      await page.getByRole("button", { name: "Модели", exact: true }).click()
      await expect(page.getByText("Настроек в этом разделе пока нет", { exact: true })).toBeVisible()
      await shot("connections-models-empty")
      local.overrides["/api/v1/users/count-stats"] = { day: 0 }
      await page.goto("/stats")
      await expect(page.locator(".admin-detail").getByText("0", { exact: true })).toBeVisible()
      await shot("stats-zero-measured")
      await page.getByRole("tab", { name: "7 дней", exact: true }).last().click()
      await expect(page.getByText("Количество новых пользователей", { exact: true })).toHaveCount(0)
      await shot("stats-period-empty")
      local.overrides["/api/v1/system-logs/files"] = ["empty.log"]
      let release = () => {}
      const pending = new Promise<void>((resolve) => {
        release = resolve
      })
      local.requested.clear()
      local.holds.set("/api/v1/system-logs/", pending)
      local.failures.add("/api/v1/system-logs/")
      await page.goto("/system-logs")
      await expect.poll(() => local.requested.has("/api/v1/system-logs/")).toBe(true)
      await expect(page.locator(".admin-empty[data-state=loading]")).toBeVisible()
      await shot("log-file-loading")
      release()
      await expect(page.locator(".admin-empty[data-state=error]")).toBeVisible()
      await shot("log-file-error")
      local.failures.clear()
      local.holds.clear()
      await page.getByRole("button", { name: "Повторить", exact: true }).click()
      await expect(page.getByText("Файл пуст", { exact: true })).toBeVisible()
      await shot("log-file-empty")
      for (const state of [{ is_running: true, last_result: null }, { is_running: false, last_result: null, error: "Локальная ошибка оценки" }]) {
        local.overrides["/api/v1/evals/status"] = state
        await page.goto("/testing")
        await expect(page.getByText(state.is_running ? "Оценка выполняется" : "Завершилась с ошибкой", { exact: true })).toBeVisible()
        await expect(page.locator(".admin-empty[data-state=empty]")).toHaveCount(0)
        await shot(state.is_running ? "evaluation-running" : "evaluation-failed")
      }
      await page.route("**/api/v1/rag/docs/empty/content", route => route.fulfill({ headers: cors, status: 404, json: { detail: "Not found" } }))
      await page.goto("/rag/document/empty")
      await expect(page.locator(".admin-empty[data-state=error]").getByText("Документ не найден", { exact: true })).toBeVisible()
      await shot("document-not-found")
      await page.unroute("**/api/v1/rag/docs/empty/content")
      local.failures.add("/api/v1/rag/docs")
      local.failures.add("/api/v1/rag/docs/empty/diagnostics")
      await page.reload()
      await expect(page.getByText("Сведения о проверке недоступны", { exact: true })).toBeVisible()
      await expect(page.getByText("Содержимого пока нет", { exact: true })).toBeVisible()
      await shot("document-metadata-unavailable")
      local.failures.clear()
      local.overrides["/api/v1/auth/me"] = { id: "admin", username: "e2e-admin", role: "admin", is_active: true }
      await page.goto("/settings?section=rules")
      await expect(page.getByRole("button", { name: "Сохранить порог FAQ" })).toBeVisible()
      await shot("admin-rules")
      local.overrides["/api/v1/auth/me"] = { id: "viewer", username: "viewer", role: "viewer", is_active: true }
      await page.goto("/")
      await expect(page).toHaveURL(/\/feedback$/)
      await expect(page.getByText("Обращений пока нет", { exact: true })).toBeVisible()
      await shot("viewer-feedback")
      await page.goto("/settings?section=connections")
      await expect(page.getByText("403", { exact: true })).toBeVisible()
      await expect(page.locator(".admin-empty[data-state=empty]")).toHaveCount(0)
      await shot("viewer-forbidden")
      expect(local.unexpected).toEqual([])
    })
  }
}

for (const width of [1399, 390]) {
  for (const theme of ["light", "dark"]) {
    test(`document queue remains an operation list ${width}px ${theme}`, async ({ page, context }, testInfo) => {
      const local = await emptyFixture(context, theme)
      await page.setViewportSize({ width, height: 900 })
      await context.addInitScript(() => {
        localStorage.setItem("rag-parser-pending-items-v1", JSON.stringify(["success", "error", "indexed", "index_error"].map(status => ({ url: `https://fixture.invalid/${status}`, title: `Документ ${status}`, text: "", documents: [], status, ...(status.includes("error") ? { error: "Локальная ошибка операции" } : {}) }))))
        localStorage.setItem("rag-parser-selected-indices-v1", "[]")
      })
      let release = () => {}
      const pending = new Promise<void>((resolve) => {
        release = resolve
      })
      await page.route("**/api/v1/rag/parse*", async (route) => {
        if (route.request().method() === "OPTIONS") {
          return route.fulfill({ headers: cors, status: 204 })
        }
        await pending
        await route.fulfill({ headers: cors, status: 503, json: { detail: "Локальная ошибка препроцессинга" } })
      })
      await page.goto("/")
      await page.getByRole("button", { name: "Добавить материал", exact: true }).click()
      const dialog = page.getByRole("dialog", { name: "Добавить материал", exact: true })
      await expect(dialog.getByText("Очередь документов (4)", { exact: true })).toBeVisible()
      for (const title of ["Готово к загрузке", "Ошибка", "В базе знаний", "Ошибка загрузки"]) {
        await expect(dialog.locator(`[title="${title}"]`)).toBeVisible()
      }
      await dialog.getByPlaceholder("https://university.example/document.pdf").fill("https://fixture.invalid/new")
      await dialog.getByRole("button", { name: "Загрузить", exact: true }).click()
      await expect(dialog.locator("[title=\"Препроцессинг\"]")).toBeVisible()
      await page.screenshot({ path: testInfo.outputPath("queue-parsing.png"), fullPage: true })
      release()
      await expect(dialog.getByText("Локальная ошибка препроцессинга", { exact: true })).toBeVisible()
      await expect(dialog.locator(".admin-empty")).toHaveCount(0)
      expect(await dialog.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true)
      await page.screenshot({ path: testInfo.outputPath("queue-operation-errors.png"), fullPage: true })
      await dialog.getByRole("button", { name: "Посмотреть результат", exact: true }).last().click()
      const editor = page.getByRole("dialog", { name: "Редактирование результата", exact: true })
      await expect(editor.getByText("Локальная ошибка препроцессинга", { exact: false })).toBeVisible()
      await expect(editor.locator(".admin-empty")).toHaveCount(0)
      await page.screenshot({ path: testInfo.outputPath("queue-editor-error.png"), fullPage: true })
      expect(local.unexpected).toEqual([])
    })
  }
}
