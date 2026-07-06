<script setup lang="ts">
import { createFaculty, getFaculties } from "~/services/faculties"

const toast = useToast()

const { data, status, refresh } = await useAsyncData("faculties", getFaculties)

const faculties = computed(() => data.value ?? [])

const isCreating = ref(false)
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
u-container(class="py-8")
  div(class="space-y-6")
    h1(class="text-3xl font-bold text-gray-900 dark:text-white") Факультеты и направления

    ui-box(title="Добавить факультет")
      p(class="text-sm text-gray-500 dark:text-gray-400 mb-4")
        | Справочник факультетов и направлений используется для умной проверки
        | ответов бота — чтобы не смешивать направления разных факультетов.

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

    div(v-if="status === 'pending'" class="py-10 flex justify-center text-gray-500")
      u-icon(name="i-heroicons-arrow-path" class="animate-spin w-8 h-8")

    div(v-else-if="faculties.length === 0" class="py-12 text-center text-gray-500 bg-gray-50 dark:bg-gray-800 rounded-lg")
      u-icon(name="i-heroicons-academic-cap" class="w-12 h-12 mx-auto text-gray-400 mb-3")
      p Факультеты пока не добавлены. Создайте первый.

    div(v-else class="space-y-4")
      faculties-faculty-card(
        v-for="faculty in faculties"
        :key="faculty.id"
        :faculty="faculty"
        @changed="refresh"
      )
</template>
