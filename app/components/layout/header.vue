<script setup lang="ts">
import { onKeyStroke } from "@vueuse/core"

type NavItem = [label: string, to: string, icon: string]
const route = useRoute()
const router = useRouter()
const token = useAuthToken()
const { isAdmin, isSuperadmin } = useRole()
const { data: university } = useAsyncData("university", () => apiFetch<{ short_name: string, assistant_name: string, email: string, phone: string, address: string }>("/api/v1/university"))
const open = ref(false)
onKeyStroke("Escape", () => {
  open.value = false
})
watch(() => route.fullPath, () => {
  open.value = false
})
const groups = computed<{ title?: string, items: NavItem[] }[]>(() => [
  { title: "Обращения", items: [["Обратная связь", "/feedback", "i-lucide-inbox"], ["Сообщения", "/messages", "i-lucide-message-circle"]] },
  { title: "Знания", items: isAdmin.value
    ? [
        ["Материалы", "/", "i-lucide-files"],
        ["Готовые ответы", "/faq", "i-lucide-messages-square"],
        ["Сокращения", "/abbrev", "i-lucide-text"],
        ["Факультеты", "/faculties", "i-lucide-graduation-cap"],
      ]
    : [] },
  { items: isAdmin.value ? [["Проверка ответа", "/rag/inspector", "i-lucide-search"], ["Автооценка", "/testing", "i-lucide-flask-conical"]] : [] },
  { items: [["Статистика", "/stats", "i-lucide-chart-no-axes-combined"]] },
  { title: "Настройки", items: isAdmin.value
    ? [
        ...(isSuperadmin.value ? [["Подключения", "/settings?section=connections", "i-lucide-plug"] as NavItem] : []),
        ["Правила и лимиты", "/settings?section=rules", "i-lucide-settings-2"],
        ["Темы", "/settings?section=topics", "i-lucide-tags"],
        ...(isSuperadmin.value ? [["Команда", "/settings?section=team", "i-lucide-users"] as NavItem] : []),
      ]
    : [] },
  { items: isAdmin.value ? [["Системные логи", "/system-logs", "i-lucide-scroll-text"]] : [] },
])
function active(to: string) {
  const [path, query] = to.split("?")
  if (path === "/") {
    return route.path === "/" || route.path.startsWith("/rag/document/")
  }
  if (query) {
    const section = new URLSearchParams(query).get("section")
    return route.path === path && (route.query.section || (isSuperadmin.value ? "connections" : "rules")) === section
  }
  return route.path === path || route.path.startsWith(`${path}/`)
}
async function logout() {
  await navigateTo("/login")
  if (router.currentRoute.value.path === "/login") {
    // The header is unmounted after navigation, so its cookie watcher has stopped.
    document.cookie = "abitur-token=; Max-Age=0; Path=/"
    token.value = null
  }
}
</script>

<template lang="pug">
header.admin-topbar
  span(v-if="university" :title="[university.email, university.phone, university.address].filter(Boolean).join(' · ')") {{ university.short_name }} · {{ university.assistant_name }}
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
    template(v-for="(group, index) in groups" :key="index")
      template(v-if="group.items.length")
        details(v-if="group.title" :open="group.items.some(item => active(item[1]))")
          summary {{ group.title }}
          nuxt-link(v-for="item in group.items" :key="item[1]" :to="item[1]" :aria-current="active(item[1]) ? 'page' : undefined")
            u-icon(:name="item[2]")
            span {{ item[0] }}
        .admin-nav-direct(v-else)
          nuxt-link(v-for="item in group.items" :key="item[1]" :to="item[1]" :aria-current="active(item[1]) ? 'page' : undefined")
            u-icon(:name="item[2]")
            span {{ item[0] }}
</template>
