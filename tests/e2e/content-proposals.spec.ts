import { expect, test } from "@playwright/test"

test("editor reviews a queued proposal", async ({ page, context }) => {
  await context.addCookies([{ name: "abitur-token", value: "e2e-session", domain: "127.0.0.1", path: "/" }])
  let proposals = [{
    id: "proposal-1",
    source: "parser",
    graph_id: "abitur_kb",
    title: "Правила приёма",
    text: "Текст для проверки",
    source_url: "https://example.org/rules",
    source_hash: null,
    status: "pending",
    reviewer_id: null,
    document_id: null,
    created_at: "2026-11-03T10:00:00Z",
    reviewed_at: null,
  }]
  let approved = false
  await context.route("**/api/v1/**", async (route) => {
    const path = new URL(route.request().url()).pathname
    const headers = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "*", "Access-Control-Allow-Methods": "*" }
    if (route.request().method() === "OPTIONS") {
      return route.fulfill({ status: 204, headers })
    }
    if (path === "/api/v1/content-proposals" && route.request().method() === "GET") {
      return route.fulfill({ headers, json: proposals })
    }
    if (path === "/api/v1/content-proposals/proposal-1/approve") {
      approved = true
      proposals = []
      return route.fulfill({ headers, json: { status: "approved" } })
    }
    const fixtures: Record<string, unknown> = {
      "/api/v1/auth/me": { id: "editor", username: "editor", role: "admin", is_active: true },
      "/api/v1/branding": { revision: 1, short_name: "НГУ", full_name: "Новосибирский государственный университет", logo_url: "", accent_color: "#4b4bd2" },
    }
    return route.fulfill({ headers, json: fixtures[path] ?? {} })
  })
  await page.goto("/rag/proposals")
  await expect(page.getByRole("heading", { name: "Правила приёма" })).toBeVisible()
  await expect(page.getByText("Текст для проверки")).toBeVisible()
  await page.getByRole("button", { name: "Принять" }).click()
  await expect(page.getByText("Новых предложений нет")).toBeVisible()
  expect(approved).toBe(true)
})
