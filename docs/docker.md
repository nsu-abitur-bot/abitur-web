# Docker: запуск проекта

## 1. Сборка образа

В корне проекта выполните:

```sh
docker build -t abitur-web:local .
```

## 2. Запуск контейнера

Минимальный запуск:

```sh
docker run --rm -p 3000:3000 -e NUXT_SESSION_PASSWORD=local-session-password-min-32-chars -e NUXT_DATABASE_URL=postgres://user:pass@host:5432/abitur_web abitur-web:local
```

После запуска приложение будет доступно по адресу:

http://localhost:3000

## 3. Запуск в фоне

Если нужно запустить контейнер в фоне:

```sh
docker run -d --name abitur-web --restart unless-stopped -p 3000:3000 -e NUXT_SESSION_PASSWORD=local-session-password-min-32-chars -e NUXT_DATABASE_URL=postgres://user:pass@host:5432/abitur_web abitur-web:local
```

Проверка логов:

```sh
docker logs -f abitur-web
```

Остановка и удаление контейнера:

```sh
docker stop abitur-web && docker rm abitur-web
```

## 4. Важное про секреты

- Для NUXT_SESSION_PASSWORD используйте строку длиной минимум 32 символа.
- Передавайте NUXT_SESSION_PASSWORD и NUXT_DATABASE_URL через безопасные секреты в CI/CD или менеджер секретов.

## 5. Запуск одной командой (Docker Compose)

Если нужно автоматически поднять Postgres, приложение и миграции:

```sh
docker compose up --build
```

Compose поднимет сервисы:

- `db` (PostgreSQL 17) и создаст БД `abitur_web`
- `app` (Nuxt)
- `migrate` (разовый сервис для применения миграций)

После запуска приложение доступно по адресу:

http://localhost:3000
