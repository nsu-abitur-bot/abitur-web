<script setup lang="ts">
const { isSuperadmin, isAdmin } = useRole()
const route = useRoute()
const section = computed(() => typeof route.query.section === "string" && ["connections", "rules", "topics", "team"].includes(route.query.section) ? route.query.section : isSuperadmin.value ? "connections" : "rules")
const sections = computed(() => [
  ...(isSuperadmin.value ? [{ value: "connections", label: "Подключения" }] : []),
  { value: "rules", label: "Правила и лимиты" },
  { value: "topics", label: "Темы сообщений" },
  ...(isSuperadmin.value ? [{ value: "team", label: "Команда" }] : []),
])
const title = computed(() => sections.value.find(item => item.value === section.value)?.label ?? "Настройки")
</script>

<template lang="pug">
ui-page(:title="title")
  settings-instance-settings(v-show="section === 'connections'" v-if="isSuperadmin")

  div(v-if="isSuperadmin && section === 'team'" class="space-y-5 min-w-0")
    admin-list
    admin-invite

  div(v-if="isAdmin" v-show="section === 'rules'" class="space-y-5 min-w-0")
    settings-rate-limit-settings
    settings-crag-settings
    settings-faq-settings

  div(v-show="section === 'topics'" class="space-y-5 min-w-0")
    settings-topics-settings
</template>
