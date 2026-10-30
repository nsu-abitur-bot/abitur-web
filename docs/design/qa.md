# Проверка редизайна #364

Проверено после интеграции настроек #356 (web PR #26) и обновления tooling #365 (web PR #27): Nuxt 4.6.2, Nuxt UI 4.12, Vue 3.5.44, Router 5.4, TypeScript 6, Bun 1.4.4 / Node 24.18.1.

## Автоматические проверки

- `mise exec -- bun install --frozen-lockfile` на чистом локальном `node_modules`.
- `mise exec -- task check`: ESLint, Stylelint, Golar client types, Bun server/shared/tooling types, 44 unit tests.
- `mise exec -- task types:verify`: ошибочные Pug и server TypeScript fixtures действительно отклоняются.
- `mise exec -- task build`: production Nitro artifact.
- `mise exec -- task e2e`: 8 Playwright сценариев; production artifact запускается вне checkout без fallback на зависимости проекта, fake API изолирован, внешние запросы заблокированы.

Playwright проверяет ошибочный/успешный вход, reload и навигацию; отмену выхода с сохранением cookie/черновика, подтверждённый выход и повторный защищённый вход; 401 при сохранении dirty настроек; 409/rebase с сохранением секрета и явный null clear; права viewer/admin; публичный rating с настоящим Nitro API; реальные пиксели диаграммы и переключение темы без изменения глобальных CSS variables.

## Браузерная матрица

Проверялись production build и локальный QA API. Скриншоты сняты после hydration, ожидания текста состояния и завершения цветовых переходов.

| Раздел                                 | 1049×881 / 390 px, light/dark | Состояния и поведение                                                                                                     |
| -------------------------------------- | ----------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Материалы / документ                   | Да                            | Список, поиск в URL, empty/error/retry, диагностика без повторного GET при поиске                                         |
| Добавление материалов                  | Да                            | Два файла с частичной ошибкой, ссылка/parse preview, CSV preview, ручной текст/preprocess/confirm, selected check, DELETE |
| Подключения / правила / темы / команда | Да                            | Полный каталог, маска секрета, 409/rebase/повторный save/null clear, dirty navigation/logout/401                          |
| FAQ / сокращения / факультеты          | Да                            | Loaded, empty/error, FAQ create, сохранённые CRUD/CSV действия                                                            |
| Сообщения / обратная связь             | Да                            | Loaded/empty/error, порции offset500, числовой user filter, session logs, viewer feedback PATCH                           |
| Статистика                             | Да                            | Loaded, одиночная точка и диаграмма тем, смена периода и темы                                                             |
| Инспектор / автооценка                 | Да                            | Chunks без sources, runner idle/running/result/error, реальный 0%, запрет неподтверждённого повторного запуска            |
| Системные логи / login / register      | Да                            | Loaded/empty/error, переходы и публичные auth routes                                                                      |

В сценариях с мутациями API ответы перехватывались fixtures: реальные LLM, импорт, удаление, изменение ролей и настроек не выполнялись. Проверены отсутствие ошибок JavaScript и горизонтального overflow страницы; широкие таблицы прокручиваются внутри своей панели. При визуальном QA исправлены удаление cookie после размонтирования шапки, цвета canvas, отрисовка данных графиков и компактная сетка статистики.

## Живой QA API

`127.0.0.1:8356`, изолированная БД `abitur_settings_356_qa`, synthetic superadmin/admin/viewer. Login, me, docs, FAQ, abbrev, faculties и каталог настроек работают; все 72 поля из 7 групп отрисованы, secret values равны null. Ответы 200/403 соответствуют ролям; viewer home ведёт в feedback.

`GET /evals/status` возвращает 500 из-за недоступного Redis: интерфейс показывает ошибку и не изображает успешный запуск. Успешный runner проверен fixtures; полноценная live оценка с провайдерами не выполнялась. MIME, общий processing progress, health и история запусков не выдумываются при отсутствии соответствующих полей API. Backend-контракт и конфигурация окружения редизайном не меняются.

## Скриншоты

- [Материалы, desktop light](screenshots/materials-1049-light.png)
- [Материалы, mobile dark](screenshots/materials-390-dark.png)
- [Подключения, desktop dark](screenshots/connections-1049-dark.png)
- [Статистика, desktop light](screenshots/stats-1049-light.png)
