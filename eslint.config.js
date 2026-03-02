// @ts-check

import { defineConfig } from "@ilyasemenov/eslint-config"

export default defineConfig({
  vue: true,
  vuePug: true,
  formatters: {
    markdown: true,
  },
  ignores: ["ton/build"],
  rules: {
    // Чтобы не вставлял trustPolicy: no-downgrade, т.к. на 12.02.2026 это ломает кучу зависимостей
    "pnpm/yaml-enforce-settings": "off",
  },
})
