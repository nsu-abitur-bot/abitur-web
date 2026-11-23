import process from "node:process"

import { defineConfig, devices } from "@playwright/test"

// These files change the fake API's shared profile/branding and Nitro cache.
// Run them only after every read-only project finishes, with one worker.
const sharedStateFiles = [
  "admin-shell.spec.ts",
  "branding-first-paint.spec.ts",
  "public-rating.spec.ts",
  "university-identity.spec.ts",
]

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : 1,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: "http://127.0.0.1:9464",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    { name: "chromium", testIgnore: ["sidebar-scroll.spec.ts", ...sharedStateFiles], use: { ...devices["Desktop Chrome"] } },
    { name: "chromium-sidebar", testMatch: "sidebar-scroll.spec.ts", use: { ...devices["Desktop Chrome"], launchOptions: { ignoreDefaultArgs: ["--hide-scrollbars"], args: ["--disable-features=OverlayScrollbar"] } } },
    { name: "webkit", testMatch: "sidebar-scroll.spec.ts", use: { ...devices["Desktop Safari"] } },
    {
      name: "chromium-stateful",
      testMatch: sharedStateFiles,
      dependencies: ["chromium", "chromium-sidebar", "webkit"],
      workers: 1,
      use: { ...devices["Desktop Chrome"] },
    },
  ],
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
