import { expect, test } from "@playwright/test"

for (const width of [390, 1440]) {
  test(`public project landing at ${width}px works without login or API`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 })
    const apiRequests: string[] = []
    page.on("request", (request) => {
      if (request.url().includes("/api/")) {
        apiRequests.push(request.url())
      }
    })
    const response = await page.goto("/project-site/index.html")
    expect(response?.status()).toBe(200)
    await expect(page).toHaveTitle("Абитуриент — ответы на вопросы о поступлении")
    await expect(page.getByRole("heading", { level: 1 })).toContainText("О поступлении.")
    await expect(page.getByLabel("Пример ответа помощника")).toBeVisible()
    await expect(page.getByRole("link", { name: /Попробовать для своего вуза/ })).toHaveAttribute("href", "#contact")
    await page.getByText("Это только для НГУ?", { exact: true }).click()
    await expect(page.getByText(/Проект начался в НГУ/)).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
    expect(await page.locator("link[rel=\"canonical\"]").getAttribute("href")).toBe("https://abitur.site/")
    expect(await page.locator("meta[name=\"description\"]").getAttribute("content")).toContain("Telegram")
    await expect(page.locator("a[href*=\"/login\"], a[href*=\"/settings\"], a[href*=\"api.nsu\"]")).toHaveCount(0)
    expect(apiRequests).toEqual([])
  })
}

test("landing and its icon remain available with JavaScript disabled", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false })
  const page = await context.newPage()
  await page.goto("/project-site/index.html")
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible()
  const icon = await page.request.get("/project-site/icon.svg")
  expect(icon.status()).toBe(200)
  expect(icon.headers()["content-type"]).toContain("image/svg+xml")
  await context.close()
})
