<template lang="pug">
u-container(class="py-8 space-y-6")
  div(class="space-y-2")
    h1(class="text-3xl font-bold text-gray-900 dark:text-white") Системные логи
    p(class="text-gray-500 dark:text-gray-400")
      | Просмотр последних строк лог-файлов сервера и скачивание полных файлов.

  ui-box(title="Логи")
    system-logs-log-viewer
</template>
