import type { BrowserContext } from "@playwright/test"
import { expect, test } from "@playwright/test"

async function mockAdmin(context: BrowserContext, state: "loaded" | "empty" | "error" | "loading" = "loaded") {
  let release = () => {}
  const pending = new Promise<void>((resolve) => {
    release = resolve
  })
  await context.addCookies([{ name: "abitur-token", value: "e2e-session", domain: "127.0.0.1", path: "/" }])
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
    if (url.pathname === "/api/v1/rag/docs") {
      if (state === "loading") {
        await pending
      }
      return reply({ documents: state === "loaded" ? [{ id: "rules", title: "Правила приёма", status: "indexed" }] : [] }, state === "error" ? 503 : 200)
    }
    if (url.pathname.endsWith("/diagnostics")) {
      return reply({ id: "rules", postgres_status: "indexed", lightrag_status: "processed", chunks_count: 3 })
    }
    if (url.pathname === "/api/v1/feedback") {
      return reply({ reports: [], total: 0 })
    }
    return reply({})
  })
  return release
}

test("successful empty materials only offers adding a material, including with stale query filters", async ({ page, context }) => {
  await mockAdmin(context, "empty")
  await page.goto("/?q=old&status=ready")
  await expect(page.getByText("Материалов пока нет", { exact: true })).toBeVisible()
  await expect(page.getByRole("button", { name: "Добавить материал", exact: true })).toBeVisible()
  await expect(page.getByRole("textbox", { name: "Поиск материалов" })).toHaveCount(0)
  await expect(page.getByRole("combobox", { name: "Состояние" })).toHaveCount(0)
  await expect(page.getByRole("button", { name: "Проверить все", exact: true })).toHaveCount(0)
  await expect(page.getByRole("button", { name: "Другие действия" })).toHaveCount(0)
})

test("filtered materials preserve toolbar and can reset search and status together", async ({ page, context }) => {
  await mockAdmin(context)
  await page.goto("/?q=missing&status=attention")
  await expect(page.getByText("Ничего не найдено", { exact: true })).toBeVisible()
  await expect(page.getByRole("textbox", { name: "Поиск материалов" })).toHaveValue("missing")
  await expect(page.getByRole("button", { name: "Проверить все", exact: true })).toBeVisible()
  await page.getByRole("button", { name: "Сбросить фильтры" }).click()
  await expect(page.getByRole("link", { name: "Правила приёма", exact: true })).toBeVisible()
  await expect(page).toHaveURL("/")
})

for (const state of ["loading", "error"] as const) {
  test(`materials ${state} remains distinct from successful empty data`, async ({ page, context }) => {
    const release = await mockAdmin(context, state)
    await page.goto("/")
    await expect(page.getByText(state === "loading" ? "Загрузка материалов…" : "Не удалось загрузить материалы", { exact: true })).toBeVisible()
    await expect(page.getByText("Материалов пока нет", { exact: true })).toHaveCount(0)
    await expect(page.getByRole("button", { name: "Проверить все", exact: true })).toBeVisible()
    release()
    if (state === "loading") {
      await expect(page.getByText("Материалов пока нет", { exact: true })).toBeVisible()
      await expect(page.getByRole("button", { name: "Проверить все", exact: true })).toHaveCount(0)
    } else {
      await expect(page.getByRole("button", { name: "Повторить", exact: true })).toBeVisible()
    }
  })
}

for (const width of [1049, 390]) {
  test(`feedback controls align and fit at ${width}px`, async ({ page, context }, testInfo) => {
    await mockAdmin(context)
    await page.setViewportSize({ width, height: width === 390 ? 844 : 881 })
    await page.goto("/feedback")
    await expect(page.getByRole("button", { name: "Применить", exact: true })).toBeVisible()
    const controls = page.locator(".feedback-filters").locator("input, button")
    await expect(controls).toHaveCount(4)
    const bounds = await controls.evaluateAll(elements => elements.map((element) => {
      const { x, y, width, height, bottom, right } = element.getBoundingClientRect()
      return { x, y, width, height, bottom, right }
    }))
    expect(bounds.every(item => item.x >= 0 && item.right <= width && item.height >= 28)).toBe(true)
    if (width === 1049) {
      expect(Math.max(...bounds.map(item => item.bottom)) - Math.min(...bounds.map(item => item.bottom))).toBeLessThanOrEqual(1)
      expect(bounds[3]!.y - bounds[0]!.y).toBeLessThan(8)
    } else {
      expect(bounds.every((item, index) => index === 0 || item.y >= bounds[index - 1]!.bottom + 12)).toBe(true)
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width)
    await page.screenshot({ path: testInfo.outputPath(`feedback-${width}.png`), fullPage: true })
  })
}
