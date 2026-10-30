<script setup lang="ts">
import type { InstanceSettings } from "~/services/instance-settings"
import { checkInstanceConnection, collectChanges, getInstanceSettings, saveInstanceSettings } from "~/services/instance-settings"

const snapshot = ref<InstanceSettings | null>(null)
const draft = reactive<Record<string, string>>({})
const removed = reactive(new Set<string>())
const selectedGroup = ref("Назначение моделей")
const busy = ref(false)
const message = ref("")
const error = ref("")
const groups = computed(() => [...new Set(snapshot.value?.settings.map(s => s.group) ?? [])])
const visibleSettings = computed(() => snapshot.value?.settings.filter(s => s.group === selectedGroup.value) ?? [])
const changes = computed(() => collectChanges(snapshot.value?.settings ?? [], draft, removed))
const changedCount = computed(() => Object.keys(changes.value).length)

function populate(data: InstanceSettings) {
  snapshot.value = data
  for (const key of Object.keys(draft)) {
    delete draft[key]
  }
  removed.clear()
  for (const setting of data.settings) {
    draft[setting.key] = setting.secret ? "" : setting.value ?? ""
  }
}

function errorMessage(err: unknown) {
  const detail = (err as { data?: { detail?: unknown } })?.data?.detail
  return typeof detail === "string" ? detail : "Не удалось выполнить запрос. Проверьте соединение и повторите."
}

async function load() {
  busy.value = true
  error.value = ""
  try {
    populate(await getInstanceSettings())
  } catch (err) {
    error.value = errorMessage(err)
  } finally {
    busy.value = false
  }
}

async function save() {
  if (!snapshot.value) {
    return
  }
  busy.value = true
  error.value = ""
  message.value = ""
  try {
    populate(await saveInstanceSettings(snapshot.value.revision, changes.value))
    message.value = "Настройки сохранены. Процессы получают изменения в течение нескольких секунд; выполняющиеся запросы завершаются со старым подключением."
  } catch (err) {
    error.value = errorMessage(err)
  } finally {
    busy.value = false
  }
}

async function check(target: string) {
  if (!snapshot.value) {
    return
  }
  busy.value = true
  error.value = ""
  message.value = ""
  try {
    message.value = (await checkInstanceConnection(snapshot.value.revision, changes.value, target)).message + ". Изменения пока не сохранены."
  } catch (err) {
    error.value = errorMessage(err)
  } finally {
    busy.value = false
  }
}

function toggleRemoval(key: string) {
  if (removed.has(key)) {
    removed.delete(key)
  } else {
    removed.add(key)
    draft[key] = ""
  }
}

await load()
</script>

<template>
  <ui-box title="Настройки экземпляра">
    <p class="mb-4 text-sm text-gray-500">
      Модели, Telegram и MAX настраиваются здесь. Сохранённые ключи не отображаются.
      Проверка модели выполняет небольшой запрос к провайдеру и может расходовать токены.
    </p>
    <p v-if="snapshot && !snapshot.encryption_ready" class="mb-4 text-sm text-amber-700" role="status">
      Ключ шифрования не настроен. Для сохранения секретов задайте SETTINGS_ENCRYPTION_KEY на сервере.
    </p>
    <p v-if="error" class="mb-4 rounded-lg bg-red-50 p-3 text-red-700" role="alert">{{ error }}</p>
    <p v-if="message" class="mb-4 rounded-lg bg-green-50 p-3 text-green-800" role="status">{{ message }}</p>
    <div v-if="snapshot" class="space-y-4">
      <div class="flex flex-wrap items-center gap-3">
        <label for="instance-settings-group">Раздел</label>
        <select id="instance-settings-group" v-model="selectedGroup" class="rounded border p-2 dark:bg-gray-900" :disabled="busy">
          <option v-for="group in groups" :key="group" :value="group">{{ group }}</option>
        </select>
        <u-button :disabled="busy || !changedCount" :loading="busy" @click="save">Сохранить изменения ({{ changedCount }})</u-button>
        <u-button variant="soft" :disabled="busy" @click="load">Обновить / отменить правки</u-button>
      </div>
      <fieldset :disabled="busy" class="space-y-4">
        <div v-for="setting in visibleSettings" :key="setting.key" class="space-y-1">
          <label :for="`instance-${setting.key}`" class="block text-sm font-medium">{{ setting.label }}</label>
          <select v-if="setting.choices.length" :id="`instance-${setting.key}`" v-model="draft[setting.key]" class="w-full rounded border p-2 dark:bg-gray-900">
            <option v-for="choice in setting.choices" :key="choice" :value="choice">{{ choice }}</option>
          </select>
          <select v-else-if="setting.kind === 'boolean'" :id="`instance-${setting.key}`" v-model="draft[setting.key]" class="w-full rounded border p-2 dark:bg-gray-900">
            <option value="true">Включено</option>
            <option value="false">Выключено</option>
          </select>
          <div v-else class="flex flex-wrap gap-2">
            <input
              :id="`instance-${setting.key}`" v-model="draft[setting.key]"
              :type="setting.secret ? 'password' : 'text'" :disabled="removed.has(setting.key)"
              :placeholder="setting.secret && setting.configured ? 'Задан — оставьте пустым, чтобы сохранить' : 'Не задан'"
              :autocomplete="setting.secret ? 'new-password' : 'off'"
              class="min-w-40 flex-1 rounded border p-2 dark:bg-gray-900"
            >
            <u-button v-if="setting.secret && setting.configured" color="neutral" variant="soft" @click="toggleRemoval(setting.key)">
              {{ removed.has(setting.key) ? 'Отменить удаление' : 'Удалить ключ' }}
            </u-button>
          </div>
          <p v-if="removed.has(setting.key)" class="text-sm text-amber-700">Ключ будет удалён после сохранения.</p>
        </div>
      </fieldset>
      <div class="flex flex-wrap gap-2">
        <template v-if="selectedGroup === 'Telegram' || selectedGroup === 'MAX'">
          <u-button :disabled="busy" variant="soft" @click="check(selectedGroup === 'Telegram' ? 'telegram' : 'max')">Проверить бота</u-button>
        </template>
        <template v-if="selectedGroup === 'OpenAI' || selectedGroup === 'Gemini'">
          <u-button v-for="purpose in [{ value: 'chat', label: 'ответы' }, { value: 'graph', label: 'граф' }, { value: 'vision', label: 'документы' }, { value: 'embedding', label: 'эмбеддинги FAQ' }, { value: 'graph_embedding', label: 'эмбеддинги графа' }]" :key="purpose.value" :disabled="busy" variant="soft" @click="check(`${selectedGroup.toLowerCase()}:${purpose.value}`)">
            Проверить: {{ purpose.label }}
          </u-button>
        </template>
      </div>
      <p class="text-sm text-gray-500">Смену пространства эмбеддингов при наполненной базе система блокирует до переиндексации. CRAG, FAQ и лимиты запросов доступны в своих разделах ниже.</p>
    </div>
    <u-button v-else :loading="busy" variant="soft" @click="load">Загрузить настройки</u-button>
  </ui-box>
</template>
