import process from "node:process"

import { defineConfig, devices } from "@playwright/test"

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  // Public-profile regressions change the isolated fake backend between requests.
  workers: 1,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: "http://127.0.0.1:9464",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: [
    {
      command: "node tests/e2e/fake-api.mjs",
      url: "http://127.0.0.1:9465/health",
      reuseExistingServer: false,
    },
    {
      command: "node tests/e2e/start-production.mjs",
      url: "http://127.0.0.1:9464/login",
      reuseExistingServer: false,
      env: {
        NITRO_HOST: "127.0.0.1",
        NITRO_PORT: "9464",
        NUXT_PUBLIC_API_BASE_URL: "http://127.0.0.1:9465",
        NUXT_SESSION_PASSWORD: "isolated-e2e-session-password-32-characters",
        NUXT_DATABASE_URL: "",
        NUXT_SERVICE_TOKEN: "",
      },
    },
  ],
})
