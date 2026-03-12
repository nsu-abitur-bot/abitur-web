# Docker: запуск проекта

## 1. Сборка образа

В корне проекта выполните:

```sh
docker build -t abitur-web:local .
```

## 2. Запуск контейнера

Минимальный запуск:

```sh
docker run --rm -p 3000:3000 -e NUXT_SESSION_PASSWORD=change-me abitur-web:local
```

После запуска приложение будет доступно по адресу:

http://localhost:3000/abitur-web

## 3. Запуск в фоне

Если нужно запустить контейнер в фоне:

```sh
docker run -d --name abitur-web --restart unless-stopped -p 3000:3000 -e NUXT_SESSION_PASSWORD=change-me abitur-web:local
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

- Не используйте значение change-me в продакшене.
- Передавайте NUXT_SESSION_PASSWORD через безопасный секрет в CI/CD или менеджер секретов.
