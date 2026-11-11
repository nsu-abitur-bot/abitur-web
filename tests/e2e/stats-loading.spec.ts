import { expect, test } from "@playwright/test"

import { emptyFixture } from "./fixtures/empty-states"

test("statistics opens while popular questions are pending and other blocks stay usable", async ({ page, context }, testInfo) => {
  const local = await emptyFixture(context)
  let release!: () => void
  local.holds.set("/api/v1/logs/popular", new Promise<void>((resolve) => {
    release = resolve
  }))
  local.overrides["/api/v1/users/count-stats"] = { day: 17 }
  try {
    await page.goto("/feedback")
    await page.getByRole("link", { name: "Статистика", exact: true }).click()
    await expect.poll(() => local.requested.has("/api/v1/logs/popular")).toBe(true)
    await expect(page.getByRole("heading", { name: "Статистика", exact: true })).toBeVisible({ timeout: 2000 })
    await expect(page.getByText("Количество новых пользователей", { exact: true })).toBeVisible()
    await expect(page.getByText("17", { exact: true })).toBeVisible()
    await expect(page.getByText("Загрузка вопросов…", { exact: true })).toBeVisible()
    await page.screenshot({ path: testInfo.outputPath("stats-independent-loading.png"), fullPage: true })
    release()
    await expect(page.getByText("Нет данных по вопросам", { exact: true })).toBeVisible()
  } finally {
    release()
  }
})

test("changing the popular question limit sends one request", async ({ page, context }) => {
  await emptyFixture(context)
  const requests: string[] = []
  page.on("request", (request) => {
    const url = new URL(request.url())
    if (url.pathname === "/api/v1/logs/popular" && request.method() === "GET") {
      requests.push(url.searchParams.get("limit")!)
    }
  })
  await page.goto("/stats")
  await expect(page.getByText("Нет данных по вопросам", { exact: true })).toBeVisible()
  const before = requests.length
  await page.locator("input[type=\"number\"]").fill("7")
  await expect.poll(() => requests.slice(before)).toEqual(["7"])
  await expect(page.getByText("Нет данных по вопросам", { exact: true })).toBeVisible()
  expect(requests.slice(before)).toEqual(["7"])
})

test("a snapshot being prepared is loading, then the block reads the ready result", async ({ page, context }) => {
  const local = await emptyFixture(context)
  local.overrides["/api/v1/logs/popular"] = { questions: [], status: "pending", updated_at: null }
  local.overrides["/api/v1/users/count-stats"] = { day: 17 }
  await page.goto("/stats")
  await expect(page.getByText("Загрузка вопросов…", { exact: true })).toBeVisible()
  await expect(page.getByText("Нет данных по вопросам", { exact: true })).toHaveCount(0)
  await expect(page.getByText("17", { exact: true })).toBeVisible()
  local.overrides["/api/v1/logs/popular"] = { questions: [{ question: "Как поступить?", count: 3, variants: [] }], status: "ready", updated_at: "2026-11-11T07:00:00Z" }
  await expect(page.getByText("\"Как поступить?\"", { exact: true })).toBeVisible()
  await expect(page.getByText("Загрузка вопросов…", { exact: true })).toHaveCount(0)
})

test("a background preparation error is not shown as an empty history", async ({ page, context }) => {
  const local = await emptyFixture(context)
  local.overrides["/api/v1/logs/popular"] = { questions: [], status: "error", updated_at: null }
  await page.goto("/stats")
  await expect(page.getByText("Не удалось загрузить популярные вопросы", { exact: true })).toBeVisible()
  await expect(page.getByText("Нет данных по вопросам", { exact: true })).toHaveCount(0)
  local.overrides["/api/v1/logs/popular"] = { questions: [], status: "ready", updated_at: "2026-11-11T07:00:00Z" }
  await page.getByRole("button", { name: "Повторить", exact: true }).click()
  await expect(page.getByText("Нет данных по вопросам", { exact: true })).toBeVisible()
})
