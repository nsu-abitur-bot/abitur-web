<script setup lang="ts">
import { createFaculty, getFaculties } from "~/services/faculties"

const toast = useToast()

const { data, status, error, refresh } = await useAsyncData("faculties", getFaculties)

const faculties = computed(() => data.value ?? [])

const isCreating = ref(false)
const showCreate = ref(false)
const newFaculty = reactive({
  name: "",
  aliases: "",
  is_active: true,
})

const parseAliases = (value: string): string[] =>
  value
    .split(",")
    .map(a => a.trim())
    .filter(Boolean)

const addFaculty = async () => {
  const name = newFaculty.name.trim()
  if (!name) {
    return
  }
  isCreating.value = true
  try {
    await createFaculty({
      name,
      aliases: parseAliases(newFaculty.aliases),
      is_active: newFaculty.is_active,
    })
    showCreate.value = false
    newFaculty.name = ""
    newFaculty.aliases = ""
    newFaculty.is_active = true
    toast.add({ title: "Факультет добавлен", color: "success" })
    await refresh()
  } catch {
    toast.add({
      title: "Ошибка",
      description: "Не удалось добавить факультет",
      color: "error",
    })
  } finally {
    isCreating.value = false
  }
}
</script>

<template lang="pug">
ui-page(title="Факультеты и направления")
  template(#actions)
    u-button(icon="i-lucide-plus" @click="showCreate = !showCreate") {{ showCreate ? "Закрыть форму" : "Добавить факультет" }}
  div(class="space-y-4")

    ui-box(v-if="showCreate" title="Новый факультет")
      u-form(:state="newFaculty" class="space-y-3" @submit="addFaculty")
        div(class="flex flex-wrap items-end gap-3")
          u-form-field(label="Название факультета" name="name" required class="flex-1 min-w-56")
            u-input(v-model="newFaculty.name" placeholder="Например: Факультет информационных технологий" class="w-full")
          u-form-field(label="Аббревиатуры (через запятую)" name="aliases" class="flex-1 min-w-48")
            u-input(v-model="newFaculty.aliases" placeholder="ФИТ, Факультет ИТ" class="w-full")
        div(class="flex items-center justify-between gap-3")
          div(class="flex items-center gap-2")
            u-switch(v-model="newFaculty.is_active")
            span(class="text-xs text-gray-500") Активен
          u-button(type="submit" color="primary" :loading="isCreating") Добавить факультет

    ui-empty-state(v-if="status === 'pending'" kind="loading" title="Загрузка факультетов…")
    ui-empty-state(v-else-if="error" kind="error" title="Не удалось загрузить факультеты")
      u-button(color="neutral" variant="outline" @click="() => refresh()") Повторить
    ui-empty-state(v-else-if="!faculties.length" title="Факультетов пока нет")

    div(v-else class="space-y-4")
      faculties-faculty-card(
        v-for="faculty in faculties"
        :key="faculty.id"
        :faculty="faculty"
        @changed="refresh"
      )
</template>
