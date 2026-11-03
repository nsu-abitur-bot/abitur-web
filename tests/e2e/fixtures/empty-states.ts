import type { BrowserContext } from "@playwright/test"

// Every API response is local; unknown endpoints and mutations fail closed.
export async function emptyFixture(context: BrowserContext, theme = "light") {
  const overrides: Record<string, unknown> = {}
  const failures = new Set<string>()
  const holds = new Map<string, Promise<void>>()
  const requested = new Set<string>()
  const unexpected: string[] = []
  const fixtures: Record<string, unknown> = {
    "/api/v1/branding": { revision: 1, short_name: "Тестовый вуз", full_name: "Тестовый университет", logo_url: "", favicon_url: "", accent_color: "#4b4bd2" },
    "/api/v1/auth/me": { id: "admin", username: "e2e-admin", role: "superadmin", is_active: true },
    "/api/v1/university": { profile: "custom", short_name: "Тестовый вуз", assistant_name: "Помощник" },
    "/api/v1/rag/docs": { documents: [] },
    "/api/v1/rag/docs/empty/content": { id: "empty", content: "" },
    "/api/v1/rag/docs/empty/diagnostics": { id: "empty", postgres_status: "indexed", lightrag_status: "processed", chunks_count: 0 },
    "/api/v1/faq": { items: [], total: 0 },
    "/api/v1/abbrev": { items: [], total: 0 },
    "/api/v1/faculties": [],
    "/api/v1/admission-scores": [],
    "/api/v1/messages/page": { items: [], total: 0, limit: 25, offset: 0 },
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
  await context.addInitScript(theme => localStorage.setItem("nuxt-color-mode", theme), theme)
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
    requested.add(url.pathname)
    await holds.get(url.pathname)
    if (failures.has(url.pathname)) {
      return route.fulfill({ status: 503, headers, json: { detail: "Local fixture unavailable" } })
    }
    if (route.request().method() === "GET" && Object.hasOwn(fixtures, url.pathname)) {
      if (url.pathname === "/api/v1/messages/page") {
        const result = (overrides[url.pathname] ?? fixtures[url.pathname]) as { items: { user_text: string }[] }
        const search = url.searchParams.get("search")?.toLowerCase()
        const items = result.items.filter(item => !search || item.user_text.toLowerCase().includes(search))
        return route.fulfill({ headers, json: { items, total: items.length, limit: 25, offset: 0 } })
      }
      return route.fulfill({ headers, json: overrides[url.pathname] ?? fixtures[url.pathname] })
    }
    if (url.pathname === "/api/v1/rag/debug/query" && route.request().method() === "POST") {
      return route.fulfill({ headers, json: { answer: "Локальный ответ", settings: { mode: "hybrid" }, chunks: [], entities: [], relations: [], sources: [] } })
    }
    unexpected.push(`${route.request().method()} ${url.pathname}`)
    return route.fulfill({ status: 501, headers, json: { detail: "Unknown local fixture" } })
  })
  return { overrides, failures, unexpected, holds, requested }
}
