import { Buffer } from "node:buffer"
import { createServer } from "node:http"

// Deliberately local, stateless fixtures. Unknown endpoints fail closed.
let publicProfile = "nsu"
let brandingFixture
let brandingDelay = 0
let brandingStatus = 200
let brandingRequests = []
const token = "e2e-local-admin-token"
const server = createServer(async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "http://127.0.0.1:9464")
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization")
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
  const reply = (status, data) => {
    res.writeHead(status, { "Content-Type": "application/json" })
    res.end(JSON.stringify(data))
  }
  if (req.method === "OPTIONS") {
    res.writeHead(204).end()
    return
  }
  if (req.url === "/__test/branding/state") {
    reply(200, brandingRequests)
    return
  }
  if (req.url?.startsWith("/api/v1/branding/media/first")) {
    res.writeHead(200, { "Content-Type": "image/png", "Cache-Control": "no-store" })
    res.end(Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jVZkAAAAASUVORK5CYII=", "base64"))
    return
  }
  if (req.url === "/__test/branding" && req.method === "POST") {
    let raw = ""
    for await (const chunk of req) {
      raw += String(chunk)
    }
    const data = JSON.parse(raw)
    brandingFixture = data.brand
    brandingDelay = data.delay || 0
    brandingStatus = data.status || 200
    brandingRequests = []
    reply(200, { ok: true })
    return
  }
  if (req.url === "/health") {
    reply(200, { ok: true })
    return
  }
  if (req.url === "/api/v1/auth/login" && req.method === "POST") {
    let body = ""
    for await (const chunk of req) {
      const text = String(chunk)
      body += text
    }
    const credentials = JSON.parse(body)
    const valid = credentials.username === "e2e-admin" && credentials.password === "local-test-password"
    reply(valid ? 200 : 401, valid ? { access_token: token, token_type: "bearer" } : { detail: "Incorrect username or password" })
    return
  }
  if (req.url?.startsWith("/__test/profile/")) {
    publicProfile = req.url.split("/").at(-1)
    reply(200, { ok: true })
    return
  }
  if (req.url === "/api/v1/university/profile") {
    if (req.headers.authorization || req.headers.cookie) {
      reply(400, { detail: "Public profile must not receive credentials" })
    } else if (publicProfile === "unavailable" || publicProfile === "missing") {
      reply(publicProfile === "missing" ? 404 : 503, { detail: "Unavailable" })
    } else {
      reply(200, { profile: publicProfile })
    }
    return
  }
  if (req.url === "/api/v1/branding") {
    brandingRequests.push({ authorization: Boolean(req.headers.authorization), cookie: Boolean(req.headers.cookie) })
    if (brandingDelay) {
      await new Promise(resolve => setTimeout(resolve, brandingDelay))
    }
    reply(brandingStatus, brandingFixture || { revision: 1, short_name: "Тестовый вуз", full_name: "Тестовый университет", logo_url: "", favicon_url: "", accent_color: "#4b4bd2" })
    return
  }
  if (req.headers.authorization !== `Bearer ${token}`) {
    reply(401, { detail: "Unauthenticated" })
    return
  }
  const fixtures = {
    "/api/v1/university": { profile: "custom", short_name: "Тестовый вуз", full_name: "Тестовый университет", assistant_name: "Помощник", logo_url: "", website: "", email: "", phone: "", address: "" },
    "/api/v1/auth/me": { id: 1, username: "e2e-admin", role: "superadmin", is_active: true },
    "/api/v1/rag/docs": { documents: [{ id: "e2e-document", title: "Локальный тестовый источник", status: "indexed", lightrag_status: "processed", url: "https://example.invalid/admissions", chunks_count: 3, created_at: "2026-10-01T00:00:00Z" }], total: 1, total_all: 1, has_pending: false },
    "/api/v1/rag/docs/e2e-document/diagnostics": { id: "e2e-document", postgres_status: "indexed", lightrag_status: "processed", chunks_count: 3, entities_count: 0, relations_count: 0 },
    "/api/v1/feedback": { reports: [], total: 0 },
    "/api/v1/topics/": { topics: [] },
    "/api/v1/faq/": { items: [], total: 0 },
    "/api/v1/faq": { items: [], total: 0 },
  }
  const pathname = new URL(req.url, "http://127.0.0.1:9465").pathname
  if (req.method === "GET" && Object.hasOwn(fixtures, pathname)) {
    reply(200, fixtures[pathname])
    return
  }
  reply(501, { detail: `Unimplemented test endpoint: ${req.method} ${req.url}` })
})
server.listen(9465, "127.0.0.1")
