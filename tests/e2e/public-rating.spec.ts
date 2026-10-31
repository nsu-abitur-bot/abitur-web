import { expect, test } from "@playwright/test"

test.describe("public rating profile gate", () => {
  test.describe.configure({ mode: "serial" })

  test.afterEach(async ({ request }) => {
    await request.get("http://127.0.0.1:9465/__test/profile/nsu")
  })

  for (const profile of ["custom", "unavailable", "missing", "unknown"]) {
    test(`${profile} cannot expose the NSU rating`, async ({ page, request, context }) => {
      await request.get(`http://127.0.0.1:9465/__test/profile/${profile}`)
      const response = await request.get("/api/rating")
      expect(response.status()).toBe(profile === "custom" ? 404 : 503)
      expect(await response.text()).not.toContain("Факультет информационных технологий")
      await page.goto("/rating")
      await expect(page).toHaveURL(/\/rating$/)
      await expect(page.locator(".nsu-mock-page")).toHaveCount(0)
      await expect(page.getByText(profile === "custom" ? "Рейтинг недоступен для этого университета" : "Не удалось загрузить рейтинг. Повторите попытку.")).toBeVisible()
      expect((await context.cookies()).some(cookie => cookie.name === "abitur-token")).toBe(false)
      if (profile !== "custom") {
        await request.get("http://127.0.0.1:9465/__test/profile/nsu")
        await page.getByRole("button", { name: "Повторить" }).click()
        await expect(page.locator(".nsu-mock-page")).toBeVisible()
      }
    })
  }

  test("profile changes revoke cached NSU data and allow recovery", async ({ request }) => {
    expect((await request.get("/api/rating", { headers: { Cookie: "abitur-token=staff-cookie", Authorization: "Bearer staff-token" } })).status()).toBe(200)
    await request.get("http://127.0.0.1:9465/__test/profile/custom")
    expect((await request.get("/api/rating")).status()).toBe(404)
    await request.get("http://127.0.0.1:9465/__test/profile/nsu")
    expect((await request.get("/api/rating")).status()).toBe(200)
  })
})
