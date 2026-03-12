import { fileURLToPath } from "node:url"

import { defineConfig } from "vitest/config"

export default defineConfig({
  resolve: {
    alias: {
      "~": fileURLToPath(new URL("./app", import.meta.url)),
      "~~": fileURLToPath(new URL("./", import.meta.url)),
    },
  },
  test: {
    environment: "happy-dom",
    include: ["app/**/*.test.ts"],
  },
})
