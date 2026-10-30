## Подготовка

Toolchain закреплён в `.mise.toml`: Node 24.18.1, Bun 1.4.4, Task 3.54.0 и Lefthook 2.2.2. Установите [mise](https://mise.jdx.dev/getting-started.html), затем:

```bash
mise trust
mise install
mise exec -- bun install --frozen-lockfile
cp .env.example .env
mise exec -- task hooks
```

Заполните `.env` адресом бэкенда и локальными настройками. В активированном mise shell можно опускать `mise exec --`. Установка зависимостей генерирует `.nuxt`, но не запускает все проверки и не устанавливает git hooks автоматически.

При обновлении существующего checkout с pnpm сначала уберите старый `node_modules`, затем выполните чистую установку Bun. Frozen install поверх старого каталога может оставить `.pnpm` и несовместимые транзитивные зависимости:

```bash
mv node_modules ../abitur-node-modules-before-bun
mise exec -- bun install --frozen-lockfile
```

Каталог с резервной копией можно удалить после успешного `task check`; не используйте его в других worktree.

## Разработка и проверки

```bash
task dev           # Nuxt, порт из .env (обычно 7868)
task prepare       # генерация .nuxt и OpenAPI imports
task types         # Golar: Vue/TS/Pug; bun check: server/shared/tooling
task types:verify  # проверка, что ошибочный Pug и server TS действительно отклоняются
task lint          # ESLint + Stylelint без изменения файлов
task test          # Vitest 5 / happy-dom, существующие unit tests
task check         # prepare, types, lint и test
task build         # production build с предварительным prepare
bun run start      # Node запускает .output/server/index.mjs
```

Типы клиента проверяются Golar 0.1.9 и соответствующим `@golar/vue` 0.1.9. Pug включён через `@vue/language-plugin-pug` в Nuxt; `tsconfig.client.json` наследует сгенерированные настройки вместе с плагином Router. Серверные файлы проверяются отдельно встроенным `bun check --no-script`: флаг предотвращает запуск одноимённого package script. Lefthook запускает `task check` до commit, не форматируя рабочие файлы.

Каждый Orca worktree устанавливает собственный `node_modules`. Setup доверяет локальному mise config, устанавливает закреплённые инструменты, копирует локальный `.env` из root checkout, выполняет frozen install, prepare и установку hooks. Общий каталог зависимостей не поддерживается.

Nuxt 4.6.2 требует `vue-router ^5.4.0`, поэтому согласованная версия Router — 5.4.0 вместо первоначально запрошенной 5.2.0. Обе части приложения используют одну версию Router; overrides вне диапазонов зависимостей не применяются. Nuxt UI обновлён до 4.12.0 для официальной поддержки Router 5 и TypeScript 6, а Nuxt Icon до 2.6.2 для совместимости с новым UI.

## Браузерные E2E

```bash
task build
bunx --no-install playwright install chromium
task e2e
```

Playwright копирует только `.output` во временный каталог без зависимостей проекта и запускает production на `127.0.0.1:9464` и отдельный fake API на `127.0.0.1:9465`; порты должны быть свободны. Проверяются protected route, ошибочный и успешный вход, основной экран базы знаний, навигация, отмена и подтверждение выхода с несохранённым черновиком, истечение сессии при сохранении, 409/rebase и явное удаление секрета, ограничения admin/viewer и публичный `/rating` с настоящим Nitro API. Используются только фиктивные локальные credentials. Внешние запросы браузера блокируются, неизвестные fake API endpoints возвращают ошибку; платные модели и рабочие токены не используются. HTML report расположен в `playwright-report`, traces/video/screenshots при ошибке — в `test-results`. CI выполняет frozen install, все проверки, production build и E2E, сохраняя HTML report при любом результате, а traces/video/screenshots при ошибке.

## Docker

```bash
docker compose up -d --build
```

Приложение доступно по `http://localhost:3000`. Docker использует Bun 1.4.4 с frozen lockfile и кешем загрузок, а build/runtime — Node 24.18.1. Итоговый образ содержит только `.output`, без каталога зависимостей проекта. Для запуска нужны `NUXT_SESSION_PASSWORD` (не менее 32 символов) и `NUXT_DATABASE_URL`; локальные значения задаются в Compose. Production вне Docker требует тех же переменных окружения и `NUXT_PUBLIC_API_BASE_URL` для адреса бэкенда.
