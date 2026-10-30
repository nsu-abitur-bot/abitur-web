<script setup lang="ts">
const threshold = ref(0.95)
const busy = ref(false)
const loaded = ref(false)
const error = ref("")
const toast = useToast()

async function load() {
  busy.value = true
  try {
    error.value = ""
    threshold.value = (await apiFetch<{ similarity_threshold: number }>("/api/v1/settings/faq")).similarity_threshold
    loaded.value = true
  } catch {
    error.value = "Не удалось загрузить настройки FAQ"
  } finally {
    busy.value = false
  }
}

async function save() {
  if (!loaded.value) {
    return
  }
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
  <section class="admin-panel p-6">
    <h2 class="text-base font-semibold mb-5">Сопоставление с FAQ</h2>
    <form v-if="loaded" class="space-y-3" @submit.prevent="save">
      <label for="faq-threshold" class="block text-sm">Порог сходства вопроса с готовым ответом</label>
      <u-input id="faq-threshold" v-model.number="threshold" type="number" min="0.5" max="1" step="0.01" required :disabled="busy" class="w-full max-w-xs" />
      <p class="text-sm admin-muted">Чем выше порог, тем точнее должен совпасть вопрос. Значение по умолчанию — 0.95.</p>
      <u-button type="submit" :loading="busy" :disabled="busy || !loaded">Сохранить порог FAQ</u-button>
    </form>
    <p v-if="error" role="alert" class="text-error mt-3">{{ error }}</p>
    <u-button v-if="!loaded" variant="ghost" :loading="busy" @click="load">Повторить загрузку</u-button>
  </section>
</template>
