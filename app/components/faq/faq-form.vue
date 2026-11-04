<script setup lang="ts">
import type { FaqItem } from "~/types/faq"

const props = defineProps<{
  initialData?: FaqItem
}>()

const emit = defineEmits<{
  (e: "submit"): void
  (e: "cancel"): void
}>()

const itemId = computed(() => props.initialData?.id)
const isEditMode = computed(() => props.initialData !== undefined && !!itemId.value)

// Component state for aliases
const newAlias = ref("")

const state = reactive<FaqItem>({
  question: props.initialData?.question ?? "",
  aliases: props.initialData?.aliases ? [...props.initialData.aliases] : [],
  answer: props.initialData?.answer ?? "",
  verification_status: props.initialData?.verification_status ?? "draft",
  source_document: props.initialData?.source_document ?? null,
  source_location: props.initialData?.source_location ?? null,
  confirmed_by: props.initialData?.confirmed_by ?? null,
  confirmed_at: props.initialData?.confirmed_at ?? null,
})

const isLoading = ref(false)
const toast = useToast()

const addAlias = () => {
  const trimmed = newAlias.value.trim()
  if (trimmed && !state.aliases!.includes(trimmed)) {
    state.aliases!.push(trimmed)
  }
  newAlias.value = ""
}

const removeAlias = (aliasToRemove: string) => {
  state.aliases = state.aliases!.filter((a: string) => a !== aliasToRemove)
}

const onSubmit = async () => {
  if (!state.question.trim() || !state.answer.trim() || isLoading.value) {
    return
  }
  isLoading.value = true
  try {
    await apiFetch(isEditMode.value ? `/api/v1/faq/${encodeURIComponent(itemId.value!)}` : "/api/v1/faq", {
      method: isEditMode.value ? "PUT" : "POST",
      body: {
        ...state,
        confirmed_at: state.confirmed_at || null,
        source_document: state.source_document || null,
        source_location: state.source_location || null,
        confirmed_by: state.confirmed_by || null,
      },
    })
    emit("submit")
  } catch (err) {
    console.error("Failed to submit FAQ:", err)
    toast.add({
      title: "Ошибка",
      description: "Произошла ошибка при сохранении",
      color: "error",
    })
  } finally {
    isLoading.value = false
  }
}
</script>

<template lang="pug">
u-form(:state="state" class="space-y-4" @submit="onSubmit")
  u-form-field(label="Вопрос" name="question" required class="w-full")
    u-input(v-model="state.question" placeholder="Например: Как подать документы?" class="w-full")

  u-form-field(label="Ответ" name="answer" required class="w-full")
    u-textarea(
      v-model="state.answer"
      :rows="5"
      placeholder="Напишите ответ..."
      class="w-full"
    )

  u-form-field(label="Статус подтверждения" name="verification_status" help="Для подтверждения нужны дата и имя проверившего либо документ и место в нём" class="w-full")
    u-select(
      v-model="state.verification_status"
      :items="[{ label: 'Черновик', value: 'draft' }, { label: 'Подтверждено человеком', value: 'confirmed' }]"
      value-key="value"
      label-key="label"
      class="w-full"
    )

  u-form-field(label="Документ-источник" name="source_document" class="w-full")
    u-input(v-model="state.source_document" placeholder="Название или ссылка на документ" class="w-full")

  u-form-field(label="Место в документе" name="source_location" class="w-full")
    u-input(v-model="state.source_location" placeholder="Раздел, пункт или страница" class="w-full")

  u-form-field(label="Подтвердил" name="confirmed_by" class="w-full")
    u-input(v-model="state.confirmed_by" placeholder="Имя сотрудника" class="w-full")

  u-form-field(label="Дата подтверждения" name="confirmed_at" class="w-full")
    u-input(v-model="state.confirmed_at" type="datetime-local" class="w-full")

  details
    summary(class="cursor-pointer text-sm admin-muted") Другие формулировки вопроса ({{ state.aliases?.length ?? 0 }})
    u-form-field(label="Синонимы" name="aliases" class="w-full mt-3")
      div(class="flex flex-wrap gap-2 mb-2")
        u-badge(
          v-for="alias in state.aliases"
          :key="alias"
          color="primary"
          variant="subtle"
          class="flex items-center gap-1"
        )
          span {{ alias }}
          u-button(
            :aria-label="`Удалить синоним ${alias}`"
            icon="i-heroicons-x-mark"
            color="neutral"
            variant="link"
            size="xs"
            :padded="false"
            @click="removeAlias(alias)"
          )

      div(class="flex gap-2")
        u-input(
          v-model="newAlias"
          placeholder="Добавить синоним..."
          class="flex-1"
          @keydown.enter.prevent="addAlias"
        )
        u-button(color="neutral" variant="outline" @click="addAlias") Добавить

  div.admin-modal-form-actions(class="flex justify-end gap-3 pt-2")
    u-button(color="neutral" variant="soft" :disabled="isLoading" @click="emit('cancel')") Отмена
    u-button(type="submit" color="primary" :loading="isLoading") {{ isEditMode ? 'Сохранить' : 'Создать' }}
</template>
