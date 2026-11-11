import { mkdir } from "node:fs/promises"
import process from "node:process"

import { expect, test } from "@playwright/test"

import instance from "./fixtures/instance-settings.json" with { type: "json" }

for (const width of [1399, 1049, 390]) {
  for (const theme of ["light", "dark"]) {
    test(`complex forms ${width} ${theme}`, async ({ page, context }) => {
      await page.setViewportSize({ width, height: 844 })
      await context.addInitScript(theme => localStorage.setItem("nuxt-color-mode", theme), theme)
      await context.addCookies([{ name: "abitur-token", value: "e2e-session", domain: "127.0.0.1", path: "/" }])
      const writes: string[] = []
      await context.route("**/api/v1/**", (route) => {
        const path = new URL(route.request().url()).pathname
        const method = route.request().method()
        const headers = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "*", "Access-Control-Allow-Methods": "*" }
        if (method === "OPTIONS") {
          return route.fulfill({ status: 204, headers })
        }
        if (method !== "GET") {
          writes.push(path)
          return route.fulfill({ status: 422, headers, json: { detail: "Локальная проверка валидации" } })
        }
        const fixtures: Record<string, unknown> = {
          "/api/v1/auth/me": { id: 1, username: "e2e-admin", role: "superadmin", is_active: true },
          "/api/v1/university": { profile: "custom", short_name: "Тестовый вуз", full_name: "Тестовый университет", assistant_name: "Помощник" },
          "/api/v1/settings/instance": instance,
          "/api/v1/settings/crag": { enabled: true, relevance_threshold: 0.5, min_chunks: 2, allow_refine: true, use_faculty_table: true, max_graded_chunks: 12 },
          "/api/v1/settings/faq": { similarity_threshold: 0.95 },
          "/api/v1/settings/rate-limit": { system_requests_per_day: 10000, user_requests_per_day: 100 },
          "/api/v1/topics/": { topics: [] },
        }
        return route.fulfill({ headers, json: fixtures[path] ?? {} })
      })
      const directory = `/tmp/abitur-forms-51/${process.env.FORMS_EVIDENCE ?? "after"}`
      await mkdir(directory, { recursive: true })
      await page.goto("/settings?section=connections")
      await expect(page.locator(".instance-workspace")).toBeVisible()
      await page.screenshot({ path: `${directory}/connections-${width}-${theme}.png`, fullPage: true })
      const editor = page.getByRole("region", { name: "Настройки подключений" })
      // Baseline runs collect evidence before the new section hierarchy exists.
      if (process.env.FORMS_EVIDENCE !== "before") {
        await editor.getByRole("button", { name: "Модели", exact: true }).click()
        for (const key of ["LLM_PROVIDER", "FAQ_EMBEDDING_PROVIDER", "LIGHTRAG_LLM_PROVIDER", "LIGHTRAG_EMBEDDING_PROVIDER", "PDF_PARSER_PROVIDER"]) {
          await expect(page.locator(`#instance-${key}`)).toBeVisible()
        }
        await page.locator("#instance-LLM_PROVIDER").click()
        await expect(page.getByRole("listbox")).toBeVisible()
        await page.screenshot({ path: `${directory}/provider-menu-${width}-${theme}.png`, fullPage: true, animations: "disabled" })
        await page.keyboard.press("Escape")
        const provider = editor.locator("summary").filter({ hasText: "OpenAI" })
        await provider.focus()
        await page.keyboard.press("Enter")
        await expect(page.locator("#instance-OPENAI_API_KEY")).toHaveAttribute("type", "password")
        await page.locator("#instance-OPENAI_API_KEY").fill("local-fixture-draft")
        await expect(page.locator("#instance-OPENAI_BASE_URL")).toBeHidden()
        await editor.locator("details[open]").getByText("Дополнительно", { exact: true }).click()
        await expect(page.locator("#instance-OPENAI_BASE_URL")).toBeVisible()
        await page.locator("#instance-OPENAI_API_KEY").blur()
        await page.evaluate(() => window.scrollTo(0, 0))
        await page.screenshot({ path: `${directory}/models-${width}-${theme}.png`, fullPage: true })
        await editor.getByRole("button", { name: "Боты", exact: true }).click()
        await expect(page.locator("#instance-BOT_TOKEN")).toBeVisible()
        await expect(page.locator("#instance-MAX_BOT_TOKEN")).toBeVisible()
        const enabled = page.locator("#instance-TELEGRAM_ENABLED")
        await expect(enabled).toContainText("Выключено")
        await enabled.click()
        await page.getByRole("option", { name: "Включено", exact: true }).click()
        await expect(enabled).toContainText("Включено")
        await enabled.click()
        await page.getByRole("option", { name: "Выключено", exact: true }).click()
        await expect(page.getByRole("listbox")).toBeHidden()
        await page.evaluate(() => window.scrollTo(0, 0))
        await page.screenshot({ path: `${directory}/bots-${width}-${theme}.png`, fullPage: true })
        await editor.getByRole("button", { name: "Дополнительно", exact: true }).click()
        await expect(page.locator("#instance-RATING_POLL_MIN_SECONDS")).toBeHidden()
        const lists = editor.locator("summary").filter({ hasText: "Конкурсные списки" })
        await lists.focus()
        await page.keyboard.press("Enter")
        await expect(page.locator("#instance-RATING_POLL_MIN_SECONDS")).toBeVisible()
        await page.evaluate(() => window.scrollTo(0, 0))
        await page.screenshot({ path: `${directory}/advanced-${width}-${theme}.png`, fullPage: true })
        await editor.getByRole("button", { name: "Оформление", exact: true }).click()
        await page.evaluate(() => window.scrollTo(0, 0))
        await page.screenshot({ path: `${directory}/branding-${width}-${theme}.png`, fullPage: true })
        await editor.getByRole("button", { name: "Модели", exact: true }).click()
        await expect(page.locator("#instance-OPENAI_API_KEY")).toHaveValue("local-fixture-draft")
        expect(writes).toEqual([])
        await page.getByRole("button", { name: /Сохранить изменения/ }).click()
        await expect(page.getByRole("alert")).toContainText("Локальная проверка валидации")
        await expect(page.locator("#instance-OPENAI_API_KEY")).toHaveValue("local-fixture-draft")
        await page.getByRole("button", { name: "Отменить правки", exact: true }).click()
        await page.getByRole("dialog").getByRole("button", { name: "Отменить правки", exact: true }).click()
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width)
      await page.setViewportSize({ width, height: 440 })
      await page.getByRole("button", { name: /Сохранить изменения/ }).scrollIntoViewIfNeeded()
      await expect(page.getByRole("button", { name: /Сохранить изменения/ })).toBeInViewport()
      await page.screenshot({ path: `${directory}/short-${width}-${theme}.png` })
      await page.goto("/settings?section=rules")
      await page.setViewportSize({ width, height: 844 })
      await expect(page.getByRole("heading", { name: "Проверка ответов", exact: true })).toBeVisible()
      await page.screenshot({ path: `${directory}/rules-${width}-${theme}.png`, fullPage: true })
      await page.getByText("Параметры отбора", { exact: true }).click()
      await expect(page.getByRole("spinbutton", { name: "Строгость отбора" })).toHaveValue("0.5")
      expect(writes).toHaveLength(process.env.FORMS_EVIDENCE === "before" ? 0 : 1)
    })
  }
}
