import type { BrowserContext, Page } from "@playwright/test"
import { expect, test } from "@playwright/test"

const faculty = { id: "score-faculty", name: "Тестовый факультет", aliases: [], programs: [{ id: "score-program", faculty_id: "score-faculty", name: "Тестовая программа", code: "09.03.01", level: "bachelor", aliases: [] }] }
const row = { faculty_name: faculty.name, program_name: faculty.programs[0]!.name, code: "09.03.01", year: 2025, form: "budget", passing_score: 250, average_score: 88.5 }

async function setup(context: BrowserContext, page: Page, existing = false) {
  let rows = existing ? [{ ...row }] : []
  const imports: Record<string, unknown>[] = []
  await context.route("**/api/v1/faculties", route => route.fulfill({ json: [faculty] }))
  await context.route("**/api/v1/admission-scores", route => route.fulfill({ json: rows }))
  await context.route("**/api/v1/admission-scores/import", (route) => {
    const incoming = route.request().postDataJSON().rows[0]
    imports.push(incoming)
    rows = [{ ...row, ...incoming, average_score: incoming.average_score ?? rows[0]?.average_score ?? null }]
    return route.fulfill({ json: { created: existing ? 0 : 1, updated: existing ? 1 : 0, skipped: 0 } })
  })
  await page.goto("/login")
  await page.getByLabel("Логин", { exact: false }).fill("e2e-admin")
  await page.getByLabel("Пароль", { exact: false }).fill("local-test-password")
  await page.getByRole("button", { name: "Войти", exact: true }).click()
  await expect(page).toHaveURL("http://127.0.0.1:9464/")
  await page.goto("/admission-scores")
  return imports
}

async function selectProgram(page: Page) {
  await page.getByRole("combobox", { name: "Факультет", exact: false }).click()
  await page.getByRole("option", { name: faculty.name, exact: true }).click()
  await page.getByRole("combobox", { name: "Направление", exact: false }).click()
  await page.getByRole("option", { name: "Тестовая программа (Бакалавриат)", exact: true }).click()
  await page.getByLabel("Год приёма", { exact: false }).fill("2025")
  await page.getByLabel("Проходной балл", { exact: true }).fill("250")
}

for (const average of [null, 88.5]) {
  test(`saves a historical score with average ${average}`, async ({ page, context }) => {
    const imports = await setup(context, page)
    await selectProgram(page)
    if (average !== null) {
      await page.getByLabel("Средний балл", { exact: true }).fill(String(average))
    }
    await page.getByRole("button", { name: "Сохранить балл", exact: true }).click()
    await expect.poll(() => imports.length).toBe(1)
    expect(imports[0]).toMatchObject({ year: 2025, passing_score: 250, average_score: average })
    await expect(page.getByText("Балл добавлен", { exact: true })).toBeVisible()
  })
}

for (const edit of [true, false]) {
  test(`does not claim to clear an existing average via ${edit ? "edit" : "same-key entry"}`, async ({ page, context }) => {
    const imports = await setup(context, page, true)
    if (edit) {
      await page.getByRole("button", { name: "Изменить", exact: true }).click()
      await page.getByLabel("Средний балл", { exact: true }).fill("")
    } else {
      await selectProgram(page)
    }
    await page.getByRole("button", { name: "Сохранить балл", exact: true }).click()
    await expect(page.getByText("Укажите средний балл", { exact: true })).toBeVisible()
    expect(imports).toHaveLength(0)
    await page.getByLabel("Средний балл", { exact: true }).fill("89.5")
    await page.getByRole("button", { name: "Сохранить балл", exact: true }).click()
    await expect.poll(() => imports.length).toBe(1)
    expect(imports[0]!.average_score).toBe(89.5)
    await expect(page.getByText("Балл обновлён", { exact: true })).toBeVisible()
  })
}
