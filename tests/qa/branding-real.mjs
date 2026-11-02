// Explicit opt-in: real API with an isolated QA database, never a deployed instance.
import { Buffer } from "node:buffer"
import { mkdir, writeFile } from "node:fs/promises"
import process from "node:process"

import { chromium, expect } from "@playwright/test"

async function main() {
  const web = process.env.BRANDING_QA_WEB || "http://127.0.0.1:56547"
  const api = process.env.BRANDING_QA_API || "http://127.0.0.1:56546"
  if (![web, api].every(value => new URL(value).hostname === "127.0.0.1")) {
    throw new Error("QA requires loopback URLs")
  }
  const out = "/tmp/abitur-branding-45"
  await mkdir(out, { recursive: true })
  const browser = await chromium.launch()
  const context = await browser.newContext({ viewport: { width: 1399, height: 1000 } })
  const page = await context.newPage()
  const evidence = []
  page.on("pageerror", error => evidence.push({ pageerror: error.message }))
  const shot = name => page.screenshot({ path: `${out}/${name}.png`, fullPage: true })
  try {
    const auth = await context.request.post(`${api}/api/v1/auth/login`, { data: { username: "branding-qa", password: "branding-qa-local-password" } })
    const setupToken = (await auth.json()).access_token
    const baseline = await (await context.request.get(`${api}/api/v1/branding`)).json()
    const reset = await context.request.put(`${api}/api/v1/settings/instance`, { headers: { Authorization: `Bearer ${setupToken}` }, data: { revision: baseline.revision, changes: { UNIVERSITY_PROFILE: "nsu", UNIVERSITY_SHORT_NAME: "НГУ", UNIVERSITY_FULL_NAME: "Новосибирский государственный университет", UNIVERSITY_LOGO_URL: "", UNIVERSITY_ACCENT_COLOR: "#4b4bd2" } } })
    expect(reset.ok()).toBe(true)
    await page.goto(`${web}/login`)
    await expect(page.locator("link[rel=\"icon\"]")).toHaveAttribute("href", "/favicon.svg")
    await shot("login-default")
    await page.getByRole("textbox", { name: /Логин/ }).fill("branding-qa")
    await page.getByLabel(/Пароль/).fill("branding-qa-local-password")
    await page.getByRole("button", { name: "Войти", exact: true }).click()
    await page.waitForURL(url => url.pathname !== "/login")
    const token = (await context.cookies()).find(item => item.name === "abitur-token").value
    const headers = { Authorization: `Bearer ${token}` }
    const brand = async () => (await context.request.get(`${api}/api/v1/branding`)).json()
    const update = async (changes) => {
      const current = await brand()
      const response = await context.request.put(`${api}/api/v1/settings/instance`, { headers, data: { revision: current.revision, changes } })
      expect(response.ok()).toBe(true)
    }
    await page.goto(`${web}/settings?section=connections`)
    await page.getByRole("button", { name: "Оформление вуза", exact: true }).click()
    const short = page.getByLabel("Краткое название", { exact: true })
    const full = page.getByLabel("Полное название", { exact: true })
    const save = page.getByRole("button", { name: /Сохранить изменения/ })
    await expect(short).toHaveValue("НГУ")
    await shot("nsu-light-before")
    const oldPrimary = await page.locator("html").evaluate(el => getComputedStyle(el).getPropertyValue("--ui-color-primary-600"))
    await short.fill("Университет Север")
    await full.fill("Университет Север науки и современных технологий с очень длинным полным названием для проверки переноса строк")
    await page.locator("#brand-hex").fill("#006633")
    await page.getByLabel("Логотип", { exact: true }).setInputFiles(`${out}/logo.png`)
    await expect(page.locator(".brand-preview img")).toHaveJSProperty("naturalWidth", 240)
    await expect(page.locator(".admin-brand-name")).toHaveText("НГУ")
    expect(await page.locator("html").evaluate(el => getComputedStyle(el).getPropertyValue("--ui-color-primary-600"))).toBe(oldPrimary)
    await expect(page.locator(".brand-preview button")).toHaveCSS("background-color", "rgb(0, 102, 51)")
    await shot("draft-preview")
    await save.click()
    await expect(page.locator(".admin-brand-name")).toHaveText("Университет Север")
    await expect(save).toBeDisabled()
    const first = await brand()
    await expect(page.locator(".admin-brand img")).toHaveJSProperty("naturalWidth", 240)
    await expect(page.locator("link[rel=\"icon\"]")).toHaveAttribute("href", api + first.favicon_url)
    const icon = await context.request.get(api + first.favicon_url)
    expect(icon.status()).toBe(200)
    await writeFile(`${out}/favicon-upload.png`, await icon.body())
    evidence.push({ stage: "uploaded", brand: first, iconHeaders: icon.headers() })
    await shot("saved-light")
    await page.reload()
    await page.getByRole("button", { name: "Оформление вуза", exact: true }).click()
    await expect(short).toHaveValue("Университет Север")
    await expect(page.locator("link[rel=\"icon\"]")).toHaveAttribute("href", api + first.favicon_url)
    // Cancel must discard both file and field drafts.
    await short.fill("Отменить этот черновик")
    await page.getByLabel("Логотип", { exact: true }).setInputFiles(`${out}/replacement.png`)
    await update({ UNIVERSITY_SHORT_NAME: "Серверный вуз", UNIVERSITY_ACCENT_COLOR: "#bb00ff" })
    await page.getByRole("button", { name: "Отменить правки", exact: true }).click()
    await page.getByRole("dialog").getByRole("button", { name: "Отменить правки", exact: true }).click()
    await expect(short).toHaveValue("Серверный вуз")
    await expect(page.locator(".admin-brand-name")).toHaveText("Серверный вуз")
    await expect(save).toBeDisabled()
    // Concurrent real API write creates a revision conflict; retain file across rebase.
    await short.fill("Очень длинное название университета науки и современных технологий")
    await page.getByLabel("Логотип", { exact: true }).setInputFiles(`${out}/replacement.png`)
    await update({ UNIVERSITY_FULL_NAME: "Параллельная правка полного названия", UNIVERSITY_SHORT_NAME: "Параллельный вуз" })
    await save.click()
    await expect(page.getByRole("alert")).toContainText("Черновик сохранён")
    expect((await brand()).logo_url).toBe(first.logo_url)
    await shot("revision-conflict")
    await page.getByRole("button", { name: /Загрузить версию и сверить/ }).click()
    await expect(full).toHaveValue("Параллельная правка полного названия")
    await expect(page.locator(".admin-brand-name")).toHaveText("Параллельный вуз")
    await expect(short).toHaveValue("Очень длинное название университета науки и современных технологий")
    await save.click()
    await expect(page.getByText("Настройки сохранены.", { exact: true })).toBeVisible()
    await expect(save).toBeDisabled()
    const replaced = await brand()
    expect(replaced.logo_url).not.toBe(first.logo_url)
    expect(replaced.favicon_url).not.toBe(first.favicon_url)
    await writeFile(`${out}/favicon-replaced.png`, await (await context.request.get(api + replaced.favicon_url)).body())
    // Transport failure and retry preserve the complete draft.
    await page.getByLabel("Логотип", { exact: true }).setInputFiles({ name: "broken.png", mimeType: "image/png", buffer: Buffer.from("broken raster") })
    await save.click()
    await expect(page.getByRole("alert")).toContainText("корректный")
    expect((await brand()).logo_url).toBe(replaced.logo_url)
    await page.getByLabel("Логотип", { exact: true }).setInputFiles(`${out}/logo.png`)
    await page.route("**/api/v1/settings/instance/branding", route => route.abort("failed"), { times: 1 })
    await save.click()
    await expect(page.getByRole("alert")).toContainText("повторите")
    await save.click()
    await expect(page.getByText("Настройки сохранены.", { exact: true })).toBeVisible()
    await expect(save).toBeDisabled()
    // Technical capability profile is separate and does not change branding fields.
    await page.getByRole("button", { name: "Технический профиль", exact: true }).click()
    await page.locator("#instance-UNIVERSITY_PROFILE").selectOption("custom")
    await save.click()
    await expect(page.getByText("Настройки сохранены.", { exact: true })).toBeVisible()
    await expect(save).toBeDisabled()
    await page.getByRole("button", { name: "Оформление вуза", exact: true }).click()
    // Theme and mobile checks, including long names and opening real navigation.
    for (const theme of ["light", "dark"]) {
      await page.evaluate((value) => {
        localStorage.setItem("nuxt-color-mode", value)
      }, theme)
      await page.reload()
      await page.getByRole("button", { name: "Оформление вуза", exact: true }).click()
      await expect(page.locator("html")).toHaveClass(theme === "dark" ? /dark/ : /light/)
      await shot(`custom-${theme}-desktop`)
      await page.setViewportSize({ width: 390, height: 844 })
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
      await shot(`custom-${theme}-mobile`)
      await page.getByRole("button", { name: "Меню", exact: true }).click()
      await expect(page.locator(".admin-brand img")).toHaveJSProperty("naturalWidth", 240)
      await shot(`navigation-${theme}-mobile`)
      await page.keyboard.press("Escape")
      await page.setViewportSize({ width: 1399, height: 1000 })
    }
    const beforeRemove = await brand()
    // Public login has the same prepared icon without auth.
    const publicContext = await browser.newContext()
    const login = await publicContext.newPage()
    await login.goto(`${web}/login`)
    await expect(login.locator("link[rel=\"icon\"]")).toHaveAttribute("href", api + beforeRemove.favicon_url)
    await login.reload()
    await expect(login.locator("link[rel=\"icon\"]")).toHaveAttribute("href", api + beforeRemove.favicon_url)
    await login.screenshot({ path: `${out}/login-branded.png` })
    await publicContext.close()
    await page.getByRole("button", { name: "Удалить", exact: true }).click()
    await save.click()
    await expect(page.getByText("Настройки сохранены.", { exact: true })).toBeVisible()
    await expect(save).toBeDisabled()
    await expect(page.locator(".admin-brand img")).toHaveCount(0)
    await expect(page.locator("link[rel=\"icon\"]")).toHaveAttribute("href", "/favicon.svg")
    await page.reload()
    await expect(page.locator("link[rel=\"icon\"]")).toHaveAttribute("href", "/favicon.svg")
    await shot("removed-fallback")
    // Legacy broken URL falls back to the initial without losing the brand.
    await update({ UNIVERSITY_LOGO_URL: "http://127.0.0.1:56546/missing-logo.png" })
    await page.reload()
    await expect(page.locator(".admin-brand img")).toHaveCount(0)
    await expect(page.locator(".admin-brand-mark")).toHaveText("О")
    await shot("broken-legacy-fallback")
    evidence.push({ stage: "complete", brand: await brand(), head: await page.locator("head").innerHTML() })
    await writeFile(`${out}/browser-evidence.json`, JSON.stringify(evidence, null, 2))
    expect(evidence.filter(item => item.pageerror)).toEqual([])
    console.warn("PASS: real API branding lifecycle, profile, themes, mobile, login and favicon")
  } catch (error) {
    await shot("qa-failure")
    await writeFile(`${out}/qa-failure.json`, JSON.stringify({ url: page.url(), evidence }, null, 2))
    throw error
  } finally {
    await browser.close()
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
