<script setup lang="ts">
const items = [
  {
    label: "Загрузить файл",
    icon: "lucide:file-up",
    slot: "file",
  },
  {
    label: "Добавить по URL",
    icon: "lucide:link",
    slot: "url",
  },
]

const state = reactive({
  url: "",
  file: null,
})

function handleFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  if (input.files?.length) {
    // TODO: Handle file upload
    console.log("File selected:", input.files[0])
  }
}

function handleUrlSubmit() {
  // TODO: Handle URL submission
  console.log("URL submitted:", state.url)
}
</script>

<template lang="pug">
ui-box(title="Добавить новые знания")
  u-tabs(:items="items" class="w-full")
    template(#file)
      u-file-upload(v-model="state.file" @change="handleFileChange")

    template(#url)
      u-form.flex.flex-col.gap-4.p-4(:state="state" @submit="handleUrlSubmit")
        u-form-field(label="URL документа" name="url")
          u-input.w-full(
            v-model="state.url"
            placeholder="https://example.com/document.pdf"
            icon="lucide:link"
          )

        .flex.justify-end
          u-button.mt-2(
            type="submit"
            color="primary"
          ) Добавить
</template>
