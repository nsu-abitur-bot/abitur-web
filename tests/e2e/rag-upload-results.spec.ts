import { Buffer } from "node:buffer"
import { mkdir } from "node:fs/promises"

import { expect, test } from "@playwright/test"

for (const mobile of [false, true]) {
  for (const outcome of ["full-success", "partial", "all-skipped", "failure"] as const) {
    test(`upload results ${outcome} ${mobile ? "mobile" : "desktop"}`, async ({ page, context }, testInfo) => {
      await page.setViewportSize(mobile ? { width: 390, height: 844 } : { width: 1440, height: 1000 })
      await context.addCookies([{ name: "abitur-token", value: "e2e-session", domain: "127.0.0.1", path: "/" }])
      let releaseUpload: () => void = () => {}
      const uploadGate = new Promise<void>((resolve) => {
        releaseUpload = resolve
      })
      let uploads = 0
      let documentReads = 0
      await context.route("**/api/v1/**", async (route) => {
        const path = new URL(route.request().url()).pathname
        const headers = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "*", "Access-Control-Allow-Methods": "*" }
        if (route.request().method() === "OPTIONS") {
          return route.fulfill({ status: 204, headers })
        }
        if (path === "/api/v1/rag/upload") {
          uploads++
          if (outcome === "full-success") {
            await uploadGate
          }
          if (outcome === "failure" && uploads === 1) {
            return route.fulfill({ status: 500, headers, json: { detail: "Upload unavailable" } })
          }
          const results = ["first.txt", "second.txt"].map((filename, index) => {
            const skipped = outcome === "all-skipped" || (outcome === "partial" && index === 1)
            return { filename, status: skipped ? "skipped" : "indexed", message: skipped ? "Duplicate document" : "Document indexed", chars: skipped ? 0 : 12 }
          })
          return route.fulfill({ headers, json: { accepted_formats: [".txt"], indexed_count: results.filter(r => r.status === "indexed").length, skipped_count: results.filter(r => r.status === "skipped").length, results } })
        }
        if (path === "/api/v1/rag/docs") {
          documentReads++
        }
        const fixtures: Record<string, unknown> = {
          "/api/v1/auth/me": { id: 1, username: "e2e-admin", role: "superadmin", is_active: true },
          "/api/v1/university": { profile: "custom", short_name: "Тестовый вуз", full_name: "Тестовый университет", assistant_name: "Помощник" },
          "/api/v1/rag/docs": { documents: [] },
        }
        return route.fulfill({ headers, json: fixtures[path] ?? {} })
      })
      await page.goto("/")
      await page.getByRole("button", { name: "Добавить материал", exact: true }).click()
      const dialog = page.getByRole("dialog", { name: "Добавить материал", exact: true })
      const before = documentReads
      const files = ["first.txt", "second.txt"].map(name => ({ name, mimeType: "text/plain", buffer: Buffer.from("Document text") }))
      if (outcome === "partial") {
        files.push({ name: "rejected.exe", mimeType: "application/octet-stream", buffer: Buffer.from("invalid") })
      }
      await dialog.locator("input[type=file][multiple]").setInputFiles(files)
      await expect.poll(() => uploads).toBe(1)
      if (outcome === "full-success") {
        await page.keyboard.press("Escape")
        await expect(dialog).toHaveCount(0)
        await page.getByRole("button", { name: "Добавить материал", exact: true }).click()
        await expect(dialog.getByRole("button", { name: "Загрузить файлы", exact: true })).toBeDisabled()
        await page.keyboard.press("Escape")
        await expect(dialog).toHaveCount(0)
        releaseUpload()
        await expect.poll(() => documentReads).toBeGreaterThan(before)
        await page.getByRole("button", { name: "Добавить материал", exact: true }).click()
      }
      await expect(dialog).toContainText("first.txt:")
      await expect(dialog).toContainText("second.txt:")
      if (outcome === "failure") {
        await expect(dialog).toContainText("first.txt: Не удалось загрузить файл")
        await expect(dialog).toContainText("second.txt: Не удалось загрузить файл")
      } else {
        await expect(dialog).toContainText(outcome === "all-skipped" ? "Duplicate document" : "Document indexed")
        await expect.poll(() => documentReads).toBeGreaterThan(before)
      }
      if (outcome === "all-skipped") {
        await expect(dialog).not.toContainText("Загружен.")
      }
      if (outcome === "partial") {
        await expect(dialog).toContainText("rejected.exe:")
        await expect(dialog).toContainText("Duplicate document")
      }
      await dialog.getByRole("button", { name: "Загрузить файлы", exact: true }).scrollIntoViewIfNeeded()
      await expect(dialog.getByRole("button", { name: "Загрузить файлы", exact: true })).toBeEnabled()
      await expect(dialog.getByRole("button", { name: "Загрузить файлы", exact: true })).toBeInViewport()
      await mkdir("/tmp/abitur-dialogs-36", { recursive: true })
      await page.screenshot({ path: `/tmp/abitur-dialogs-36/upload-${outcome}-${mobile ? "mobile" : "desktop"}.png` })
      await testInfo.attach("Upload results", { path: `/tmp/abitur-dialogs-36/upload-${outcome}-${mobile ? "mobile" : "desktop"}.png`, contentType: "image/png" })
      if (outcome === "failure") {
        await dialog.locator("input[type=file][multiple]").setInputFiles(files)
        await expect(dialog).toContainText("Document indexed")
        expect(uploads).toBe(2)
      }
      await page.keyboard.press("Escape")
      await expect(dialog).toBeHidden()
      const trigger = page.getByRole("button", { name: "Добавить материал", exact: true })
      await expect(trigger).toBeFocused()
      await trigger.click()
      await expect(dialog).toContainText(outcome === "all-skipped" ? "Duplicate document" : "Document indexed")
      expect(uploads).toBe(outcome === "failure" ? 2 : 1)
    })
  }
}
