import type { BrowserContext } from "@playwright/test"
import { expect, test } from "@playwright/test"

const fullName = "Университет науки и современных технологий"
const logo = "/fixture-university-logo.svg"

async function universityFixture(context: BrowserContext, options: { name?: string, logo?: string } = {}) {
  let identity = { profile: "custom", short_name: options.name ?? "Демо-вуз", full_name: fullName, assistant_name: "Помощник", website: "", email: "", phone: "", address: "", logo_url: options.logo ?? "" }
  let welcome = ""
  let revision = 1
  let conflict = false
  let unavailable = false
  let gets = 0
  const puts: Record<string, string | null>[] = []
  await context.request.post("http://127.0.0.1:9465/__test/branding", { data: { brand: { ...identity, revision, accent_color: "#4b4bd2", favicon_url: "" }, status: 200 } })
  await context.addCookies([{ name: "abitur-token", value: "identity-fixture", domain: "127.0.0.1", path: "/" }])
  await context.route("**/*", async (route) => {
    const url = new URL(route.request().url())
    if (url.hostname !== "127.0.0.1" || !["9464", "9465"].includes(url.port)) {
      return route.abort("blockedbyclient")
    }
    if (url.pathname === logo) {
      return route.fulfill({ contentType: "image/svg+xml", body: "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"80\" height=\"40\"><rect width=\"80\" height=\"40\" fill=\"#246c60\"/><text x=\"40\" y=\"28\" text-anchor=\"middle\" font-size=\"24\" fill=\"white\">ДУ</text></svg>" })
    }
    if (url.pathname === "/missing-logo.svg") {
      return route.fulfill({ status: 404, body: "Missing" })
    }
    if (!url.pathname.startsWith("/api/v1/")) {
      return route.continue()
    }
    const headers = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "*", "Access-Control-Allow-Methods": "*" }
    if (route.request().method() === "OPTIONS") {
      return route.fulfill({ status: 204, headers })
    }
    const reply = (json: unknown, status = 200) => route.fulfill({ headers, status, json })
    if (url.pathname === "/api/v1/auth/me") {
      return reply({ id: 1, username: "identity-admin", role: "superadmin", is_active: true })
    }
    if (url.pathname === "/api/v1/university" || url.pathname === "/api/v1/branding") {
      gets++
      return unavailable ? reply({ detail: "Unavailable" }, 503) : reply({ ...identity, revision, accent_color: "#4b4bd2", favicon_url: "" })
    }
    if (url.pathname === "/api/v1/settings/instance") {
      if (route.request().method() === "PUT") {
        const changes = route.request().postDataJSON().changes as Record<string, string | null>
        puts.push(changes)
        if (conflict) {
          conflict = false
          revision++
          return reply({ detail: "Version conflict" }, 409)
        }
        revision++
        welcome = changes.BOT_WELCOME_MESSAGE ?? welcome
        identity = { ...identity, short_name: changes.UNIVERSITY_SHORT_NAME ?? identity.short_name, logo_url: changes.UNIVERSITY_LOGO_URL ?? identity.logo_url }
        await context.request.post("http://127.0.0.1:9465/__test/branding", { data: { brand: { ...identity, revision, accent_color: "#4b4bd2", favicon_url: "" }, status: unavailable ? 503 : 200 } })
      }
      return reply({ revision, encryption_ready: true, settings: [
        { key: "UNIVERSITY_SHORT_NAME", label: "Короткое название", group: "Университет", choices: [], kind: "text", secret: false, configured: true, value: identity.short_name },
        { key: "UNIVERSITY_LOGO_URL", label: "Логотип", group: "Университет", choices: [], kind: "url", secret: false, configured: true, value: identity.logo_url },
        { key: "BOT_WELCOME_MESSAGE", label: "Приветственное сообщение бота", group: "Вуз", choices: [], kind: "textarea", secret: false, configured: Boolean(welcome), value: welcome },
      ] })
    }
    if (url.pathname === "/api/v1/feedback") {
      return reply({ reports: [], total: 0 })
    }
    return reply({ detail: "Unknown fixture endpoint" }, 501)
  })
  return {
    puts,
    failBrand: () => {
      unavailable = true
    },
    recoverBrand: () => {
      unavailable = false
    },
    gets: () => gets,
    conflict: () => { conflict = true },
  }
}

test("university save refreshes the shared brand and header without reload; drafts and conflicts retain identity", async ({ page, context }) => {
  const fixture = await universityFixture(context)
  await page.goto("/settings?section=connections")
  const brand = page.locator(".admin-brand")
  await expect(brand).toContainText("Демо-вуз")
  await expect(page.locator(".admin-topbar")).toBeHidden()
  await expect.poll(fixture.gets).toBe(1)
  await page.locator("#instance-UNIVERSITY_SHORT_NAME").fill("Новый вуз")

  await expect(brand).toContainText("Демо-вуз")
  await page.locator(".admin-sidebar").getByRole("link", { name: "Обратная связь", exact: true }).click()
  await page.getByRole("button", { name: "Продолжить редактирование" }).click()
  await expect(page.locator("#instance-UNIVERSITY_SHORT_NAME")).toHaveValue("Новый вуз")
  fixture.conflict()
  await page.getByRole("button", { name: /Сохранить изменения/ }).click()
  await expect(page.getByText(/Черновик сохранён/)).toBeVisible()
  await expect(brand).toContainText("Демо-вуз")
  expect(fixture.gets()).toBe(1)
  await page.getByRole("button", { name: /Загрузить версию и сверить/ }).click()
  await expect(page.locator("#instance-UNIVERSITY_SHORT_NAME")).toHaveValue("Новый вуз")
  await page.getByRole("button", { name: /Сохранить изменения/ }).click()
  await expect(brand).toContainText("Новый вуз")
  await expect(page.locator(".admin-topbar")).toBeHidden()
  await expect(brand.locator("img")).toHaveCount(0)
  expect(fixture.gets()).toBe(5)
  expect(fixture.puts[1]).toEqual({ UNIVERSITY_SHORT_NAME: "Новый вуз" })
  await page.locator(".admin-sidebar").getByRole("link", { name: "Обратная связь", exact: true }).click()
  await expect(page).toHaveURL("/feedback")
  await expect(brand).toContainText("Новый вуз")
  expect(fixture.gets()).toBe(5)
})

test("welcome message saves line breaks and can be cleared", async ({ page, context }) => {
  const fixture = await universityFixture(context)
  await page.goto("/settings?section=connections")
  const field = page.getByRole("textbox", { name: "Приветственное сообщение бота" })
  const save = page.getByRole("button", { name: /Сохранить изменения/ })
  const welcome = "Добро пожаловать!\n\n<b>Приёмная комиссия</b>"
  await expect(field).toHaveAttribute("maxlength", "3999")
  await field.fill(welcome)
  await save.click()
  await expect(page.getByText("Настройки сохранены.")).toBeVisible()
  expect(fixture.puts[0]).toEqual({ BOT_WELCOME_MESSAGE: welcome })
  await page.reload()
  await expect(field).toHaveValue(welcome)
  await field.fill("")
  await save.click()
  await expect(page.getByText("Настройки сохранены.")).toBeVisible()
  expect(fixture.puts[1]).toEqual({ BOT_WELCOME_MESSAGE: "" })
  await page.reload()
  await expect(field).toHaveValue("")
})

test("a failed public refresh preserves the working client brand; retry applies the new saved snapshot", async ({ page, context }) => {
  const fixture = await universityFixture(context)
  await page.goto("/settings?section=connections")
  await expect(page.locator(".admin-brand-name")).toHaveText("Демо-вуз")
  fixture.failBrand()
  await page.locator("#instance-UNIVERSITY_SHORT_NAME").fill("Новая версия")
  await page.getByRole("button", { name: /Сохранить изменения/ }).click()
  await expect(page.getByText("Настройки сохранены.", { exact: true })).toBeVisible()
  await expect(page.locator(".admin-brand-name")).toHaveText("Демо-вуз")
  await expect(page.locator("style#brand-palette")).toHaveCount(1)
  fixture.recoverBrand()
  await page.locator("#instance-UNIVERSITY_SHORT_NAME").fill("Восстановленная версия")
  await page.getByRole("button", { name: /Сохранить изменения/ }).click()
  await expect(page.locator(".admin-brand-name")).toHaveText("Восстановленная версия")
  await expect(page).toHaveTitle("Восстановленная версия")
  await page.reload()
  await expect(page.locator(".admin-brand-name")).toHaveText("Восстановленная версия")
})

test("unavailable public brand uses this instance's last good snapshot without client waiting", async ({ page, context }) => {
  await universityFixture(context, { name: "Сохранённый вуз" })
  await page.goto("/feedback")
  await expect(page.locator(".admin-brand-name")).toHaveText("Сохранённый вуз")
  await context.request.post("http://127.0.0.1:9465/__test/branding", { data: { status: 503 } })
  await page.reload()
  await expect(page.locator(".admin-brand-name")).toHaveText("Сохранённый вуз")
})

test.afterEach(async ({ request }) => {
  await request.post("http://127.0.0.1:9465/__test/branding", { data: {} })
})

for (const scenario of [
  { label: "nsu", name: "НГУ", logo: "", width: 1049, theme: "light" },
  { label: "custom", name: "Демо-вуз", logo: "", width: 1399, theme: "dark" },
  { label: "own-logo", name: "Демо-вуз", logo, width: 1049, theme: "dark" },
  { label: "failed-logo", name: "Демо-вуз", logo: "/missing-logo.svg", width: 1399, theme: "light" },
  { label: "long-name", name: "Очень длинное название университета науки и современных технологий", logo, width: 1049, theme: "light" },
  { label: "mobile", name: "Демо-вуз", logo: "", width: 390, theme: "light" },
  { label: "mobile-long-failed", name: "Очень длинное название университета науки и современных технологий", logo: "/missing-logo.svg", width: 390, theme: "dark" },
]) {
  test(`identity stays inside sidebar (${scenario.label}, ${scenario.theme})`, async ({ page, context }, testInfo) => {
    await universityFixture(context, scenario)
    await page.setViewportSize({ width: scenario.width, height: 881 })
    await context.addInitScript(theme => localStorage.setItem("nuxt-color-mode", theme), scenario.theme)
    await page.goto("/feedback")
    const sidebar = page.locator("#admin-navigation")
    const brand = sidebar.locator(".admin-brand")
    if (scenario.width === 390) {
      await page.getByRole("button", { name: "Меню", exact: true }).click()
    }
    await expect(brand.locator(".admin-brand-name")).toHaveText(scenario.name)
    await expect(brand).toHaveAttribute("title", fullName)
    await expect(brand).toHaveAccessibleName(`${fullName} — Панель управления`)
    if (scenario.logo === logo) {
      await expect(brand.locator("img")).toHaveJSProperty("naturalWidth", 80)
    } else {
      await expect(brand.locator("img")).toHaveCount(0)
      await expect(brand.locator(".admin-brand-mark")).toHaveText(Array.from(scenario.name)[0]!)
    }
    expect(await sidebar.evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
    if (scenario.width !== 390) {
      await expect(sidebar).toHaveCSS("width", "220px")
    }
    await page.screenshot({ path: testInfo.outputPath("identity.png"), fullPage: true })
    await expect(sidebar.locator("[aria-current='page']")).toHaveText("Обратная связь")
    if (scenario.width === 390) {
      await page.keyboard.press("Escape")
      await expect(sidebar).toBeHidden()
    }
  })
}
