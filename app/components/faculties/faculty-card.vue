<script setup lang="ts">
import type { FacultyItem } from "~/services/faculties"
import {
  createProgram,
  deleteFaculty,
  EDUCATION_LEVELS,
  updateFaculty,
} from "~/services/faculties"

const props = defineProps<{
  faculty: FacultyItem
}>()

const emit = defineEmits<{
  (e: "changed"): void
}>()

const programs = computed(() => props.faculty.programs ?? [])

const toast = useToast()

const isEditing = ref(false)
const isSavingFaculty = ref(false)

const facultyState = reactive({
  name: props.faculty.name,
  aliases: (props.faculty.aliases ?? []).join(", "),
  is_active: props.faculty.is_active,
})

const startEdit = () => {
  facultyState.name = props.faculty.name
  facultyState.aliases = (props.faculty.aliases ?? []).join(", ")
  facultyState.is_active = props.faculty.is_active
  isEditing.value = true
}

const parseAliases = (value: string): string[] =>
  value
    .split(",")
    .map(a => a.trim())
    .filter(Boolean)

const onSaveFaculty = async () => {
  const name = facultyState.name.trim()
  if (!name) {
    return
  }
  isSavingFaculty.value = true
  try {
    await updateFaculty(props.faculty.id, {
      name,
      aliases: parseAliases(facultyState.aliases),
      is_active: facultyState.is_active,
    })
    toast.add({ title: "Факультет обновлён", color: "success" })
    isEditing.value = false
    emit("changed")
  } catch {
    toast.add({
      title: "Ошибка",
      description: "Не удалось обновить факультет",
      color: "error",
    })
  } finally {
    isSavingFaculty.value = false
  }
}

const onDeleteFaculty = async () => {
  try {
    await deleteFaculty(props.faculty.id)
    toast.add({ title: "Факультет удалён", color: "success" })
    emit("changed")
  } catch {
    toast.add({
      title: "Ошибка",
      description: "Не удалось удалить факультет",
      color: "error",
    })
  }
}

// --- Добавление направления ---
const isAddingProgram = ref(false)
const isSavingProgram = ref(false)
const programState = reactive({
  name: "",
  code: "",
  level: "bachelor",
})

const resetProgramForm = () => {
  programState.name = ""
  programState.code = ""
  programState.level = "bachelor"
}

const onCreateProgram = async () => {
  const name = programState.name.trim()
  if (!name) {
    return
  }
  isSavingProgram.value = true
  try {
    await createProgram(props.faculty.id, {
      name,
      code: programState.code.trim() || null,
      level: programState.level,
      is_active: true,
    })
    toast.add({ title: "Направление добавлено", color: "success" })
    resetProgramForm()
    isAddingProgram.value = false
    emit("changed")
  } catch {
    toast.add({
      title: "Ошибка",
      description: "Не удалось добавить направление",
      color: "error",
    })
  } finally {
    isSavingProgram.value = false
  }
}
</script>

<template lang="pug">
div(class="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4" :class="{ 'opacity-70': !faculty.is_active }")
  div(v-if="isEditing")
    u-form(:state="facultyState" class="space-y-3" @submit="onSaveFaculty")
      div(class="flex flex-wrap items-end gap-3")
        u-form-field(label="Название факультета" name="name" required class="flex-1 min-w-56")
          u-input(v-model="facultyState.name" class="w-full")
        u-form-field(label="Аббревиатуры (через запятую)" name="aliases" class="flex-1 min-w-48")
          u-input(v-model="facultyState.aliases" placeholder="ФИТ, Факультет ИТ" class="w-full")
      div(class="flex items-center justify-between gap-3")
        div(class="flex items-center gap-2")
          u-switch(v-model="facultyState.is_active")
          span(class="text-xs text-gray-500") Активен
        div(class="flex gap-2")
          u-button(color="neutral" variant="soft" :disabled="isSavingFaculty" @click="isEditing = false") Отмена
          u-button(type="submit" color="primary" :loading="isSavingFaculty") Сохранить

  div(v-else)
    div(class="flex items-start gap-3")
      div(class="flex-1 min-w-0")
        div(class="flex items-center gap-2 flex-wrap")
          h3(class="text-lg font-semibold text-gray-900 dark:text-white") {{ faculty.name }}
          u-badge(v-if="!faculty.is_active" color="warning" variant="subtle" size="sm") Выключен
        div(v-if="faculty.aliases?.length" class="flex flex-wrap gap-1 mt-1")
          u-badge(
            v-for="alias in faculty.aliases"
            :key="alias"
            color="primary"
            variant="subtle"
            size="sm"
            class="font-mono"
          ) {{ alias }}
      div(class="flex gap-1 shrink-0")
        u-button(icon="i-heroicons-pencil-square" color="neutral" variant="ghost" size="sm" @click="startEdit")
        u-modal(
          title="Удаление факультета"
          description="Факультет будет удалён вместе со всеми его направлениями. Это действие нельзя отменить."
        )
          u-button(icon="i-heroicons-trash" color="error" variant="ghost" size="sm")
          template(#footer="{ close }")
            div(class="flex justify-end gap-2 w-full")
              u-button(color="neutral" variant="ghost" @click="close") Отмена
              u-button(color="error" @click="onDeleteFaculty(); close()") Удалить

  div(class="mt-4 space-y-2")
    div(class="flex items-center justify-between")
      span(class="text-sm font-medium text-gray-600 dark:text-gray-400") Направления подготовки ({{ programs.length }})
      u-button(
        v-if="!isAddingProgram"
        icon="i-heroicons-plus"
        color="primary"
        variant="soft"
        size="sm"
        @click="isAddingProgram = true"
      ) Добавить направление

    div(v-if="programs.length === 0 && !isAddingProgram" class="text-sm text-gray-500 dark:text-gray-400 py-2")
      | Направления пока не добавлены.

    faculties-program-row(
      v-for="program in programs"
      :key="program.id"
      :program="program"
      @changed="emit('changed')"
    )

    div(v-if="isAddingProgram" class="rounded-lg border border-dashed border-gray-300 dark:border-gray-700 p-3")
      u-form(:state="programState" class="space-y-3" @submit="onCreateProgram")
        div(class="flex flex-wrap items-end gap-3")
          u-form-field(label="Название" name="name" required class="flex-1 min-w-48")
            u-input(v-model="programState.name" placeholder="Например: Программная инженерия" class="w-full")
          u-form-field(label="Код" name="code" class="w-32")
            u-input(v-model="programState.code" placeholder="09.03.04" class="w-full")
          u-form-field(label="Уровень" name="level" class="w-44")
            u-select(v-model="programState.level" :items="EDUCATION_LEVELS" value-key="value" label-key="label" class="w-full")
        div(class="flex justify-end gap-2")
          u-button(color="neutral" variant="soft" :disabled="isSavingProgram" @click="isAddingProgram = false") Отмена
          u-button(type="submit" color="primary" :loading="isSavingProgram") Добавить
</template>
