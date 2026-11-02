// @ts-check

import { defineConfig } from "@ilyasemenov/stylelint-config"

export default defineConfig({
  vue: true,
  tailwind: true,
  ignoreFiles: [
    "playwright-report/**",
    "test-results/**",
    "public/nsu/**",
    "app/pages/rating.vue",
  ],
})
