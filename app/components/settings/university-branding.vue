<script setup lang="ts">
import { brandVariables, DEFAULT_ACCENT, resolveBrandMedia } from "~/utils/branding"

const draft = defineModel<Record<string, string>>("draft", { required: true })
const file = defineModel<File | null>("file", { required: true })
const remove = defineModel<boolean>("remove", { required: true })
const apiBase = useApiBaseUrl()
const objectUrl = ref("")
const failed = ref(false)
const fileError = ref("")
const previewUrl = computed(() => remove.value ? "" : objectUrl.value || resolveBrandMedia(draft.value.UNIVERSITY_LOGO_URL, apiBase))
watch(file, (value) => {
  if (objectUrl.value) {
    URL.revokeObjectURL(objectUrl.value)
  }
  objectUrl.value = value ? URL.createObjectURL(value) : ""
}, { immediate: true })
watch(previewUrl, () => {
  failed.value = false
})
onBeforeUnmount(() => {
  if (objectUrl.value) {
    URL.revokeObjectURL(objectUrl.value)
  }
})
function selectFile(event: Event) {
  const input = event.target as HTMLInputElement
  const next = input.files?.[0]
  input.value = ""
  if (!next) {
    return
  }
  if (next.size > 2 * 1024 * 1024 || !["image/png", "image/jpeg", "image/webp"].includes(next.type)) {
    fileError.value = "Выберите изображение до 2 МБ."
    return
  }
  fileError.value = ""
  file.value = next
  remove.value = false
}
const initial = computed(() => Array.from(draft.value.UNIVERSITY_SHORT_NAME || draft.value.UNIVERSITY_FULL_NAME || "Университет")[0]?.toLocaleUpperCase())
</script>

<template>
  <div class="branding-grid">
    <div class="space-y-5 min-w-0">
      <div class="space-y-1">
        <label for="instance-UNIVERSITY_SHORT_NAME" class="block text-sm font-medium">Краткое название</label>
        <input id="instance-UNIVERSITY_SHORT_NAME" v-model="draft.UNIVERSITY_SHORT_NAME" maxlength="300" class="instance-control w-full">
        <p class="text-xs admin-muted">В шапке и навигации.</p>
      </div>
      <div class="space-y-1">
        <label for="instance-UNIVERSITY_FULL_NAME" class="block text-sm font-medium">Полное название</label>
        <input id="instance-UNIVERSITY_FULL_NAME" v-model="draft.UNIVERSITY_FULL_NAME" maxlength="300" class="instance-control w-full">
        <p class="text-xs admin-muted">Название вуза, также используется в ответах помощника.</p>
      </div>
      <div v-if="draft.BOT_WELCOME_MESSAGE !== undefined" class="space-y-1">
        <label for="instance-BOT_WELCOME_MESSAGE" class="block text-sm font-medium">Приветственное сообщение бота</label>
        <textarea
          id="instance-BOT_WELCOME_MESSAGE"
          v-model="draft.BOT_WELCOME_MESSAGE"
          aria-describedby="bot-welcome-hint"
          class="instance-control w-full"
          rows="6"
          maxlength="3999"
        />
        <p id="bot-welcome-hint" class="text-xs admin-muted">
          До 3999 символов. Обычный текст с переносами строк. Пустое поле вернёт стандартное приветствие.
        </p>
      </div>
      <div class="space-y-2">
        <span class="block text-sm font-medium">Логотип</span>
        <div class="flex flex-wrap gap-3 items-center">
          <label class="logo-picker instance-control cursor-pointer">{{ previewUrl ? 'Заменить' : 'Загрузить' }}<input aria-label="Логотип" type="file" accept="image/png,image/webp,image/jpeg" @change="selectFile"></label>
          <u-button v-if="previewUrl" color="neutral" variant="ghost" @click="file = null; remove = true">Удалить</u-button>
        </div>
        <p class="text-xs admin-muted">В навигации и на вкладке браузера. Изображение до 2 МБ.</p>
        <p v-if="fileError" class="text-sm text-error" role="alert">{{ fileError }}</p>
      </div>
      <div class="space-y-2">
        <label for="brand-hex" class="block text-sm font-medium">Акцентный цвет</label>
        <div class="flex flex-wrap gap-2 items-center">
          <input v-model="draft.UNIVERSITY_ACCENT_COLOR" aria-label="Выбрать акцентный цвет" type="color" class="h-9 w-10 cursor-pointer">
          <input id="brand-hex" v-model="draft.UNIVERSITY_ACCENT_COLOR" maxlength="7" pattern="#[0-9a-fA-F]{6}" class="instance-control w-28" placeholder="#4b4bd2">
          <u-button variant="ghost" color="neutral" @click="draft.UNIVERSITY_ACCENT_COLOR = DEFAULT_ACCENT">Сбросить</u-button>
        </div>
      </div>
    </div>
    <div class="brand-preview" :style="brandVariables(draft.UNIVERSITY_ACCENT_COLOR || DEFAULT_ACCENT)" aria-label="Предпросмотр оформления">
      <p class="text-xs admin-muted mb-4">Предпросмотр</p>
      <div class="flex gap-3 items-center min-w-0">
        <span class="preview-mark"><img v-if="previewUrl && !failed" :src="previewUrl" alt="" @error="failed = true"><span v-else>{{ initial }}</span></span>
        <div class="min-w-0 break-anywhere"><strong>{{ draft.UNIVERSITY_SHORT_NAME || 'Университет' }}</strong><p class="text-xs admin-muted">{{ draft.UNIVERSITY_FULL_NAME }}</p></div>
      </div>
      <div class="preview-active mt-5">Обзор</div>
      <u-button class="mt-4" tabindex="-1">Продолжить</u-button>
    </div>
  </div>
</template>

<style>
.branding-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(200px, 280px);
  gap: 32px;
}

.brand-preview {
  --admin-primary: var(--ui-color-primary-600);
  --ui-primary: var(--admin-primary);
  --color-primary: var(--ui-primary);

  align-self: start;
  min-width: 0;
  border-left: 1px solid var(--ui-border);
  padding-left: 24px;
}

.dark .brand-preview {
  --admin-primary: var(--ui-color-primary-300);
}

.preview-mark {
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  flex-shrink: 0;
  color: var(--ui-primary);
  font-size: 22px;
  font-weight: 700;
}

.preview-mark img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}

.preview-active {
  color: var(--ui-primary);
  background: var(--ui-color-primary-50);
  border-radius: 8px;
  padding: 8px 12px;
}

.dark .preview-active {
  background: var(--ui-color-primary-900);
}

.logo-picker {
  position: relative;
}

.logo-picker input {
  position: absolute;
  inset: 0;
  opacity: 0;
  width: 100%;
  cursor: pointer;
}

.logo-picker:focus-within {
  outline: 2px solid var(--ui-primary);
  outline-offset: 2px;
}

@media (width < 1000px) {
  .branding-grid {
    grid-template-columns: minmax(0, 1fr);
  }

  .brand-preview {
    border-left: 0;
    border-top: 1px solid var(--ui-border);
    padding: 20px 0 0;
  }
}
</style>
