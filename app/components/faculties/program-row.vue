<script setup lang="ts">
import type { ProgramItem } from "~/services/faculties"
import {
  deleteProgram,
  EDUCATION_LEVELS,
  educationLevelLabel,
  updateProgram,
} from "~/services/faculties"

const props = defineProps<{
  program: ProgramItem
}>()

const emit = defineEmits<{
  (e: "changed"): void
}>()

const toast = useToast()
const isEditing = ref(false)
const isSaving = ref(false)

const state = reactive({
  name: props.program.name,
  code: props.program.code ?? "",
  level: props.program.level,
  is_active: props.program.is_active,
})

const startEdit = () => {
  state.name = props.program.name
  state.code = props.program.code ?? ""
  state.level = props.program.level
  state.is_active = props.program.is_active
  isEditing.value = true
}

const onSave = async () => {
  const name = state.name.trim()
  if (!name) {
    return
  }
  isSaving.value = true
  try {
    await updateProgram(props.program.id, {
      name,
      code: state.code.trim() || null,
      level: state.level,
      is_active: state.is_active,
    })
    toast.add({ title: "Направление обновлено", color: "success" })
    isEditing.value = false
    emit("changed")
  } catch {
    toast.add({
      title: "Ошибка",
      description: "Не удалось обновить направление",
      color: "error",
    })
  } finally {
    isSaving.value = false
  }
}

const onDelete = async () => {
  try {
    await deleteProgram(props.program.id)
    toast.add({ title: "Направление удалено", color: "success" })
    emit("changed")
  } catch {
    toast.add({
      title: "Ошибка",
      description: "Не удалось удалить направление",
      color: "error",
    })
  }
}
</script>

<template lang="pug">
div(class="rounded-lg border border-gray-200 dark:border-gray-800 p-3" :class="{ 'opacity-60': !program.is_active }")
  div(v-if="isEditing")
    u-form(:state="state" class="space-y-3" @submit="onSave")
      div(class="flex flex-wrap items-end gap-3")
        u-form-field(label="Название" name="name" required class="flex-1 min-w-48")
          u-input(v-model="state.name" class="w-full")
        u-form-field(label="Код" name="code" class="w-32")
          u-input(v-model="state.code" placeholder="09.03.04" class="w-full")
        u-form-field(label="Уровень" name="level" class="w-44")
          u-select(v-model="state.level" :items="EDUCATION_LEVELS" value-key="value" label-key="label" class="w-full")
      div(class="flex items-center justify-between gap-3")
        div(class="flex items-center gap-2")
          u-switch(v-model="state.is_active")
          span(class="text-xs text-gray-500") Активно
        div(class="flex gap-2")
          u-button(color="neutral" variant="soft" :disabled="isSaving" @click="isEditing = false") Отмена
          u-button(type="submit" color="primary" :loading="isSaving") Сохранить

  div(v-else class="flex items-center gap-3")
    div(class="flex-1 min-w-0")
      div(class="flex items-center gap-2 flex-wrap")
        span(class="text-sm font-medium text-gray-800 dark:text-gray-200") {{ program.name }}
        u-badge(color="neutral" variant="subtle" size="sm") {{ educationLevelLabel(program.level) }}
        u-badge(v-if="program.code" color="info" variant="subtle" size="sm" class="font-mono") {{ program.code }}
        u-badge(v-if="!program.is_active" color="warning" variant="subtle" size="sm") Выключено
    div(class="flex gap-1 shrink-0")
      u-button(icon="i-heroicons-pencil-square" color="neutral" variant="ghost" size="sm" @click="startEdit")
      u-modal(
        title="Удаление направления"
        description="Вы уверены, что хотите удалить это направление? Это действие нельзя отменить."
      )
        u-button(icon="i-heroicons-trash" color="error" variant="ghost" size="sm")
        template(#footer="{ close }")
          div(class="flex justify-end gap-2 w-full")
            u-button(color="neutral" variant="ghost" @click="close") Отмена
            u-button(color="error" @click="onDelete(); close()") Удалить
</template>
