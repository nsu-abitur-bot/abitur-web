<script setup lang="ts">
import type { AbbrevItem } from "~/types/abbrev"

const props = defineProps<{
  initialData?: AbbrevItem
}>()

const emit = defineEmits<{
  (e: "submit"): void
  (e: "cancel"): void
}>()

const itemId = computed(() => props.initialData?.id)
const isEditMode = computed(() => props.initialData !== undefined && !!itemId.value)

const state = reactive<AbbrevItem>({
  short: props.initialData?.short ?? "",
  full: props.initialData?.full ?? "",
})

const isLoading = ref(false)
const toast = useToast()

const onSubmit = async () => {
  isLoading.value = true
  try {
    if (isEditMode.value) {
      await useApi("/api/v1/abbrev/{item_id}", {
        method: "PUT",
        path: { item_id: itemId.value! },
        body: state,
      })
    } else {
      await useApi("/api/v1/abbrev", {
        method: "POST",
        body: state,
      })
    }
    emit("submit")
  } catch (err) {
    console.error("Failed to submit abbreviation:", err)
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
  u-form-group(label="Аббревиатура" name="short" required class="w-full")
    u-input(v-model="state.short" placeholder="Например: НГУ" class="w-full")

  u-form-group(label="Расшифровка" name="full" required class="w-full")
    u-input(v-model="state.full" placeholder="Например: Новосибирский государственный университет" class="w-full")

  div(class="flex justify-end gap-3 pt-2")
    u-button(color="neutral" variant="soft" :disabled="isLoading" @click="emit('cancel')") Отмена
    u-button(type="submit" color="primary" :loading="isLoading") {{ isEditMode ? 'Сохранить' : 'Создать' }}
</template>
