// @ts-check

import { defineConfig } from "@ilyasemenov/stylelint-config"

export default defineConfig({
  vue: true,
  tailwind: true,
  ignoreFiles: [
    "public/nsu/**",
    "app/pages/rating.vue",
  ],
})
