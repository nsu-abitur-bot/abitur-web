<script setup lang="ts">
import type { components } from "#openapi"

type FaqItem = components["schemas"]["FaqItem"]

const props = defineProps<{
  initialData?: FaqItem
  index?: number
}>()

const emit = defineEmits<{
  (e: "submit"): void
  (e: "cancel"): void
}>()

const isEditMode = computed(() => props.initialData !== undefined && props.index !== undefined)

// Component state for aliases
const newAlias = ref("")

const state = reactive<FaqItem>({
  question: props.initialData?.question ?? "",
  aliases: props.initialData?.aliases ? [...props.initialData.aliases] : [],
  answer: props.initialData?.answer ?? "",
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
  isLoading.value = true
  try {
    if (isEditMode.value && props.index !== undefined) {
      await useApi("/api/v1/faq/{index}", {
        method: "PUT",
        path: { index: props.index },
        body: state,
      })
    } else {
      await useApi("/api/v1/faq", {
        method: "POST",
        body: state,
      })
    }
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
  u-form-group(label="Вопрос" name="question" required class="w-full")
    u-input(v-model="state.question" placeholder="Например: Как подать документы?" class="w-full")

  u-form-group(label="Синонимы (опционально)" name="aliases" help="Помогает боту лучше понимать похожие вопросы" class="w-full")
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
      u-button(color="neutral" variant="solid" @click="addAlias") Добавить

  u-form-group(label="Ответ" name="answer" required class="w-full")
    u-textarea(
      v-model="state.answer"
      :rows="5"
      autoresize
      placeholder="Напишите ответ..."
      class="w-full"
    )

  div(class="flex justify-end gap-3 pt-2")
    u-button(color="neutral" variant="soft" :disabled="isLoading" @click="emit('cancel')") Отмена
    u-button(type="submit" color="primary" :loading="isLoading") {{ isEditMode ? 'Сохранить' : 'Создать' }}
</template>
