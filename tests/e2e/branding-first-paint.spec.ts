import { expect, test } from "@playwright/test"

import { brandPalette } from "../../app/utils/branding"

const api = "http://127.0.0.1:9465"
const fixture = {
  revision: 48,
  short_name: "Первый вуз",
  full_name: "Первый университет",
  accent_color: "#72C81E",
  logo_url: "/api/v1/branding/media/first.png",
  favicon_url: "/api/v1/branding/media/first-icon.png",
}

test.use({ trace: "on" })

test.afterEach(async ({ request }) => {
  await request.post(`${api}/__test/branding`, { data: {} })
})

for (const path of ["/login", "/feedback"]) {
  for (const theme of ["light", "dark"]) {
    for (const width of [1399, 390]) {
      test(`cold first paint ${path} ${theme} ${width}px: delayed JS, branding and logo`, async ({ page, context, request }, testInfo) => {
        await request.post(`${api}/__test/branding`, { data: { brand: fixture, delay: 100 } })
        await page.setViewportSize({ width, height: 844 })
        await context.addInitScript((mode) => {
          localStorage.setItem("nuxt-color-mode", mode)
          const frames: Record<string, unknown>[] = []
          Object.assign(window, { brandFrames: frames })
          function frame() {
            const name = document.querySelector(".admin-brand-name")
            const form = document.querySelector("form")
            if (name || form) {
              frames.push({
                name: name?.textContent,
                letter: document.querySelector(".admin-brand-mark > span")?.textContent,
                logo: document.querySelector(".admin-brand img")?.getAttribute("src"),
                primary: getComputedStyle(document.documentElement).getPropertyValue("--ui-color-primary-600").trim(),
                icon: document.querySelector("link[rel=\"icon\"]")?.getAttribute("href"),
              })
            }
            if (frames.length < 180) {
              requestAnimationFrame(frame)
            }
          }
          requestAnimationFrame(frame)
        }, theme)
        if (path !== "/login") {
          await context.addCookies([{ name: "abitur-token", value: "e2e-local-admin-token", domain: "127.0.0.1", path: "/" }])
        }
        let releaseScripts: (() => void) | undefined
        const scripts = new Promise<void>((resolve) => {
          releaseScripts = resolve
        })
        let releaseBrand: (() => void) | undefined
        const branding = new Promise<void>((resolve) => {
          releaseBrand = resolve
        })
        let releaseLogo: (() => void) | undefined
        const logo = new Promise<void>((resolve) => {
          releaseLogo = resolve
        })
        await context.route("**/_nuxt/**", async (route) => {
          if (route.request().resourceType() === "script") {
            await scripts
          }
          await route.continue()
        })
        await context.route("**/api/v1/branding", async (route) => {
          await branding
          await route.continue()
        })
        await context.route("**/api/v1/branding/media/first.png", async (route) => {
          await logo
          await route.continue()
        })
        try {
          const response = await page.goto(path, { waitUntil: "commit" })
          const html = await response!.text()
          await testInfo.attach("initial.html", { body: html, contentType: "text/html" })
          expect(response!.headers()["cache-control"]).toBe("no-store")
          expect(html).toContain("id=\"branding-bootstrap\"")
          expect(html).toContain(fixture.short_name)
          expect(html).toContain("--ui-color-primary-600:")
          await expect(page).toHaveTitle(fixture.short_name)
          await expect(page.locator("link[rel=\"icon\"]")).toHaveCount(1)
          await expect(page.locator("link[rel=\"icon\"]")).toHaveAttribute("href", api + fixture.favicon_url)
          await expect(page.locator("link[rel=\"preload\"][as=\"image\"]")).toHaveAttribute("href", api + fixture.logo_url)
          await page.screenshot({ path: testInfo.outputPath("before-js.png") })
          releaseScripts!()
          if (path === "/login") {
            await expect(page.getByRole("heading", { name: "Вход в систему" })).toBeVisible()
          } else {
            await expect(page.locator(".admin-brand-name")).toHaveText(fixture.short_name)
            await expect(page.locator(".admin-brand img")).toHaveAttribute("src", api + fixture.logo_url)
            await expect(page.locator(".admin-brand-mark > span")).toHaveCount(0)
          }
          await expect(page.locator("html")).toHaveClass(new RegExp(theme))
          await expect(page).toHaveTitle(fixture.short_name)
          await expect(page.locator("style#brand-palette")).toHaveCount(1)
          await expect(page.locator("link[rel=\"icon\"]")).toHaveCount(1)
          await page.screenshot({ path: testInfo.outputPath("first-client-logo-pending.png") })
          releaseLogo!()
          if (path !== "/login") {
            await expect(page.locator(".admin-brand img")).toHaveJSProperty("naturalWidth", 1)
          }
          await page.screenshot({ path: testInfo.outputPath("logo-ready.png") })
          const frames = await page.evaluate(() => (window as unknown as { brandFrames: { name?: string, letter?: string, logo?: string, primary: string, icon: string }[] }).brandFrames)
          expect(frames.length).toBeGreaterThan(0)
          for (const frame of frames) {
            expect(frame.primary.toLowerCase()).toBe(brandPalette(fixture.accent_color)[600].toLowerCase())
            expect(frame.icon).toBe(api + fixture.favicon_url)
            if (frame.name !== undefined) {
              expect(frame.name).toBe(fixture.short_name)
              expect(frame.letter).toBeUndefined()
              expect(frame.logo).toBe(api + fixture.logo_url)
            }
          }
          await testInfo.attach("early-frames.json", { body: JSON.stringify(frames), contentType: "application/json" })
          // A hard reload has the same bootstrap even with no client branding response.
          const reloaded = await page.reload({ waitUntil: "commit" })
          expect(await reloaded!.text()).toContain(fixture.short_name)
        } finally {
          releaseScripts?.()
          releaseBrand?.()
          releaseLogo?.()
        }
      })
    }
  }
}

test("hostile public fields are escaped in initial HTML and first client render", async ({ page, request }) => {
  const hostile = "</title></script><script>window.brandXss=1</script>&\u2028"
  await request.post(`${api}/__test/branding`, { data: { brand: { ...fixture, short_name: hostile, full_name: hostile, PRIVATE_TOKEN: "not-public" } } })
  const response = await page.goto("/login")
  const html = await response!.text()
  expect(html).not.toContain("PRIVATE_TOKEN")
  expect(html).not.toContain("not-public")
  expect(html).not.toContain("<script>window.brandXss=1</script>")
  await expect(page).toHaveTitle(hostile)
  expect(await page.evaluate(() => (window as unknown as { brandXss?: unknown }).brandXss)).toBeUndefined()
  const bootstrap = JSON.parse((await page.locator("#branding-bootstrap").textContent())!)
  expect(bootstrap.short_name).toBe(hostile)
})

test("bounded server failure retains this instance's last-good bootstrap; Host cannot redirect its fetch", async ({ page, request }) => {
  await request.post(`${api}/__test/branding`, { data: { brand: fixture } })
  await page.goto("/login")
  await expect(page).toHaveTitle(fixture.short_name)
  await request.post(`${api}/__test/branding`, { data: { status: 503, delay: 5000 } })
  const start = Date.now()
  const response = await request.get("/login", { headers: { "Host": "attacker.invalid", "X-Forwarded-Host": "attacker.invalid", "Authorization": "Bearer not-to-forward", "Cookie": "private=not-to-forward" } })
  expect(Date.now() - start).toBeLessThan(2600)
  expect(await response.text()).toContain(fixture.short_name)
  await page.reload()
  await expect(page.getByRole("heading", { name: "Вход в систему" })).toBeVisible()
  await expect(page).toHaveTitle(fixture.short_name)
  const calls = await (await request.get(`${api}/__test/branding/state`)).json()
  expect(calls.length).toBeGreaterThan(0)
  expect(calls.every((call: { authorization: boolean, cookie: boolean }) => !call.authorization && !call.cookie)).toBe(true)
})
