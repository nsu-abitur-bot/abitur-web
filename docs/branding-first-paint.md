# Первое отображение бренда (#48)

SPA остаётся с `ssr: false`: авторизация, страницы и клиентские зависимости не
переносятся на сервер. Узкий Nitro `render:html` hook получает публичный бренд
перед отправкой HTML. Используется только абсолютный HTTP(S)
`runtimeConfig.public.apiBaseUrl` / `NUXT_PUBLIC_API_BASE_URL`, включая префикс
пути. Значение runtime, поэтому один image можно запускать для разных экземпляров.
Host/X-Forwarded-Host, query, cookie и Authorization посетителя адрес запроса не
задают и не пересылаются; redirect запрещён. Relative API base для серверного
bootstrap не допускается: без доверенного origin используется нейтральный fallback.

Запрос ограничен 1200 мс (включая чтение body), 16 KiB, без повторов. Каждый
HTML-запрос проверяет API заново; не кешируем свежесть успешного ответа. При ошибке
используется последнее корректное значение **того же полного configured endpoint**
в этом Nitro-процессе не старше 5 минут; Map ограничен 8 endpoints. При отсутствии
такого значения — нейтральный «Университет», slate-акцент и проектная иконка.
Это ограниченный fallback, не блокирующий всё приложение loader. После перезапуска
процесса last-good memory нет. CDN/HTML response имеет `Cache-Control: no-store`;
не включайте HTML cache/SWR поверх него, иначе свежесть и изоляция не гарантируются.

В исходный head попадают title, палитра, иконка, image preload и JSON whitelist
(6 полей API, включая revision, без provider/bot/contact data). Имена и URL
экранируются для HTML; JSON экранирует `<`, `>`, `&`, U+2028/U+2029, так что даже
`</script>` в имени не может закрыть JSON script. Цвет принимается только как
`#RRGGBB`; CSS строится из вычисленных цветов и фиксированных имён переменных.
Схема валидируется заново на клиенте. URL только HTTP(S), без credentials или
protocol-relative формы. Сервер изображения не скачивает.

Pre-plugin записывает JSON snapshot в `nuxtApp.payload.data.branding` до mount.
`useAsyncData` читает его как initial cache, поэтому первый Vue render использует
тот же бренд без ожидания второго client fetch. Style/icon имеют общие Unhead
keys: после mount не остаются дубли и последующий Save может обновить head.
Логотип начинает грузиться из head preload; пока изображение в сети, имеется
image slot вместо неправильной fallback-буквы. Только фактическая ошибка img
даёт инициалы. Акцент fallback-mark тоже использует сохранённую палитру.

Save/Cancel/rebase по-прежнему вызывают refresh общего бренда. Успешный ответ
проверяется и становится last-good client state; ошибка/невалидный ответ
`useAsyncData` возвращает к этому state, не к фиолетовому default. При старте без
bootstrap (например HTML из старого image) публичный client fetch тоже ограничен
1200 мс и не передаёт credentials. Изменений OpenAPI, backend, БД, Docker volumes,
настроек моделей и промптов нет.

## Проверки

`tests/e2e/branding-first-paint.spec.ts` работает с production build и локальным
fake API. Пустой browser context, искусственно задержанные JS/client branding/
изображение, login и authenticated deep route, desktop/mobile, light/dark.
Проверяются исходный HTML до JS, первые rAF snapshots, логотип без fallback-буквы,
preload, единственные palette/icon, reload, XSS-имена, ограниченная ошибка API,
last-good и отсутствие credential/Host forwarding. Тесты записывают trace,
initial.html, early-frames.json и PNG. Unit tests проверяют whitelist, escaping,
TTL и изоляцию configured endpoints, лимит body и неверную конфигурацию.

Nuxt API использованы по официальным источникам:

- [Nuxt lifecycle: render:html](https://github.com/nuxt/nuxt/blob/main/docs/3.guide/1.concepts/2.nuxt-lifecycle.md)
- [useAsyncData payload cache](https://github.com/nuxt/nuxt/blob/main/docs/4.api/2.composables/use-async-data.md)

Независимое ревью, merge/deploy и повторную first-paint проверку настоящего
nsu.abitur.site организует координатор. Эта реализация сервер/настройки сайта не
меняет. Локальные результаты и evidence: `/tmp/abitur-branding-48/fix-report.md`.
