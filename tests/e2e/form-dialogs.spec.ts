import { mkdir } from "node:fs/promises"

import { expect, test } from "@playwright/test"

for (const width of [1399, 1049, 390]) {
  const mobile = width === 390
  for (const colorScheme of ["light", "dark"] as const) {
    test(`form dialogs ${width}px ${colorScheme}`, async ({ page, context }, testInfo) => {
      await page.setViewportSize({ width, height: 844 })
      await page.emulateMedia({ colorScheme })
      await context.addCookies([{ name: "abitur-token", value: "e2e-session", domain: "127.0.0.1", path: "/" }])
      let writes = 0
      let fail = false
      await context.route("**/api/v1/**", async (route) => {
        const path = new URL(route.request().url()).pathname
        const method = route.request().method()
        const headers = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "*", "Access-Control-Allow-Methods": "*" }
        if (method === "OPTIONS") {
          return route.fulfill({ status: 204, headers })
        }
        if (["POST", "PUT"].includes(method)) {
          writes++
          await new Promise(resolve => setTimeout(resolve, 250))
          return route.fulfill({ headers, status: fail ? 500 : 200, json: { id: "new", ...route.request().postDataJSON() } })
        }
        const fixtures: Record<string, unknown> = {
          "/api/v1/auth/me": { id: 1, username: "e2e-admin", role: "superadmin", is_active: true },
          "/api/v1/university": { profile: "custom", short_name: "Тестовый вуз", full_name: "Тестовый университет", assistant_name: "Помощник" },
          "/api/v1/faq": { items: Array.from({ length: 12 }, (_, i) => ({ id: String(i), question: `Вопрос о поступлении ${i}`, answer: "Подробный ответ о документах. ".repeat(30), aliases: ["Документы", "Приём"] })), total: 12 },
          "/api/v1/abbrev": { items: [{ id: "1", short: "ФИТ", full: "Факультет информационных технологий" }], total: 1 },
          "/api/v1/auth/admins": [{ id: 1, username: "e2e-admin", role: "superadmin", is_active: true }],
          "/api/v1/settings/instance": { revision: 1, encryption_ready: true, settings: [] },
          "/api/v1/topics/": { topics: [{ id: 1, label: "Поступление", description: "Сроки и документы", is_active: true }] },
          "/api/v1/rag/docs": { documents: [{ id: "doc", title: "Правила приёма", url: "https://example.invalid/rules", chunks_count: 4 }] },
          "/api/v1/faculties": [{ id: "1", name: "Факультет информационных технологий", aliases: ["ФИТ"], is_active: true, programs: [{ id: "2", name: "Программная инженерия", code: "09.03.04", level: "bachelor", is_active: true }] }],
        }
        return route.fulfill({ headers, json: fixtures[path] ?? {} })
      })
      await page.goto("/faq")
      const trigger = page.getByRole("button", { name: "Добавить вопрос", exact: true })
      await trigger.click()
      const dialog = page.getByRole("dialog")
      await expect(dialog).toBeVisible()
      await expect(dialog).toContainText("Новый вопрос")
      expect(await dialog.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true)
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width)
      if (mobile) {
        const box = (await dialog.boundingBox())!
        expect(box.x).toBeGreaterThanOrEqual(12)
        expect(box.width).toBeLessThanOrEqual(366)
        expect(box.height).toBeLessThanOrEqual(820)
        expect(Math.abs(box.y + box.height / 2 - 422)).toBeLessThan(2)
      }
      await page.keyboard.press("Shift+Tab")
      await expect.poll(() => dialog.evaluate(el => el.contains(document.activeElement))).toBe(true)
      await expect.poll(() => dialog.evaluate(el => el.contains(document.activeElement))).toBe(true)
      await page.keyboard.press("Escape")
      await expect(dialog).toBeHidden()
      await expect(trigger).toBeFocused()
      await trigger.click()
      await dialog.getByRole("button", { name: "Создать", exact: true }).click()
      expect(writes).toBe(0)
      await dialog.getByRole("textbox").nth(0).fill("Как подать документы?")
      await dialog.getByRole("textbox").last().fill("Ответ о поступлении. ".repeat(100))
      await mkdir("/tmp/abitur-dialogs-36", { recursive: true })
      await page.screenshot({ path: `/tmp/abitur-dialogs-36/faq-${width}-${colorScheme}.png` })
      await testInfo.attach("FAQ", { path: `/tmp/abitur-dialogs-36/faq-${width}-${colorScheme}.png`, contentType: "image/png" })
      fail = true
      await dialog.getByRole("button", { name: "Создать", exact: true }).click()
      await expect(page.getByText("Произошла ошибка при сохранении", { exact: true })).toBeVisible()
      await expect(dialog).toBeVisible()
      fail = false
      const before = writes
      await dialog.getByRole("button", { name: "Создать", exact: true }).click()
      await page.keyboard.press("Enter")
      await expect(dialog).toBeHidden()
      expect(writes - before).toBe(1)
      await page.getByRole("button", { name: "Редактировать", exact: true }).first().click()
      await expect(dialog).toContainText("Редактирование вопроса")
      await expect(dialog.getByRole("textbox").first()).toHaveValue("Вопрос о поступлении 0")
      await page.keyboard.press("Escape")
      await page.goto("/faculties")
      await page.getByRole("button", { name: "Добавить факультет", exact: true }).click()
      await expect(dialog).toContainText("Новый факультет")
      await page.keyboard.press("Escape")
      await page.getByRole("button", { name: "Редактировать", exact: true }).first().click()
      await expect(dialog).toContainText("Редактирование факультета")
      await page.keyboard.press("Escape")
      await page.getByRole("button", { name: "Добавить направление", exact: true }).click()
      await expect(dialog).toContainText("Новое направление")
      await dialog.getByRole("textbox").first().fill("Прикладная информатика")
      await dialog.getByRole("button", { name: "Добавить", exact: true }).click()
      await expect(dialog).toBeHidden()
      await page.goto("/abbrev")
      await page.getByRole("button", { name: "Добавить аббревиатуру", exact: true }).click()
      await expect(dialog).toContainText("Новая аббревиатура")
      await page.keyboard.press("Escape")
      await page.getByRole("button", { name: "Редактировать", exact: true }).first().click()
      await expect(dialog).toContainText("Редактирование аббревиатуры")
      await page.keyboard.press("Escape")
      await page.goto("/settings?section=topics")
      await page.getByRole("button", { name: "Добавить тему", exact: true }).click()
      await expect(dialog).toContainText("Новая тема")
      await page.keyboard.press("Escape")
      await page.getByRole("button", { name: "Редактировать тему Поступление" }).click()
      await expect(dialog).toContainText("Редактирование темы")
      fail = true
      await dialog.getByRole("button", { name: "Сохранить", exact: true }).click()
      await expect(page.getByText("Не удалось обновить тему", { exact: true })).toBeVisible()
      await expect(dialog).toBeVisible()
      fail = false
      await dialog.getByRole("button", { name: "Сохранить", exact: true }).click()
      await expect(dialog).toBeHidden()
      await page.goto("/settings?section=team")
      await page.getByRole("button", { name: "Создать приглашение", exact: true }).click()
      await expect(dialog).toContainText("Новое приглашение")
      await page.keyboard.press("Escape")
      await page.goto("/")
      await page.getByRole("button", { name: "Добавить материал", exact: true }).click()
      await expect(dialog).toContainText("Добавить материал")
      await dialog.getByRole("button", { name: "Добавить текст вручную" }).click()
      const manual = page.getByRole("dialog", { name: "Новый документ", exact: true })
      await expect(manual).toContainText("Новый документ")
      await manual.getByRole("textbox").first().fill("Правила приёма")
      await manual.getByRole("textbox").last().fill("Документы для поступления. ".repeat(100))
      await manual.getByRole("button", { name: "Добавить в базу знаний" }).scrollIntoViewIfNeeded()
      await expect(manual.getByRole("button", { name: "Добавить в базу знаний" })).toBeInViewport()
      await page.screenshot({ path: `/tmp/abitur-dialogs-36/document-${width}-${colorScheme}.png` })
      if (mobile) {
        await page.setViewportSize({ width: 390, height: 440 })
        await manual.getByRole("textbox").last().focus()
        await expect(manual.getByRole("button", { name: "Добавить в базу знаний" })).toBeInViewport()
        expect(await manual.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true)
        await page.setViewportSize({ width: 390, height: 844 })
      }
      await testInfo.attach("Document", { path: `/tmp/abitur-dialogs-36/document-${width}-${colorScheme}.png`, contentType: "image/png" })
      await page.keyboard.press("Escape")
      await expect(manual).toBeHidden()
      await page.keyboard.press("Escape")
      await expect(dialog).toBeHidden()
      await page.getByRole("button", { name: "Действия: Правила приёма" }).click()
      await page.getByRole("menuitem", { name: "Редактировать", exact: true }).click()
      await expect(dialog).toContainText("Редактирование документа")
      await dialog.getByRole("textbox").first().fill("Обновлённые правила")
      await dialog.getByRole("button", { name: "Сохранить", exact: true }).click()
      await expect(dialog).toBeHidden()
    })
  }
}
