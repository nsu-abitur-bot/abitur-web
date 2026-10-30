# Административная панель

Утверждённый прототип хранится в `docs/design/prototype.html`, стили — в
`docs/design/ui-system/ui-refined.css`. Это визуальный источник, его fixtures и
демонстрационные переключатели не являются частью приложения. API-ограничения
описаны в `docs/design/backend-fit-review.md`.

Реализация: `app/styles/admin.css`, `app/app.config.ts`, `app/layouts/default.vue`.
Системный sans, шаг 4px, primary #4b4bd2, панели 10px, контролы 8px. Для dark
используются семантические `--admin-*` переменные. Не переносить глобальные
селекторы HTML-прототипа в приложение.

Страницы используют `UiPage` (title, description, default/actions) и `UiBox`
(title optional, default/right). Общие классы: admin-page, admin-page-header,
admin-panel, admin-toolbar, admin-table-wrap, admin-table, admin-empty,
admin-section-header, admin-form-grid, admin-subnav, admin-detail,
admin-stat-grid, admin-muted, admin-actions. Классы отвечают только за вид.

Материалы: компактная таблица Название / Тип / Состояние; операции в панели и
меню строки. MIME неизвестен, PDF по URL помечен как предположение. Document.status
не доказывает индексацию: ready подтверждается diagnostics processed. Диагностика
загружается с concurrency 3 один раз при загрузке списка, не при поиске.
Поиск/состояние сохраняются в query и при переходе в документ. Ошибки загрузки,
пустая база и отсутствие совпадений показаны отдельно. Меню сворачивается на узком
экране, клавиатурный фокус видим, ссылка пропуска ведёт к содержимому.
