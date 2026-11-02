import { expect, test } from "@playwright/test"

for (const colorScheme of ["light", "dark"] as const) {
  for (const size of [{ width: 1399, height: 881 }, { width: 1049, height: 881 }, { width: 390, height: 881 }, { width: 1049, height: 400 }, { width: 390, height: 400 }]) {
    test(`compact shell ${colorScheme} ${size.width}x${size.height}`, async ({ page, context }, testInfo) => {
      await context.route("**/*", (route) => {
        const url = new URL(route.request().url())
        if (url.pathname === "/api/v1/feedback") {
          return route.fulfill({ json: { reports: [], total: 0 }, headers: { "Access-Control-Allow-Origin": "*" } })
        }
        if (url.pathname === "/api/v1/settings/instance") {
          return route.fulfill({ json: { revision: 1, encryption_ready: true, settings: [] }, headers: { "Access-Control-Allow-Origin": "*" } })
        }
        return url.hostname === "127.0.0.1" && ["9464", "9465"].includes(url.port) ? route.continue() : route.abort()
      })
      await context.addCookies([{ name: "abitur-token", value: "e2e-local-admin-token", domain: "127.0.0.1", path: "/" }])
      await page.emulateMedia({ colorScheme, reducedMotion: "reduce" })
      await page.setViewportSize(size)
      for (const path of ["/settings", "/feedback"]) {
        await page.goto(path)
        await expect(page.locator(".admin-brand-name")).not.toHaveText("Университет")
        await expect(page.getByRole("heading", { level: 1 })).toBeVisible()
        if (path === "/settings") {
          await expect(page.getByText("Настроек пока нет", { exact: true })).toBeVisible()
        }
        const sidebar = page.locator(".admin-sidebar")
        await expect(page.getByRole("navigation", { name: "Разделы настроек" })).toHaveCount(0)
        if (size.width === 390) {
          const menu = page.getByRole("button", { name: "Меню", exact: true })
          await menu.click()
          await page.keyboard.press("Escape")
          await expect(menu).toBeFocused()
          await menu.click()
        } else {
          await expect(page.locator(".admin-topbar")).toBeHidden()
          expect(await page.locator("main").evaluate(el => el.getBoundingClientRect().top)).toBeLessThan(40)
        }
        await page.screenshot({ path: testInfo.outputPath(`${path.slice(1)}-initial.png`), fullPage: true })
        const logout = sidebar.getByRole("button", { name: "Выйти", exact: true })
        await expect(logout).toBeVisible()
        const theme = sidebar.locator(".admin-sidebar-actions button").first()
        await expect(theme).toHaveText("Переключить тему")
        await expect(theme).toHaveAccessibleName(colorScheme === "dark" ? "Переключиться на светлый режим" : "Переключиться на тёмный режим")
        await theme.focus()
        await expect(theme).toBeInViewport({ ratio: 1 })
        const themeBox = await theme.boundingBox()
        const logoutBox = await logout.boundingBox()
        expect(themeBox!.height).toBeGreaterThanOrEqual(44)
        expect(logoutBox!.height).toBeGreaterThanOrEqual(44)
        expect(themeBox!.x).toBe(logoutBox!.x)
        expect(themeBox!.width).toBe(logoutBox!.width)
        expect(logoutBox!.y).toBeGreaterThanOrEqual(themeBox!.y + themeBox!.height)
        await page.keyboard.press("Enter")
        await expect(page.locator("html")).toHaveClass(new RegExp(colorScheme === "dark" ? "light" : "dark"))
        await page.keyboard.press("Space")
        await expect(page.locator("html")).toHaveClass(new RegExp(colorScheme))
        expect(await theme.evaluate((el) => {
          const style = getComputedStyle(el)
          return el.matches(":focus-visible") && style.outlineStyle !== "none" && Number.parseFloat(style.outlineWidth) >= 2
        })).toBe(true)

        await sidebar.getByRole("link", { name: "Системные логи", exact: true }).focus()
        await page.keyboard.press("Tab")
        await expect(sidebar.locator(".admin-sidebar-actions button").first()).toBeFocused()
        await page.keyboard.press("Tab")
        await expect(logout).toBeFocused()
        await expect(logout).toBeInViewport({ ratio: 1 })
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
        await page.screenshot({ path: testInfo.outputPath(`${path.slice(1)}.png`), fullPage: true })
        if (size.width === 390) {
          await page.keyboard.press("Escape")
          await expect(sidebar).toBeHidden()
          await expect(page.getByRole("button", { name: "Меню", exact: true })).toBeFocused()
        }
      }
    })
  }
}

for (const logo of ["/nsu/logo-green.svg", "/wide-logo.svg"]) {
  test(`logo has no clipping mask: ${logo}`, async ({ page, context }, testInfo) => {
    await context.request.post("http://127.0.0.1:9465/__test/branding", { data: { brand: { revision: 50, short_name: "НГУ", full_name: "Новосибирский государственный университет", logo_url: `http://127.0.0.1:9464${logo}`, favicon_url: "", accent_color: "#72c81e" } } })
    await context.addCookies([{ name: "abitur-token", value: "e2e-local-admin-token", domain: "127.0.0.1", path: "/" }])
    await context.route("**/*", (route) => {
      const url = new URL(route.request().url())
      if (url.hostname !== "127.0.0.1" || !["9464", "9465"].includes(url.port)) {
        return route.abort()
      }
      return url.pathname === "/wide-logo.svg"
        ? route.fulfill({ contentType: "image/svg+xml", body: "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"160\" height=\"40\"><rect width=\"160\" height=\"40\" fill=\"green\"/><path d=\"M0 0H160V40H0Z\" fill=\"none\" stroke=\"red\" stroke-width=\"4\"/></svg>" })
        : route.continue()
    })
    try {
      await page.goto("/feedback")
      const mark = page.locator(".admin-brand-mark")
      await expect(mark.locator("img")).toBeVisible()
      await expect.poll(() => mark.locator("img").evaluate((el: HTMLImageElement) => el.naturalWidth)).toBeGreaterThan(0)
      await expect(mark).toHaveCSS("border-radius", "0px")
      await expect(mark).toHaveCSS("overflow", "visible")
      await expect(mark.locator("img")).toHaveCSS("object-fit", "contain")
      await page.screenshot({ path: testInfo.outputPath("logo.png") })
    } finally {
      await context.request.post("http://127.0.0.1:9465/__test/branding", { data: {} })
    }
  })
}
