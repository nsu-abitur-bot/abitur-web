# Repository Guidelines

## Project Structure & Module Organization

This is a Nuxt 4 TypeScript application. Main app code lives in `app/`: pages in `app/pages`, reusable Vue components in `app/components`, composables in `app/composables`, services in `app/services`, stores in `app/stores`, and shared styles in `app/styles`. Server routes are under `server/api`. Shared TypeScript declarations are in `types`. Static assets are in `public`; `public/nsu` contains bundled legacy assets and is excluded from linting. Tests are colocated with source as `*.test.ts` files under `app/`.

## Build, Test, and Development Commands

- `pnpm i`: install dependencies using the pinned pnpm version.
- `cp .env.example .env`: create local configuration, then fill backend and runtime values.
- `pnpm dev`: start Nuxt locally, usually at `http://localhost:7868` unless `.env` overrides it.
- `pnpm test`: run Vitest tests in `happy-dom`.
- `pnpm run lint`: run ESLint and Stylelint with auto-fix.
- `pnpm run types`: run Nuxt type checking.
- `pnpm run check`: run linting and type checking together.
- `docker-compose up -d --build`: build and run the app container; the README documents `http://localhost:3000`.

## Coding Style & Naming Conventions

Use TypeScript, Vue single-file components, and the existing Nuxt conventions. Prefer kebab-case for Vue component filenames such as `faq-item.vue`, `rate-limit-settings.vue`, and route files. Keep tests named after the unit they cover, for example `rag-upload.test.ts`. Use the configured `@ilyasemenov` ESLint and Stylelint presets; do not manually reformat files in ways that fight `pnpm run lint`. Path aliases in tests are `~` for `app` and `~~` for the repository root.

## Testing Guidelines

Vitest is configured in `vitest.config.ts` and only includes `app/**/*.test.ts`. Add focused unit tests next to the service, utility, or composable being changed. Use `happy-dom` assumptions for DOM-related tests. Before opening a PR, run `pnpm test` and `pnpm run check`.

## Commit & Pull Request Guidelines

Recent commits use short Russian imperative summaries, for example `Добавил настройки на rate limits` or `Починил feedback`. Keep commit messages concise and behavior-focused. Pull requests should include a short description, linked issue or task when available, test results, and screenshots for visible UI changes. Mention any `.env`, Docker, OpenAPI, or backend-contract changes explicitly.

## Security & Configuration Tips

Do not commit real secrets. Keep local values in `.env`, using `.env.example` as the template. When `openapi.json` changes, verify generated or dependent API types before merging.
