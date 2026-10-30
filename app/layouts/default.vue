<template lang="pug">
.admin-shell
  a.admin-skip(href="#main-content") К содержимому
  layout-header
  main#main-content.admin-content(tabindex="-1")
    slot
</template>
