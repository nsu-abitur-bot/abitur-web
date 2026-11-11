import type { BrowserContext } from "@playwright/test"
import { expect, test } from "@playwright/test"

interface Material {
  id: string
  title: string
  status: string
  lightrag_status: string
  import_state?: string
  proposal_only?: boolean
}

async function materialsApi(context: BrowserContext, count = 45) {
  const state = {
    documents: Array.from({ length: count }, (_, i): Material => ({ id: `doc-${i}`, title: `Материал ${String(i).padStart(2, "0")}`, status: "indexed", lightrag_status: i % 2 ? "failed" : "processed" })),
    reads: [] as URL[],
    diagnostics: 0,
    pending: false,
    deleted: [] as string[],
    holds: new Map<string, Promise<void>>(),
    completed: [] as string[],
  }
  await context.addCookies([{ name: "abitur-token", value: "e2e-session", domain: "127.0.0.1", path: "/" }])
  await context.route("**/api/v1/**", async (route) => {
    const url = new URL(route.request().url())
    const headers = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "*", "Access-Control-Allow-Methods": "*" }
    const reply = (json: unknown) => route.fulfill({ headers, json })
    if (route.request().method() === "OPTIONS") {
      return route.fulfill({ status: 204, headers })
    }
    if (url.pathname === "/api/v1/auth/me") {
      return reply({ id: 1, username: "e2e-admin", role: "superadmin", is_active: true })
    }
    if (url.pathname === "/api/v1/rag/docs") {
      state.reads.push(url)
      const q = url.searchParams.get("q") ?? ""
      await state.holds.get(q)
      const filter = url.searchParams.get("state")
      const filtered = state.documents.filter(doc => doc.title.toLowerCase().includes(q.toLowerCase()) && (filter === "all" || (filter === "ready" ? doc.lightrag_status === "processed" : doc.lightrag_status === "failed")))
      const offset = Number(url.searchParams.get("offset") ?? 0)
      const limit = Number(url.searchParams.get("limit") ?? 20)
      await reply({ documents: filtered.slice(offset, offset + limit), total: filtered.length, total_all: state.documents.length, offset, limit, has_pending: state.pending })
      state.completed.push(q)
      return
    }
    if (url.pathname.endsWith("/diagnostics")) {
      state.diagnostics++
      return reply({ id: "doc-0", lightrag_status: "processed", chunks_count: 1 })
    }
    if (route.request().method() === "DELETE") {
      const id = url.pathname.split("/").at(-1)!
      state.deleted.push(id)
      state.documents = state.documents.filter(doc => doc.id !== id)
      return reply({})
    }
    return reply({})
  })
  return state
}

test("loads one bounded page without diagnostics or idle polling and preserves filters", async ({ page, context }, testInfo) => {
  const api = await materialsApi(context)
  await page.clock.install()
  await page.goto("/")
  await expect(page.locator("tbody tr")).toHaveCount(20)
  await expect(page.getByText("Найдено: 45 из 45")).toBeVisible()
  expect(api.reads).toHaveLength(1)
  expect(api.reads[0]!.searchParams.get("limit")).toBe("20")
  expect(api.diagnostics).toBe(0)
  await page.clock.fastForward(15000)
  expect(api.reads).toHaveLength(1)
  await page.getByRole("button", { name: "Страница 2", exact: true }).click()
  await expect(page.getByRole("link", { name: "Материал 20", exact: true })).toBeVisible()
  expect(api.reads.at(-1)!.searchParams.get("offset")).toBe("20")
  await page.screenshot({ path: testInfo.outputPath("materials-page-desktop.png"), fullPage: true })
  await page.setViewportSize({ width: 390, height: 844 })
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390)
  await page.screenshot({ path: testInfo.outputPath("materials-page-mobile.png"), fullPage: true })
  await page.setViewportSize({ width: 1280, height: 720 })
  const search = page.getByRole("textbox", { name: "Поиск материалов" })
  await search.fill("Материал 4")
  await page.clock.fastForward(350)
  await expect(page.locator("tbody tr")).toHaveCount(5)
  expect(api.reads.at(-1)!.searchParams.get("offset")).toBe("0")
  await expect(page.getByText("Найдено: 5 из 45")).toBeVisible()
  await page.reload()
  await expect(search).toHaveValue("Материал 4")
  await expect(page.locator("tbody tr")).toHaveCount(5)
  await page.screenshot({ path: testInfo.outputPath("materials-pagination.png"), fullPage: true })
})

test("debounces search, filters the complete collection and explicitly refreshes", async ({ page, context }) => {
  const api = await materialsApi(context)
  await page.clock.install()
  await page.goto("/?status=ready")
  await expect(page.getByText("Найдено: 23 из 45")).toBeVisible()
  const search = page.getByRole("textbox", { name: "Поиск материалов" })
  await search.fill("Материал 3")
  await search.fill("Материал 44")
  await page.clock.fastForward(350)
  await expect(page.getByRole("link", { name: "Материал 44", exact: true })).toBeVisible()
  expect(api.reads).toHaveLength(2)
  api.documents[44]!.title = "Новый заголовок"
  await page.getByRole("button", { name: "Обновить материалы" }).click()
  await expect(page.getByText("Ничего не найдено", { exact: true })).toBeVisible()
  expect(api.diagnostics).toBe(0)
})

test("polls the global queue, stops when it drains and does not poll hidden tabs", async ({ page, context }) => {
  const api = await materialsApi(context)
  api.pending = true
  await page.clock.install()
  await page.goto("/?q=absent")
  await expect(page.getByText("Ничего не найдено", { exact: true })).toBeVisible()
  await page.evaluate(() => Object.defineProperty(document, "hidden", { configurable: true, value: true }))
  await page.clock.fastForward(5000)
  expect(api.reads).toHaveLength(1)
  await page.evaluate(() => Object.defineProperty(document, "hidden", { configurable: true, value: false }))
  api.pending = false
  await page.clock.fastForward(5000)
  await expect.poll(() => api.reads.length).toBe(2)
  await page.clock.fastForward(10000)
  expect(api.reads).toHaveLength(2)
})

test("deleting the only row on a page returns to a valid page and scopes selection", async ({ page, context }) => {
  const api = await materialsApi(context, 21)
  api.documents[0] = { ...api.documents[0]!, proposal_only: true, import_state: "queued" }
  await page.goto("/")
  await expect(page.locator("tbody tr")).toHaveCount(20)
  await page.getByRole("checkbox", { name: "Выбрать видимые материалы" }).click()
  await expect(page.getByText("Выбрано: 19", { exact: true })).toBeVisible()
  await page.getByRole("button", { name: "Страница 2", exact: true }).click()
  await expect(page.locator("tbody tr")).toHaveCount(1)
  await expect(page.getByText("Выбрано: 19", { exact: true })).toHaveCount(0)
  await page.getByRole("checkbox", { name: "Выбрать Материал 20", exact: true }).click()
  await page.getByRole("button", { name: "Удалить", exact: true }).click()
  await page.getByRole("dialog").getByRole("button", { name: "Удалить", exact: true }).click()
  await expect(page.locator("tbody tr")).toHaveCount(20)
  await expect(page).toHaveURL("/")
  expect(api.deleted).toEqual(["doc-20"])
})

test("ignores a slow response after the search changes", async ({ page, context }) => {
  const api = await materialsApi(context)
  let release = () => {}
  api.holds.set("Материал 40", new Promise<void>((resolve) => {
    release = resolve
  }))
  await page.goto("/")
  await expect(page.locator("tbody tr")).toHaveCount(20)
  const search = page.getByRole("textbox", { name: "Поиск материалов" })
  await search.fill("Материал 40")
  await expect.poll(() => api.reads.length).toBe(2)
  await search.fill("Материал 44")
  await expect(page.getByRole("link", { name: "Материал 44", exact: true })).toBeVisible()
  release()
  await expect.poll(() => api.completed.includes("Материал 40")).toBe(true)
  await expect(page.getByRole("link", { name: "Материал 40", exact: true })).toHaveCount(0)
  await expect(page.locator("tbody tr")).toHaveCount(1)
})
