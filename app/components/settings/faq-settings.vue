<script setup lang="ts">
const threshold = ref(0.95)
const busy = ref(false)
const error = ref("")
const toast = useToast()

async function load() {
  busy.value = true
  try {
    threshold.value = (await apiFetch<{ similarity_threshold: number }>("/api/v1/settings/faq")).similarity_threshold
  } catch {
    error.value = "Не удалось загрузить настройки FAQ"
  } finally {
    busy.value = false
  }
}

async function save() {
  busy.value = true
  error.value = ""
  try {
    await apiFetch("/api/v1/settings/faq", { method: "PUT", body: { similarity_threshold: threshold.value } })
    toast.add({ title: "Настройки FAQ сохранены", color: "success" })
  } catch {
    error.value = "Не удалось сохранить порог. Допустимы значения от 0.5 до 1."
  } finally {
    busy.value = false
  }
}

await load()
</script>

<template>
  <ui-box title="Сопоставление вопросов с FAQ">
    <form class="space-y-3" @submit.prevent="save">
      <label for="faq-threshold" class="block text-sm">Порог сходства вопроса с готовым ответом</label>
      <input id="faq-threshold" v-model.number="threshold" type="number" min="0.5" max="1" step="0.01" required :disabled="busy" class="rounded border p-2 dark:bg-gray-900">
      <p class="text-sm text-gray-500">Чем выше порог, тем точнее должен совпасть вопрос. Значение по умолчанию — 0.95.</p>
      <p v-if="error" role="alert" class="text-red-600">{{ error }}</p>
      <u-button type="submit" :loading="busy" :disabled="busy">Сохранить порог FAQ</u-button>
    </form>
  </ui-box>
</template>
