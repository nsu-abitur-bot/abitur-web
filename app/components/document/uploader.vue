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
})

function onFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  if (input.files?.length) {
    // TODO: Handle file upload
    console.log("File selected:", input.files[0])
  }
}

function onUrlSubmit() {
  // TODO: Handle URL submission
  console.log("URL submitted:", state.url)
}
</script>

<template lang="pug">
ui-box(title="Добавить новые знания")
  u-tabs(:items="items" class="w-full")
    template(#file="{ item }")
      .flex.flex-col.items-center.gap-4.rounded-md.border-2.border-dashed.border-gray-300.p-8.text-center.transition-colors.relative(class="hover:bg-gray-50")
        u-icon(:name="item.icon" class="text-4xl text-gray-400 size-12")
        p.text-sm.text-gray-500 Перетащите файл сюда или нажмите для выбора
        input.absolute.inset-0.opacity-0.cursor-pointer.w-full.h-full(
          type="file"
          @change="onFileChange"
        )

    template(#url)
      u-form.flex.flex-col.gap-4.p-4(:state="state" @submit="onUrlSubmit")
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
