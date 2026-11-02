import process from "node:process"

import { expect, test } from "@playwright/test"

for (const colorScheme of ["light", "dark"] as const) {
  for (const width of [1049, 390]) {
    test(`sidebar scroll and keyboard access: ${colorScheme}, ${width}px`, async ({ page, context }, testInfo) => {
      await context.route("**/*", (route) => {
        const url = new URL(route.request().url())
        return url.hostname === "127.0.0.1" && ["9464", "9465"].includes(url.port)
          ? route.continue()
          : route.abort("blockedbyclient")
      })
      await context.addCookies([{ name: "abitur-token", value: "e2e-local-admin-token", domain: "127.0.0.1", path: "/" }])
      await page.emulateMedia({ colorScheme, reducedMotion: "reduce" })
      await page.setViewportSize({ width, height: 400 })
      await page.goto("/")
      await expect(page.getByRole("heading", { name: "Материалы", exact: true })).toBeVisible()
      if (width === 390) {
        await page.getByRole("button", { name: "Меню", exact: true }).click()
      }
      const sidebar = page.locator(".admin-sidebar")
      const links = sidebar.locator("a")
      const last = sidebar.getByRole("link", { name: "Системные логи", exact: true })
      await expect(last).toHaveCount(1)
      await expect(page.locator("html")).toHaveClass(new RegExp(colorScheme))
      const geometry = () => sidebar.evaluate(element => ({
        width: element.clientWidth,
        scroll: element.scrollTop,
        maxScroll: element.scrollHeight - element.clientHeight,
        gutter: element.getBoundingClientRect().width - element.clientWidth - Number.parseFloat(getComputedStyle(element).borderRightWidth),
      }))
      expect((await geometry()).maxScroll).toBeGreaterThan(0)
      const initialWidth = (await geometry()).width
      await sidebar.hover()
      // Large wheel delta models a mouse wheel; small deltas model a trackpad gesture.
      await page.mouse.wheel(0, 180)
      await expect.poll(async () => (await geometry()).scroll).toBeGreaterThan(0)
      const wheelScroll = (await geometry()).scroll
      for (let index = 0; index < 8; index++) {
        await page.mouse.wheel(0, 12)
      }
      await expect.poll(async () => (await geometry()).scroll).toBeGreaterThan(wheelScroll)
      await page.screenshot({ path: testInfo.outputPath("wheel.png") })

      await links.first().focus()
      await page.keyboard.press("End")
      await expect.poll(async () => {
        const { scroll, maxScroll } = await geometry()
        return Math.abs(scroll - maxScroll)
      }).toBeLessThanOrEqual(1)
      await last.focus()
      await links.first().focus()
      await expect.poll(async () => (await geometry()).scroll).toBe(0)
      // Safari on macOS uses Option+Tab to include links with default keyboard settings.
      const tab = testInfo.project.name === "webkit" && process.platform === "darwin" ? "Alt+Tab" : "Tab"
      for (let index = 1; index < await links.count(); index++) {
        await page.keyboard.press(tab)
      }
      await expect(last).toBeFocused()
      await expect(last).toBeInViewport({ ratio: 1 })
      expect(await last.evaluate((element) => {
        const style = getComputedStyle(element)
        return element.matches(":focus-visible") && style.outlineStyle !== "none" && Number.parseFloat(style.outlineWidth) >= 2
      })).toBe(true)
      await page.screenshot({ path: testInfo.outputPath("keyboard-last.png") })
      await testInfo.attach("sidebar-geometry", { body: JSON.stringify(await geometry()), contentType: "application/json" })
      expect((await geometry()).width).toBe(initialWidth)
      expect((await geometry()).gutter).toBe(0)
      expect(await sidebar.evaluate(element => getComputedStyle(element).scrollbarWidth)).toBe("none")
      await page.keyboard.press(`Shift+${tab}`)
      await expect(links.nth(await links.count() - 2)).toBeFocused()
      // Two 44px action rows need a taller viewport to exercise the no-overflow case.
      await page.setViewportSize({ width, height: 1100 })
      expect((await geometry()).maxScroll).toBe(0)
      expect((await geometry()).width).toBe(initialWidth)
      await last.click()
      await expect(page).toHaveURL(/\/system-logs$/)
      if (width === 390) {
        await expect(sidebar).toBeHidden()
      }
    })
  }
}
