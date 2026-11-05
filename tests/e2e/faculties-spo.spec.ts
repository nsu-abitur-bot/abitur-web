import { expect, test } from "@playwright/test"

import type { components } from "../../types/openapi"

type ProgramItem = components["schemas"]["ProgramItem"]

test("creates, edits and reopens a college program with the СПО level", async ({ page, context }, testInfo) => {
  await context.addCookies([{ name: "abitur-token", value: "e2e-session", domain: "127.0.0.1", path: "/" }])
  const programs: ProgramItem[] = []
  const writes: unknown[] = []
  await context.route("**/api/v1/**", async (route) => {
    const request = route.request()
    const path = new URL(request.url()).pathname
    const headers = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "*", "Access-Control-Allow-Methods": "*" }
    if (request.method() === "OPTIONS") {
      return route.fulfill({ status: 204, headers })
    }
    if (path === "/api/v1/faculties/college/programs" && request.method() === "POST") {
      const incoming = request.postDataJSON()
      writes.push(incoming)
      const program = { id: "college-program", faculty_id: "college", ...incoming }
      programs.push(program)
      return route.fulfill({ status: 201, headers, json: program })
    }
    if (path === "/api/v1/faculties/programs/college-program" && request.method() === "PUT") {
      const incoming = request.postDataJSON()
      writes.push(incoming)
      Object.assign(programs[0]!, incoming)
      return route.fulfill({ headers, json: programs[0] })
    }
    const fixtures: Record<string, unknown> = {
      "/api/v1/auth/me": { id: 1, username: "e2e-admin", role: "superadmin", is_active: true },
      "/api/v1/university": { profile: "custom", short_name: "Тестовый вуз", full_name: "Тестовый университет", assistant_name: "Помощник" },
      "/api/v1/faculties": [{ id: "college", name: "Колледж университета", aliases: [], is_active: true, programs }],
    }
    return route.fulfill({ headers, json: fixtures[path] ?? {} })
  })

  await page.goto("/faculties")
  await page.getByRole("button", { name: "Добавить направление", exact: true }).click()
  const dialog = page.getByRole("dialog")
  await dialog.getByRole("textbox", { name: "Название", exact: false }).fill("Информационные системы и программирование")
  await dialog.getByRole("textbox", { name: "Код", exact: true }).fill("09.02.07")
  await dialog.getByRole("combobox", { name: "Уровень", exact: true }).click()
  await page.getByRole("option", { name: "СПО", exact: true }).click()
  await dialog.getByRole("button", { name: "Добавить", exact: true }).click()
  await expect(dialog).toBeHidden()
  expect(writes[0]).toMatchObject({ level: "spo", code: "09.02.07" })
  await expect(page.getByText("СПО", { exact: true })).toBeVisible()

  await page.reload()
  await expect(page.getByText("СПО", { exact: true })).toBeVisible()
  await page.getByRole("button", { name: "Редактировать", exact: true }).last().click()
  await expect(dialog.getByRole("combobox", { name: "Уровень", exact: true })).toHaveText("СПО")
  await dialog.getByRole("textbox", { name: "Название", exact: false }).fill("Программирование в компьютерных системах")
  await dialog.getByRole("button", { name: "Сохранить", exact: true }).click()
  await expect(dialog).toBeHidden()
  expect(writes[1]).toMatchObject({ level: "spo", name: "Программирование в компьютерных системах" })

  await page.reload()
  await expect(page.getByText("Программирование в компьютерных системах", { exact: true })).toBeVisible()
  await expect(page.getByText("СПО", { exact: true })).toBeVisible()
  await page.getByRole("button", { name: "Редактировать", exact: true }).last().click()
  await expect(dialog.getByRole("combobox", { name: "Уровень", exact: true })).toHaveText("СПО")
  await expect(dialog.getByRole("textbox", { name: "Код", exact: true })).toHaveValue("09.02.07")
  await page.screenshot({ path: testInfo.outputPath("spo-edit.png") })
  await testInfo.attach("СПО при повторном открытии", { path: testInfo.outputPath("spo-edit.png"), contentType: "image/png" })
})
