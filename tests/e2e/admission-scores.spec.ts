import type { BrowserContext, Locator, Page } from "@playwright/test"
import { expect, test } from "@playwright/test"

import type { components } from "../../types/openapi"

type AdmissionBasis = components["schemas"]["AdmissionBasis"]
type ScoreItem = components["schemas"]["ScoreItem"]
type ScoreUpdate = components["schemas"]["ScoreUpdate"]

const program = { id: "score-program", name: "Информатика и вычислительная техника", code: "09.03.01", level: "bachelor" }
const otherProgram = { ...program, id: "other-program", name: "Программная инженерия" }
const faculty = { id: "score-faculty", name: "Факультет информационных технологий", aliases: [], programs: [program, otherProgram].map(item => ({ ...item, faculty_id: "score-faculty", aliases: [] })) }
const source = "https://www.nsu.ru/education/what-to-enroll/"
const legacy: ScoreItem = {
  id: "legacy-score",
  faculty_name: faculty.name,
  program_name: program.name,
  code: program.code,
  level: "bachelor",
  year: 2025,
  form: "budget",
  admission_basis: "budget",
  study_form: null,
  passing_score: 250,
  average_score: 88.5,
  seat_count: null,
  source_url: null,
}

type ImportRow = Omit<ScoreItem, "id" | "form" | "level"> & { form?: string, level?: ScoreItem["level"] }

async function setup(context: BrowserContext, page: Page, initial: ScoreItem[] = [], options: { nsu?: boolean, preview?: (ImportRow | Omit<ImportRow, "admission_basis">)[] } = {}) {
  const rows = initial.map(row => ({ ...row }))
  const imports: ImportRow[] = []
  const patches: ScoreUpdate[] = []
  const previews: { url: string | null }[] = []
  await context.route("**/api/v1/university", route => route.fulfill({ json: { profile: options.nsu ? "nsu" : "custom", short_name: "НГУ", assistant_name: "Помощник" } }))
  await context.route("**/api/v1/faculties", route => route.fulfill({ json: [faculty] }))
  await context.route("**/api/v1/admission-scores", route => route.fulfill({ json: rows }))
  await context.route("**/api/v1/admission-scores/preview", (route) => {
    previews.push(route.request().postDataJSON())
    const list = options.preview ?? []
    return route.fulfill({ json: { rows: list, summary: { total: list.length, matched: list.length, unmatched: 0 } } })
  })
  await context.route("**/api/v1/admission-scores/import", (route) => {
    const incoming: ImportRow[] = route.request().postDataJSON().rows
    let created = 0
    let updated = 0
    for (const row of incoming) {
      imports.push(row)
      const basis = row.admission_basis ?? row.form
      const same = rows.find(item => item.faculty_name === row.faculty_name && item.program_name === row.program_name && item.level === row.level && item.year === row.year && item.admission_basis === basis && (item.study_form ?? null) === (row.study_form ?? null))
      if (same) {
        for (const field of ["passing_score", "average_score", "seat_count", "source_url"] as const) {
          if (row[field] != null) {
            Object.assign(same, { [field]: row[field] })
          }
        }
        updated++
      } else {
        rows.push({ ...row, id: `new-${rows.length}`, admission_basis: basis!, form: basis!, level: row.level ?? "bachelor" })
        created++
      }
    }
    return route.fulfill({ json: { created, updated, skipped: 0 } })
  })
  await context.route("**/api/v1/admission-scores/*", (route, request) => {
    if (request.method() !== "PATCH") {
      return route.fallback()
    }
    const changes: ScoreUpdate = request.postDataJSON()
    patches.push(changes)
    const id = new URL(request.url()).pathname.split("/").at(-1)
    const row = rows.find(item => item.id === id)!
    const next = { ...row, ...changes, form: changes.admission_basis ?? row.form }
    const duplicate = rows.some(item => item.id !== id && item.program_name === next.program_name && item.year === next.year && item.study_form === next.study_form && item.admission_basis === next.admission_basis)
    if (duplicate) {
      return route.fulfill({ status: 409, json: { detail: "Для этой формы обучения и основания приёма уже есть запись" } })
    }
    Object.assign(row, next)
    return route.fulfill({ json: row })
  })
  await page.goto("/login")
  await page.getByLabel("Логин").fill("e2e-admin")
  await page.getByLabel("Пароль").fill("local-test-password")
  await page.getByRole("button", { name: "Войти", exact: true }).click()
  await expect(page).toHaveURL("/")
  await page.goto("/admission-scores")
  return { imports, patches, previews }
}

function entryForm(page: Page) {
  return page.locator("form").filter({ has: page.getByRole("button", { name: "Сохранить запись" }) })
}

async function selectOption(scope: Locator, label: string, option: string) {
  await scope.getByRole("combobox", { name: label }).click()
  await scope.page().getByRole("option", { name: option, exact: true }).click()
}

async function selectProgram(page: Page, name = program.name, year = 2025) {
  const form = entryForm(page)
  await selectOption(form, "Факультет", faculty.name)
  await selectOption(form, "Направление", `${name} (Бакалавриат)`)
  await form.getByLabel("Год приёма").fill(String(year))
  return form
}

for (const average of [null, 88.5]) {
  test(`saves a historical score with average ${average}`, async ({ page, context }) => {
    const { imports } = await setup(context, page)
    const form = await selectProgram(page)
    await form.getByLabel("Проходной балл", { exact: true }).fill("250")
    if (average !== null) {
      await form.getByLabel("Средний балл", { exact: true }).fill(String(average))
    }
    await form.getByRole("button", { name: "Сохранить запись" }).click()
    await expect.poll(() => imports.length).toBe(1)
    expect(imports[0]).toMatchObject({ year: 2025, passing_score: 250, average_score: average, admission_basis: "budget", study_form: null })
    await expect(page.getByText("Запись добавлена", { exact: true })).toBeVisible()
  })
}

for (const edit of [true, false]) {
  test(`preserves existing average score on blank ${edit ? "edit" : "same-key entry"}`, async ({ page, context }) => {
    const { imports } = await setup(context, page, [legacy])
    const form = entryForm(page)
    if (edit) {
      await page.getByRole("button", { name: "Изменить баллы" }).click()
    } else {
      await selectProgram(page)
      await form.getByLabel("Проходной балл", { exact: true }).fill("250")
    }
    await form.getByLabel("Средний балл", { exact: true }).fill("")
    await form.getByRole("button", { name: "Сохранить запись" }).click()
    await expect(page.getByText("Укажите средний балл", { exact: true })).toBeVisible()
    expect(imports).toHaveLength(0)
    await form.getByLabel("Средний балл", { exact: true }).fill("89.5")
    await form.getByRole("button", { name: "Сохранить запись" }).click()
    await expect.poll(() => imports.length).toBe(1)
    expect(imports[0]?.average_score).toBe(89.5)
    await expect(page.getByText("Запись обновлена", { exact: true })).toBeVisible()
  })
}

test("keeps all four combinations separate and filters program, year, study form and basis independently", async ({ page, context }, testInfo) => {
  const { imports } = await setup(context, page, [
    legacy,
    { ...legacy, id: "other-year", year: 2024, study_form: "full_time", seat_count: 17 },
    { ...legacy, id: "other-program", program_name: otherProgram.name, study_form: "full_time", seat_count: 12 },
  ])
  const form = await selectProgram(page)

  const combinations = [
    { studyForm: "Очная", basis: "Бюджет", seat: 0 },
    { studyForm: "Очная", basis: "Платное", seat: 45 },
    { studyForm: "Заочная", basis: "Бюджет", seat: 10 },
    { studyForm: "Заочная", basis: "Платное", seat: 20 },
  ]
  for (const [index, { studyForm, basis, seat }] of combinations.entries()) {
    await selectOption(form, "Форма обучения", studyForm)
    await selectOption(form, "Основание приёма", basis)
    await form.getByLabel("Объявленные места", { exact: true }).fill(String(seat))
    if (seat === 0) {
      await form.getByLabel("Источник", { exact: true }).fill(source)
    }
    await form.getByRole("button", { name: "Сохранить запись" }).click()
    await expect.poll(() => imports.length).toBe(index + 1)
    await expect(form.getByLabel("Объявленные места", { exact: true })).toHaveValue("")
  }
  expect(imports.map(row => [row.study_form, row.admission_basis, row.seat_count, row.passing_score, row.average_score])).toEqual([
    ["full_time", "budget", 0, null, null],
    ["full_time", "paid", 45, null, null],
    ["correspondence", "budget", 10, null, null],
    ["correspondence", "paid", 20, null, null],
  ])
  const filters = page.getByRole("group", { name: "Фильтры записей" })
  const records = page.getByRole("table").locator("tbody").getByRole("row")
  await expect(records).toHaveCount(7)
  await selectOption(filters, "Год приёма", "2025")
  await expect(records).toHaveCount(6)
  await selectOption(filters, "Направление", `${program.name} — ${faculty.name} (Бакалавриат)`)
  await expect(records).toHaveCount(5)
  await selectOption(filters, "Форма обучения", "Очная")
  await expect(records).toHaveCount(2)
  await selectOption(filters, "Основание приёма", "Бюджет")
  await expect(records).toHaveCount(1)
  await expect(records.first().getByRole("cell", { name: "0", exact: true })).toBeVisible()
  await expect(records.first().getByRole("link", { name: "Открыть источник" })).toHaveAttribute("href", source)
  await selectOption(filters, "Форма обучения", "Неизвестна")
  await expect(records).toHaveCount(1)
  await expect(records.first().getByRole("cell", { name: "Неизвестна", exact: true })).toBeVisible()
  await expect(records.first().getByRole("cell", { name: "88.5", exact: true })).toBeVisible()

  await selectOption(filters, "Форма обучения", "Все")
  await selectOption(filters, "Основание приёма", "Все")
  await expect(page.getByText("Запись добавлена", { exact: true })).toHaveCount(0, { timeout: 8000 })
  await page.setViewportSize({ width: 1440, height: 1260 })
  await page.getByRole("heading", { name: "Баллы и места" }).scrollIntoViewIfNeeded()
  await page.screenshot({ path: testInfo.outputPath("admission-records.png"), animations: "disabled" })
})

test("patches only changed fields, preserves input on 409, and clears fields explicitly", async ({ page, context }, testInfo) => {
  const occupied: ScoreItem = { ...legacy, id: "occupied", study_form: "full_time", seat_count: 10 }
  const { patches } = await setup(context, page, [legacy, occupied])
  const row = page.getByRole("row").filter({ has: page.getByRole("cell", { name: "Неизвестна", exact: true }) })
  await row.getByRole("button", { name: "Изменить запись" }).click()
  const dialog = page.getByRole("dialog", { name: "Редактирование данных приёма" })
  await selectOption(dialog, "Форма обучения", "Очная")
  await dialog.getByLabel("Объявленные места", { exact: true }).fill("0")
  await dialog.getByLabel("Источник", { exact: true }).fill(source)
  await dialog.getByRole("button", { name: "Сохранить изменения" }).click()
  await expect(dialog.getByRole("alert")).toContainText("уже есть запись")
  expect(patches[0]).toEqual({ study_form: "full_time", seat_count: 0, source_url: source })
  await expect(dialog.getByLabel("Объявленные места", { exact: true })).toHaveValue("0")
  await selectOption(dialog, "Форма обучения", "Заочная")
  await dialog.getByRole("button", { name: "Сохранить изменения" }).click()
  await expect(dialog).toBeHidden()
  expect(patches[1]).toEqual({ study_form: "correspondence", seat_count: 0, source_url: source })

  const moved = page.getByRole("row").filter({ has: page.getByRole("cell", { name: "Заочная", exact: true }) })
  await expect(moved.getByRole("cell", { name: "250", exact: true })).toBeVisible()
  await moved.getByRole("button", { name: "Изменить запись" }).click()
  await expect(dialog.getByLabel("Источник", { exact: true })).toHaveValue(source)
  await expect(page.getByText("Данные приёма обновлены", { exact: true })).toHaveCount(0, { timeout: 8000 })
  await page.setViewportSize({ width: 390, height: 844 })
  await page.screenshot({ path: testInfo.outputPath("admission-edit-mobile.png"), animations: "disabled" })
  await selectOption(dialog, "Основание приёма", "Платное")
  await dialog.getByLabel("Объявленные места", { exact: true }).fill("")
  await dialog.getByLabel("Источник", { exact: true }).fill("")
  await dialog.getByRole("button", { name: "Сохранить изменения" }).click()
  await expect(dialog).toBeHidden()
  expect(patches[2]).toEqual({ admission_basis: "paid", seat_count: null, source_url: null })
  await expect(moved.getByRole("link")).toHaveCount(0)
})

test("previews and imports current and legacy rows without inventing missing values", async ({ page, context }, testInfo) => {
  const { id: _, ...oldRow } = legacy
  const { admission_basis: _basis, study_form: _study, seat_count: _seats, source_url: _source, ...legacyPreview } = { ...oldRow, year: 2024 }
  const preview = [
    { ...oldRow, form: "paid", admission_basis: "paid" satisfies AdmissionBasis, study_form: "correspondence" as const, passing_score: null, average_score: null, seat_count: 0, source_url: source },
    legacyPreview,
  ]
  const { imports, previews } = await setup(context, page, [], { nsu: true, preview })

  await page.getByRole("button", { name: "Импорт с сайта НГУ" }).click()
  const dialog = page.getByRole("dialog", { name: "Импорт с сайта НГУ" })
  await expect(dialog.getByRole("button", { name: "Импортировать записи" })).toBeDisabled()
  await dialog.getByRole("button", { name: "Предпросмотр" }).click()
  await expect(dialog.getByRole("row")).toHaveCount(3)
  expect(previews).toEqual([{ url: null }])
  await expect(dialog.getByRole("cell", { name: "Заочная", exact: true })).toBeVisible()
  await expect(dialog.getByRole("cell", { name: "Неизвестна", exact: true })).toBeVisible()
  await expect(dialog.getByRole("cell", { name: "0", exact: true })).toBeVisible()
  await expect(dialog.getByRole("link", { name: "Открыть источник" })).toHaveAttribute("href", source)
  const tableFits = await dialog.getByRole("table").evaluate(table => table.scrollWidth <= table.parentElement!.clientWidth)
  expect(tableFits).toBe(true)
  await page.screenshot({ path: testInfo.outputPath("admission-import-preview.png"), animations: "disabled" })
  await dialog.getByRole("button", { name: "Импортировать записи" }).click()
  await expect(dialog).toBeHidden()
  expect(imports).toEqual(preview)
  await expect(page.getByRole("table").getByRole("row")).toHaveCount(3)
})
