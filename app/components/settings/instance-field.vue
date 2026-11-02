<script setup lang="ts">
import type { InstanceSetting } from "~/services/instance-settings"

defineProps<{ setting: InstanceSetting, removed: boolean }>()
const emit = defineEmits<{ remove: [] }>()
const value = defineModel<string>({ required: true })
</script>

<template>
  <div class="instance-field">
    <label :for="`instance-${setting.key}`" class="block text-sm font-medium">{{ setting.label }}</label>
    <select v-if="setting.choices.length" :id="`instance-${setting.key}`" v-model="value" class="instance-control w-full">
      <option v-for="choice in setting.choices" :key="choice" :value="choice">{{ ({ openai: "OpenAI", gemini: "Gemini", deepseek: "DeepSeek" } as Record<string, string>)[choice] ?? choice }}</option>
    </select>
    <select v-else-if="setting.kind === 'boolean'" :id="`instance-${setting.key}`" v-model="value" class="instance-control w-full">
      <option value="true">Включено</option>
      <option value="false">Выключено</option>
    </select>
    <div v-else class="flex flex-wrap gap-2 min-w-0">
      <input
        :id="`instance-${setting.key}`" v-model="value"
        :type="setting.secret ? 'password' : setting.kind === 'number' ? 'number' : setting.kind === 'url' ? 'url' : 'text'"
        :step="setting.kind === 'number' ? 'any' : undefined" :disabled="removed"
        :placeholder="setting.secret && setting.configured ? 'Задан — оставьте пустым, чтобы сохранить' : 'Не задан'"
        :autocomplete="setting.secret ? 'new-password' : 'off'"
        :aria-describedby="setting.secret ? `hint-${setting.key}` : undefined"
        class="instance-control min-w-0 flex-1 w-full"
      >
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
