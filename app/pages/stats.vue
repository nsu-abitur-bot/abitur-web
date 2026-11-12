<template lang="pug">
ui-page(title="Статистика")
  template(#actions)
    nuxt-link(to="/gaps" class="text-sm underline") Отчёт о пробелах u2192
  div(class="grid grid-cols-1 lg:grid-cols-2 gap-4")
    request-block
    token-block
    topics-block
    new-users-block
  question-block
</template>
