import { expect, test } from "@playwright/test"

for (const width of [390, 1440]) {
  test(`public project landing at ${width}px works without login or API`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 900 })
    const apiRequests: string[] = []
    page.on("request", (request) => {
      if (request.url().includes("/api/")) {
        apiRequests.push(request.url())
      }
    })
    const response = await page.goto("/project-site/index.html")
    expect(response?.status()).toBe(200)
    await expect(page).toHaveTitle("Инфовуз — ответы на вопросы о поступлении")
    await expect(page.locator(".brand")).toHaveText(["Инфовуз", "Инфовуз"])
    await expect(page.getByRole("link", { name: "Инфовуз — на главную" })).toBeVisible()
    await expect(page.locator("meta[property='og:title']")).toHaveAttribute("content", /^Инфовуз/)
    await expect(page.locator("meta[property='og:site_name']")).toHaveAttribute("content", "Инфовуз")
    const iconUrl = await page.locator("link[rel='icon']").getAttribute("href")
    await expect(page.locator(".brand img")).toHaveCount(2)
    for (const image of await page.locator(".brand img").all()) {
      await expect(image).toHaveAttribute("src", iconUrl!)
      expect(await image.evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth > 0)).toBe(true)
    }
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
    await expect(page.getByRole("link", { name: "Обсудить демонстрацию ↗" })).toHaveAttribute("href", "https://t.me/seniormarat")
    await page.screenshot({ path: testInfo.outputPath(`infovuz-${width}.png`), fullPage: true })
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
