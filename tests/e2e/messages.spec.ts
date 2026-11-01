import type { BrowserContext } from "@playwright/test"
import { expect, test } from "@playwright/test"

const records = Array.from({ length: 526 }, (_, index) => ({
  id: index + 1,
  user_id: index === 525 ? 42 : 1,
  username: index === 525 ? "applicant" : "seniormarat",
  created_at: "2026-11-01T04:42:00Z",
  messenger: "Telegram",
  user_text: index === 525 ? "Дальний вопрос за пределами первой выборки" : `Вопрос ${index + 1}: Какие документы нужны для поступления?`,
  bot_response: "Подайте заявление и документы через приёмную комиссию. Сроки указаны в правилах приёма университета.",
  session_id: `session-${index + 1}`,
}))

async function fixture(context: BrowserContext, single = false) {
  const requests: URL[] = []
  let failExport = false
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
    const reply = (json: unknown, status = 200) => route.fulfill({ status, headers, json })
    if (route.request().method() === "OPTIONS") {
      return route.fulfill({ status: 204, headers })
    }
    if (url.pathname === "/api/v1/auth/me") {
      return reply({ id: 1, username: "e2e-admin", role: "superadmin", is_active: true })
    }
    if (url.pathname === "/api/v1/university") {
      return reply({ profile: "nsu", short_name: "НГУ", assistant_name: "Абитуриент" })
    }
    if (url.pathname === "/api/v1/messages/page") {
      requests.push(url)
      const offset = Number(url.searchParams.get("offset") ?? 0)
      const limit = Number(url.searchParams.get("limit") ?? 25)
      if (failExport && limit === 500 && offset === 500) {
        return reply({ detail: "Unavailable" }, 503)
      }
      let items = single ? records.slice(0, 1) : records
      const search = url.searchParams.get("search")?.toLowerCase()
      const user = url.searchParams.get("user_id")
      if (search) {
        items = items.filter(item => item.user_text.toLowerCase().includes(search))
      }
      if (user) {
        items = items.filter(item => item.user_id === Number(user))
      }
      if (url.searchParams.get("channel")?.toLowerCase() === "max") {
        items = []
      }
      return reply({ items: items.slice(offset, offset + limit), total: items.length, offset, limit, snapshot_id: "01990000-0000-7000-8000-000000000001" })
    }
    return reply({ detail: "Unknown fixture" }, 501)
  })
  return { requests, failExport: () => {
    failExport = true
  } }
}

test("one pager reaches messages beyond 500 without loading the entire history", async ({ page, context }) => {
  const local = await fixture(context)
  await page.goto("/messages")
  await expect(page.getByText("Вопрос 1: Какие документы нужны для поступления?", { exact: true })).toBeVisible()
  expect(local.requests.map(url => url.searchParams.get("limit"))).toEqual(["25"])
  await expect(page.getByText("Предыдущие 500", { exact: true })).toHaveCount(0)
  await expect(page.getByText("Следующие 500", { exact: true })).toHaveCount(0)
  await page.getByRole("button", { name: "Последняя страница", exact: true }).click()
  await expect(page.getByText("Дальний вопрос за пределами первой выборки", { exact: true })).toBeVisible()
  expect(local.requests.at(-1)?.searchParams.get("offset")).toBe("525")
  await page.getByRole("textbox", { name: "Поиск сообщений" }).fill("Дальний")
  await expect(page.getByText("Дальний вопрос за пределами первой выборки", { exact: true })).toBeVisible()
  await expect.poll(() => local.requests.at(-1)?.searchParams.get("search")).toBe("Дальний")
  expect(local.requests.at(-1)?.searchParams.get("offset")).toBe("0")
  await expect(page.locator(".messages-pagination")).toHaveCount(0)
})

test("CSV export reads every filtered page only on demand and never downloads failed partial results", async ({ page, context }) => {
  const local = await fixture(context)
  await page.goto("/messages")
  await expect(page.locator("tbody tr")).toHaveCount(25)
  const download = page.waitForEvent("download")
  await page.getByRole("button", { name: "Экспорт в CSV", exact: true }).click()
  expect((await download).suggestedFilename()).toMatch(/^messages_/)
  const exportRequests = local.requests.filter(url => url.searchParams.get("limit") === "500")
  expect(exportRequests.map(url => url.searchParams.get("offset"))).toEqual(["0", "500"])
  expect(exportRequests.map(url => url.searchParams.get("snapshot_id"))).toEqual([null, "01990000-0000-7000-8000-000000000001"])
  local.failExport()
  let downloaded = false
  page.on("download", () => {
    downloaded = true
  })
  await page.getByRole("button", { name: "Экспорт в CSV", exact: true }).click()
  await expect(page.getByRole("alert")).toHaveText("Не удалось экспортировать сообщения. Попробуйте ещё раз.")
  expect(downloaded).toBe(false)
})

for (const width of [1399, 1049, 390]) {
  test(`message controls and table fill the available width at ${width}px`, async ({ page, context }, testInfo) => {
    await fixture(context, true)
    const errors: string[] = []
    page.on("pageerror", error => errors.push(error.message))
    await page.setViewportSize({ width, height: 881 })
    await page.goto("/messages")
    await expect(page.locator("tbody tr")).toHaveCount(1)
    await expect(page.getByText("Журнал сообщений", { exact: true })).toHaveCount(0)
    await expect(page.getByText("Пользователь (вся база)", { exact: true })).toHaveCount(0)
    await expect(page.getByRole("button", { name: "Применить", exact: true })).toHaveCount(0)
    await expect(page.locator(".messages-pagination")).toHaveCount(0)
    await expect(page.locator("[aria-invalid=\"true\"]")).toHaveCount(0)
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width)
    const fields = await page.locator(".messages-date").evaluateAll(elements => elements.map((element) => {
      const parent = element.getBoundingClientRect()
      const input = element.querySelector("[data-slot=\"base\"]")!.getBoundingClientRect()
      return { left: input.left - parent.left, right: parent.right - input.right }
    }))
    expect(fields.every(field => field.left >= -1 && field.right >= -1)).toBe(true)
    const bounds = await page.locator(".messages-table").evaluate((root) => {
      const table = root.querySelector("table")!
      const last = table.querySelector("thead th:last-child")!
      return { root: root.clientWidth, table: table.getBoundingClientRect().width, last: last.getBoundingClientRect().right, right: table.getBoundingClientRect().right }
    })
    expect(bounds.table).toBeGreaterThanOrEqual(bounds.root)
    expect(Math.abs(bounds.last - bounds.right)).toBeLessThanOrEqual(1)
    await page.screenshot({ path: testInfo.outputPath(`messages-${width}.png`), fullPage: true })
    expect(errors).toEqual([])
  })
}
