// @ts-check

import { defineConfig } from "@ilyasemenov/eslint-config"

export default defineConfig({
  vue: true,
  vuePug: true,
  formatters: {
    markdown: true,
  },
  ignores: [
    "ton/build",
    "public/nsu",
    "app/pages/rating.vue",
  ],
})
