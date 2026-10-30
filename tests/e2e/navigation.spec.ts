import { expect, test } from "@playwright/test"

test.beforeEach(async ({ context }) => {
  // Never allow the browser to contact a real backend, model or CDN.
  await context.route("**/*", (route) => {
    const url = new URL(route.request().url())
    return url.hostname === "127.0.0.1" && ["9464", "9465"].includes(url.port)
      ? route.continue()
      : route.abort("blockedbyclient")
  })
})

test("protected route, failed and successful login, admin screen and logout", async ({ page }) => {
  const errors: string[] = []
  page.on("pageerror", error => errors.push(error.message))
  await page.goto("/settings")
  await expect(page).toHaveURL(/\/login$/)
  await expect(page.getByRole("heading", { name: "Вход в систему" })).toBeVisible()
  await page.getByPlaceholder("Введите логин").fill("e2e-admin")
  await page.getByPlaceholder("Введите пароль").fill("wrong-password")
  await page.getByRole("button", { name: "Войти", exact: true }).click()
  await expect(page.getByText("Неверный логин или пароль").first()).toBeVisible()
  await page.getByPlaceholder("Введите пароль").fill("local-test-password")
  await page.getByRole("button", { name: "Войти", exact: true }).click()
  await expect(page).toHaveURL("/")
  await expect(page.getByRole("heading", { name: "Материалы", exact: true })).toBeVisible()
  await expect(page.getByText("Локальный тестовый источник", { exact: true })).toBeVisible()
  await page.reload()
  await expect(page.getByText("Локальный тестовый источник", { exact: true })).toBeVisible()
  await page.getByRole("link", { name: "Готовые ответы", exact: true }).first().click()
  await expect(page).toHaveURL(/\/faq$/)
  await page.getByRole("link", { name: "Материалы", exact: true }).first().click()
  await expect(page).toHaveURL("/")
  await page.getByRole("button", { name: "Выйти", exact: true }).click()
  await expect(page).toHaveURL(/\/login$/)
  await page.goto("/")
  await expect(page).toHaveURL(/\/login$/)
  expect(errors).toEqual([])
})

test("public rating works without an auth cookie and serves real Nitro data", async ({ page, context }) => {
  const response = await page.request.get("/api/rating")
  expect(response.ok()).toBe(true)
  expect((await response.json()).items).toHaveLength(4)
  await page.goto("/rating")
  await expect(page).toHaveURL(/\/rating$/)
  await expect(page.locator(".nsu-mock-page")).toBeVisible()
  await expect(page.getByText("Факультет информационных технологий").first()).toBeVisible()
  expect((await context.cookies()).some(cookie => cookie.name === "abitur-token")).toBe(false)
})
