<script setup lang="ts">
import type { InstanceSetting } from "~/services/instance-settings"

const props = defineProps<{ setting: InstanceSetting, removed: boolean, disabled?: boolean }>()
const emit = defineEmits<{ remove: [] }>()
const value = defineModel<string>({ required: true })
const providerLabels: Record<string, string> = { openai: "OpenAI", gemini: "Gemini", deepseek: "DeepSeek", gigachat: "GigaChat" }
const options = computed(() => props.setting.choices.length
  ? props.setting.choices.map(choice => ({ label: providerLabels[choice] ?? choice, value: choice }))
  : [{ label: "Включено", value: "true" }, { label: "Выключено", value: "false" }])
</script>

<template>
  <div class="instance-field">
    <label :for="`instance-${setting.key}`" class="block text-sm font-medium">{{ setting.label }}</label>
    <u-select
      v-if="setting.choices.length || setting.kind === 'boolean'"
      :id="`instance-${setting.key}`" v-model="value" :items="options"
      :disabled="disabled || removed" class="w-full"
    />
    <div v-else class="flex flex-wrap gap-2 min-w-0">
      <u-input
        :id="`instance-${setting.key}`" v-model="value"
        :type="setting.secret ? 'password' : setting.kind === 'number' ? 'number' : setting.kind === 'url' ? 'url' : 'text'"
        :step="setting.kind === 'number' ? 'any' : undefined" :disabled="disabled || removed"
        :placeholder="setting.secret && setting.configured ? 'Задан — оставьте пустым, чтобы сохранить' : 'Не задан'"
        :autocomplete="setting.secret ? 'new-password' : 'off'"
        :aria-describedby="setting.secret ? `hint-${setting.key}` : undefined"
        class="min-w-0 flex-1 w-full"
      />
      <u-button v-if="setting.secret && setting.configured" color="neutral" variant="ghost" @click="emit('remove')">
        {{ removed ? 'Отменить удаление' : 'Удалить ключ' }}
      </u-button>
    </div>
    <p v-if="setting.secret" :id="`hint-${setting.key}`" class="text-xs admin-muted">{{ setting.configured ? 'Секрет задан. Пустое поле оставляет его без изменений.' : 'Секрет не задан.' }}</p>
    <p v-if="removed" class="text-sm text-amber-700">Ключ будет удалён после сохранения.</p>
  </div>
</template>

<style scoped>
.instance-field {
  display: grid;
  align-content: start;
  gap: 6px;
  min-width: 0;
}
</style>
