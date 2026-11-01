import { mkdir } from "node:fs/promises"

import type { BrowserContext, Locator, Page, TestInfo } from "@playwright/test"
import { expect, test } from "@playwright/test"

const longText = "Локальный пример шага обработки заявления. ".repeat(80) + "x".repeat(300)
const report = { id: 41, user_id: 7, channel: "telegram", session_id: "synthetic-session", status: "open", created_at: "2026-10-01T12:00:00Z", comment: "Тестовое обращение", question: longText, bot_response: longText, logs_snapshot: [{ content: longText }] }

async function screenshot(page: Page, testInfo: TestInfo, name: string) {
  await mkdir("/tmp/abitur-central-details-40", { recursive: true })
  const path = `/tmp/abitur-central-details-40/${name}.png`
  await page.screenshot({ path })
  await testInfo.attach(name, { path, contentType: "image/png" })
}

async function fixture(context: BrowserContext, mode: string) {
  await context.addCookies([{ name: "abitur-token", value: "e2e-session", domain: "127.0.0.1", path: "/" }])
  await context.addInitScript(mode => localStorage.setItem("nuxt-color-mode", mode), mode)
  let fail = false
  let slow = false
  let updated = false
  await context.route("**/api/v1/**", async (route) => {
    const path = new URL(route.request().url()).pathname
    const headers = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "*", "Access-Control-Allow-Methods": "*" }
    const reply = (json: unknown, status = 200) => route.fulfill({ headers, json, status })
    if (route.request().method() === "OPTIONS") {
      return route.fulfill({ headers, status: 204 })
    }
    const detail = path.includes("/logs/session/") || path === "/api/v1/feedback/41" || path.endsWith("/diagnostics")
    if (detail && slow) {
      await new Promise(resolve => setTimeout(resolve, 700))
    }
    if (detail && fail) {
      return reply({ detail: "Synthetic failure" }, 503)
    }
    if (route.request().method() === "PATCH") {
      updated = true
      return reply({ ...report, status: "reviewed" })
    }
    const fixtures: Record<string, unknown> = {
      "/api/v1/auth/me": { id: 1, username: "e2e-admin", role: "superadmin", is_active: true },
      "/api/v1/university": { profile: "custom", short_name: "Тестовый вуз", assistant_name: "Помощник" },
      "/api/v1/messages/page": { items: [{ id: 1, user_id: 7, username: "synthetic-applicant", created_at: report.created_at, messenger: "telegram", user_text: "Тестовый вопрос", bot_response: "Тестовый ответ", session_id: report.session_id }], total: 1 },
      "/api/v1/logs/session/synthetic-session": { logs: Array.from({ length: 12 }, (_, id) => ({ id, message_type: id % 2 ? "llm_response" : "user_input", content: `Шаг ${id + 1}\n${longText}`, created_at: report.created_at, message_metadata: { synthetic: longText } })) },
      "/api/v1/topics/": { topics: [] },
      "/api/v1/feedback": { reports: [report], total: 1 },
      "/api/v1/feedback/41": report,
      "/api/v1/rag/docs": { documents: [{ id: "synthetic-doc", title: "Тестовый документ", chunks_count: 3 }] },
      "/api/v1/rag/docs/synthetic-doc/diagnostics": { id: "synthetic-doc", title: "Тестовый документ", postgres_status: "indexed", lightrag_status: "failed", chunks_count: 3, entities_count: 0, relations_count: 0, error: longText },
    }
    return reply(fixtures[path] ?? {})
  })
  return {
    fail: (value: boolean) => { fail = value },
    slow: (value: boolean) => { slow = value },
    updated: () => updated,
  }
}

async function centered(page: Page, dialog: Locator, width: number) {
  await expect(dialog).toBeVisible()
  await expect.poll(async () => {
    const box = (await dialog.boundingBox())!
    return Math.abs(box.x + box.width / 2 - width / 2)
  }).toBeLessThan(2)
  const box = (await dialog.boundingBox())!
  const inset = width <= 600 ? 12 : 16
  expect(box.x).toBeGreaterThanOrEqual(inset)
  expect(box.width).toBeLessThanOrEqual(width - inset * 2)
  expect(box.height).toBeLessThanOrEqual(881 - (width <= 600 ? 24 : 48))
  expect(Math.abs(box.y + box.height / 2 - 881 / 2)).toBeLessThan(2)
  expect(await dialog.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true)
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width)
  await page.keyboard.press("Shift+Tab")
  expect(await dialog.evaluate(el => el.contains(document.activeElement))).toBe(true)
}

for (const width of [1399, 1049, 390]) {
  for (const mode of ["light", "dark"]) {
    test(`content details centered at ${width}px ${mode}`, async ({ page, context }, testInfo) => {
      await fixture(context, mode)
      await page.setViewportSize({ width, height: 881 })
      await page.goto("/messages")
      const trigger = page.getByRole("button", { name: "Логи", exact: true })
      await trigger.click()
      const dialog = page.getByRole("dialog")
      await expect(dialog.getByText("Шаг 12", { exact: false })).toHaveCount(1)
      await centered(page, dialog, width)
      await dialog.locator("summary").first().click()
      await expect(dialog.locator("pre").first()).toBeVisible()
      await dialog.getByText("Шаг 12", { exact: false }).scrollIntoViewIfNeeded()
      await expect(dialog.getByText("Шаг 12", { exact: false })).toBeInViewport()
      await dialog.locator("[data-slot=body]").evaluate(el => el.scrollTo(0, 0))
      await screenshot(page, testInfo, `session-${width}-${mode}`)
      await page.keyboard.press("Escape")
      await expect(dialog).toBeHidden()
      await expect(trigger).toBeFocused()
      await page.goto("/feedback")
      const feedbackTrigger = page.getByRole("button", { name: "Детали", exact: true })
      await feedbackTrigger.click()
      await expect(dialog.getByText("Снимок логов", { exact: true })).toBeVisible()
      await centered(page, dialog, width)
      await dialog.getByRole("button", { name: "Игнорировать", exact: true }).scrollIntoViewIfNeeded()
      await expect(dialog.getByRole("button", { name: "Игнорировать", exact: true })).toBeInViewport()
      await screenshot(page, testInfo, `feedback-${width}-${mode}`)
      await page.keyboard.press("Escape")
      await expect(feedbackTrigger).toBeFocused()
      await page.goto("/")
      await page.getByRole("button", { name: "Действия: Тестовый документ" }).click()
      await page.getByRole("menuitem", { name: "Диагностика", exact: true }).click()
      await expect(dialog.getByText("Ошибка обработки LightRAG", { exact: true })).toBeVisible()
      await centered(page, dialog, width)
      await dialog.getByRole("button", { name: "Закрыть", exact: true }).last().scrollIntoViewIfNeeded()
      await expect(dialog.getByRole("button", { name: "Закрыть", exact: true }).last()).toBeInViewport()
      await screenshot(page, testInfo, `diagnostics-${width}-${mode}`)
      await dialog.getByRole("button", { name: "Закрыть", exact: true }).last().click()
      await expect(dialog).toBeHidden()
    })
  }
}

test("detail loading, errors, retry and feedback actions survive", async ({ page, context }) => {
  const local = await fixture(context, "light")
  local.slow(true)
  local.fail(true)
  await page.goto("/messages")
  await page.getByRole("button", { name: "Логи", exact: true }).click()
  const dialog = page.getByRole("dialog")
  await expect(dialog.getByText("Загрузка логов…", { exact: true })).toBeVisible()
  await expect(dialog.getByText("Не удалось загрузить логи сессии", { exact: true })).toBeVisible()
  local.fail(false)
  await dialog.getByRole("button", { name: "Повторить", exact: true }).click()
  await expect(dialog.getByText("Шаг 12", { exact: false })).toBeVisible()
  await page.keyboard.press("Escape")
  await page.goto("/feedback")
  local.fail(true)
  await page.getByRole("button", { name: "Детали", exact: true }).click()
  await expect(dialog.getByText("Загрузка обращения…", { exact: true })).toBeVisible()
  await expect(dialog.getByText("Не удалось загрузить обращение", { exact: true })).toBeVisible()
  await page.keyboard.press("Escape")
  local.fail(false)
  await page.getByRole("button", { name: "Детали", exact: true }).click()
  await dialog.getByRole("button", { name: "Проверено", exact: true }).click()
  await expect.poll(local.updated).toBe(true)
  await expect(dialog.getByText("Проверено", { exact: true }).first()).toBeVisible()
  await page.keyboard.press("Escape")
  await page.goto("/")
  local.fail(true)
  await page.getByRole("button", { name: "Действия: Тестовый документ" }).click()
  await page.getByRole("menuitem", { name: "Диагностика", exact: true }).click()
  await expect(dialog.getByText("Не удалось загрузить диагностику документа", { exact: true })).toBeVisible()
  local.fail(false)
  await dialog.getByRole("button", { name: "Повторить", exact: true }).click()
  await expect(dialog.getByText("Ошибка обработки LightRAG", { exact: true })).toBeVisible()
  await page.keyboard.press("Escape")
  await expect(dialog).toBeHidden()
})
