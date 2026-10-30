<script setup lang="ts">
import { onKeyStroke } from "@vueuse/core"

const route = useRoute()
const token = useAuthToken()
const { isAdmin } = useRole()
const open = ref(false)
onKeyStroke("Escape", () => {
  open.value = false
})
watch(() => route.fullPath, () => {
  open.value = false
})
const groups = computed(() => [
  { title: "База знаний", items: isAdmin.value
    ? [
        ["Материалы", "/", "i-lucide-files"],
        ["Вопросы и ответы", "/faq", "i-lucide-messages-square"],
        ["Сокращения", "/abbrev", "i-lucide-text"],
        ["Факультеты", "/faculties", "i-lucide-graduation-cap"],
      ]
    : [] },
  { title: "Аналитика", items: [["Статистика", "/stats", "i-lucide-chart-no-axes-combined"], ["Сообщения", "/messages", "i-lucide-message-circle"], ["Обратная связь", "/feedback", "i-lucide-inbox"]] },
  { title: "Управление", items: isAdmin.value ? [["Проверка поиска", "/rag/inspector", "i-lucide-search"], ["Тестирование", "/testing", "i-lucide-flask-conical"], ["Настройки", "/settings", "i-lucide-settings-2"], ["Логи системы", "/system-logs", "i-lucide-scroll-text"]] : [] },
])
function logout() {
  token.value = null
  navigateTo("/login")
}
</script>

<template lang="pug">
header.admin-topbar
  u-button.admin-menu(icon="i-lucide-menu" color="neutral" variant="ghost" aria-label="Меню" :aria-expanded="open" aria-controls="admin-navigation" @click="open = !open")
  span.admin-muted Администрирование
  .admin-actions
    u-color-mode-button
    u-button(v-if="token" color="neutral" variant="ghost" icon="i-lucide-log-out" @click="logout") Выйти
aside#admin-navigation.admin-sidebar(:class="{ 'is-open': open }")
  nuxt-link.admin-brand(to="/")
    span.admin-brand-mark а
    span Абитуриент
      small Панель управления
  nav(aria-label="Основная навигация")
    template(v-for="group in groups" :key="group.title")
      details(v-if="group.items.length" open)
        summary {{ group.title }}
        nuxt-link(v-for="item in group.items" :key="item[1]" :to="item[1]" :aria-current="route.path === item[1] || (item[1] === '/' && route.path.startsWith('/rag/document/')) ? 'page' : undefined")
          u-icon(:name="item[2]")
          span {{ item[0] }}
</template>
