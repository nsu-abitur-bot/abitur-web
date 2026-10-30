# Repository Guidelines

## Project Structure & Module Organization

This is a Nuxt 4 TypeScript application. Main app code lives in `app/`: pages in `app/pages`, reusable Vue components in `app/components`, composables in `app/composables`, services in `app/services`, stores in `app/stores`, and shared styles in `app/styles`. Server routes are under `server/api`. Shared TypeScript declarations are in `types`. Static assets are in `public`; `public/nsu` contains bundled legacy assets and is excluded from linting. Tests are colocated with source as `*.test.ts` files under `app/`.

## Build, Test, and Development Commands

Use the pinned toolchain in `.mise.toml`: `mise trust`, `mise install`, then `mise exec -- bun install --frozen-lockfile`. Never use a shared or symlinked node_modules across worktrees.

- `task dev`: start Nuxt (port from `.env`, usually 7868).
- `task prepare`: generate `.nuxt` and API imports.
- `task types`: Golar 0.1.9 with @golar/vue checks client Vue/TS/Pug; built-in `bun check --no-script` checks server, shared and tooling projects.
- `task types:verify`: prove that invalid Pug template and server TS fixtures fail type checking.
- `task lint`: ESLint and Stylelint without auto-fixing.
- `task test`: run the existing Vitest 5 / happy-dom unit tests.
- `task check`: types, lint and unit tests, with prepare dependencies.
- `task build`: prepare and production build; `bun run start` runs the result using Node.
- `task e2e`: Playwright against production output and an isolated local fake API; build first and install Chromium with `bunx --no-install playwright install chromium`.
- `task hooks`: install Lefthook; pre-commit runs `task check` without modifying files.
- `docker compose up -d --build`: build and run at `http://localhost:3000`.

## Orca Workspaces

`orca.yaml` runs mise trust/install, copies `.env` from the root checkout when absent, installs with the frozen Bun lockfile, prepares Nuxt and installs hooks. Setup must finish before agent startup. Each worktree owns its node_modules and generated files; no shared dependencies. Dependency installation must never trigger the full check suite.

## Coding Style & Naming Conventions

Use TypeScript, Vue single-file components, and the existing Nuxt conventions. Prefer kebab-case for Vue component filenames such as `faq-item.vue`, `rate-limit-settings.vue`, and route files. Keep tests named after the unit they cover, for example `rag-upload.test.ts`. Use the configured `@ilyasemenov` ESLint and Stylelint presets; do not manually reformat files in ways that fight `task lint`. Path aliases in tests are `~` for `app` and `~~` for the repository root.

## Testing Guidelines

Vitest is configured in `vitest.config.ts` and only includes `app/**/*.test.ts`. Add focused unit tests next to the service, utility, or composable being changed. Use `happy-dom` assumptions for DOM-related tests. Before opening a PR, run `task check`, `task types:verify`, `task build` and `task e2e`.

## Commit & Pull Request Guidelines

Recent commits use short Russian imperative summaries, for example `Добавил настройки на rate limits` or `Починил feedback`. Keep commit messages concise and behavior-focused. Pull requests should include a short description, linked issue or task when available, test results, and screenshots for visible UI changes. Mention any `.env`, Docker, OpenAPI, or backend-contract changes explicitly.

## Security & Configuration Tips

Do not commit real secrets. Keep local values in `.env`, using `.env.example` as the template. When `openapi.json` changes, verify generated or dependent API types before merging.
