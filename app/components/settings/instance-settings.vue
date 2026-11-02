<script setup lang="ts">
import { onBeforeRouteLeave } from "vue-router"

import type { InstanceSettings } from "~/services/instance-settings"
import { checkInstanceConnection, collectChanges, connectionPurposes, getInstanceSettings, isRevisionConflict, rebaseSettings, saveInstanceSettings } from "~/services/instance-settings"

const { refresh: refreshUniversity } = useUniversityIdentity()
const { refresh: refreshBranding } = useBranding()
const logoFile = ref<File | null>(null)
const removeLogo = ref(false)
const snapshot = ref<InstanceSettings | null>(null)
const authToken = useAuthToken()
const draft = ref<Record<string, string>>({})
const removed = reactive(new Set<string>())
const selectedGroup = ref("Назначение моделей")
const busy = ref(false)
const conflict = ref(false)
const review = ref<string[]>([])
const message = ref("")
const error = ref("")
const brandKeys = new Set(["UNIVERSITY_SHORT_NAME", "UNIVERSITY_FULL_NAME", "UNIVERSITY_LOGO_URL", "UNIVERSITY_ACCENT_COLOR"])
function groupFor(key: string, group: string) {
  return brandKeys.has(key) ? "Оформление вуза" : key === "UNIVERSITY_PROFILE" ? "Технический профиль" : group === "Вуз" || group === "Университет" ? "" : group
}
const groups = computed(() => [...new Set(snapshot.value?.settings.map(s => groupFor(s.key, s.group)).filter(Boolean) ?? [])].sort((a, b) => Number(b === "Оформление вуза") - Number(a === "Оформление вуза") || Number(a === "Технический профиль") - Number(b === "Технический профиль")))
const visibleSettings = computed(() => snapshot.value?.settings.filter(s => groupFor(s.key, s.group) === selectedGroup.value) ?? [])
const changes = computed(() => collectChanges(snapshot.value?.settings ?? [], draft.value, removed))
const availableChecks = computed(() => connectionPurposes(snapshot.value?.settings ?? [], selectedGroup.value))
const changedCount = computed(() => Object.keys(changes.value).length + Number(Boolean(logoFile.value || removeLogo.value)))

const leaveOpen = ref(false)
let resolveLeave: ((leave: boolean) => void) | undefined
function decideLeave(leave: boolean) {
  leaveOpen.value = false
  resolveLeave?.(leave)
  resolveLeave = undefined
}
onBeforeRouteLeave(() => {
  // Cookie refs can lag behind the API interceptor clearing the browser cookie.
  const authenticated = import.meta.client ? /(?:^|;\s*)abitur-token=[^;]+/.test(document.cookie) : Boolean(authToken.value)
  if (!authenticated || !changedCount.value) {
    return true
  }
  leaveOpen.value = true
  return new Promise<boolean>((resolve) => {
    resolveLeave = resolve
  })
})
function beforeUnload(event: BeforeUnloadEvent) {
  if (!changedCount.value) {
    return
  }
  event.preventDefault()
  event.returnValue = ""
}
onMounted(() => window.addEventListener("beforeunload", beforeUnload))
onBeforeUnmount(() => {
  window.removeEventListener("beforeunload", beforeUnload)
  resolveLeave?.(false)
})

function populate(data: InstanceSettings, keepLogo = false) {
  if (!keepLogo) {
    logoFile.value = null
    removeLogo.value = false
  }
  snapshot.value = data
  if (!data.settings.some(setting => groupFor(setting.key, setting.group) === selectedGroup.value)) {
    selectedGroup.value = groups.value[0] ?? ""
  }
  for (const key of Object.keys(draft.value)) {
    delete draft.value[key]
  }
  removed.clear()
  conflict.value = false
  review.value = []
  for (const setting of data.settings) {
    draft.value[setting.key] = setting.secret ? "" : setting.value ?? ""
  }
}

function errorMessage(err: unknown) {
  const detail = (err as { data?: { detail?: unknown } })?.data?.detail
  return typeof detail === "string" ? detail : "Не удалось выполнить запрос. Проверьте соединение и повторите."
}

async function rebase() {
  if (!snapshot.value) {
    return
  }
  busy.value = true
  try {
    const latest = await getInstanceSettings()
    const result = rebaseSettings(snapshot.value, latest, draft.value, removed)
    if (result.missing.length) {
      error.value = `Поля исчезли из схемы: ${result.missing.join(", ")}. Черновик сохранён; скопируйте значения перед отменой правок.`
      return
    }
    const oldLogo = snapshot.value.settings.find(s => s.key === "UNIVERSITY_LOGO_URL")?.value
    if ((logoFile.value || removeLogo.value) && oldLogo !== latest.settings.find(s => s.key === "UNIVERSITY_LOGO_URL")?.value) {
      result.conflicts.push("Логотип")
    }
    populate(latest, true)
    await Promise.all([refreshUniversity(), refreshBranding()])
    Object.assign(draft.value, result.draft)
    for (const key of result.removed) {
      removed.add(key)
    }
    review.value = result.conflicts
    message.value = "Новая версия загружена. Ваши изменения сохранены в черновике. Сверьте поля и сохраните повторно."
    error.value = ""
  } catch (err) {
    error.value = errorMessage(err)
  } finally {
    busy.value = false
  }
}

async function load() {
  busy.value = true
  error.value = ""
  try {
    const alreadyLoaded = Boolean(snapshot.value)
    populate(await getInstanceSettings())
    if (alreadyLoaded) {
      await Promise.all([refreshUniversity(), refreshBranding()])
    }
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
    populate(await saveInstanceSettings(snapshot.value.revision, changes.value, logoFile.value, removeLogo.value))
    message.value = "Настройки сохранены."
    await Promise.all([refreshUniversity(), refreshBranding()])
  } catch (err) {
    conflict.value = isRevisionConflict(err)
    error.value = conflict.value ? "Настройки изменены другим администратором. Черновик сохранён. Загрузите новую версию для сверки." : errorMessage(err)
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
    conflict.value = isRevisionConflict(err)
    error.value = conflict.value ? "Версия настроек изменилась. Черновик сохранён; загрузите новую версию для сверки." : errorMessage(err)
  } finally {
    busy.value = false
  }
}

function toggleRemoval(key: string) {
  if (removed.has(key)) {
    removed.delete(key)
  } else {
    removed.add(key)
  }
}

await load()
</script>

<template>
  <section class="admin-panel instance-editor" aria-label="Настройки подключений">
    <p v-if="!['Оформление вуза', 'Технический профиль'].includes(selectedGroup)" class="mb-4 text-sm admin-muted">
      Модели, Telegram и MAX настраиваются здесь. Сохранённые ключи не отображаются.
      Проверка модели выполняет небольшой запрос к провайдеру и может расходовать токены.
    </p>
    <p v-if="snapshot && !snapshot.encryption_ready && !['Оформление вуза', 'Технический профиль'].includes(selectedGroup)" class="mb-4 text-sm text-amber-700" role="status">
      Ключ шифрования не настроен. Для сохранения секретов задайте SETTINGS_ENCRYPTION_KEY на сервере.
    </p>
    <p v-if="error" class="mb-4 text-sm text-error" role="alert">{{ error }}</p>
    <p v-if="message" class="mb-4 text-sm admin-muted" role="status">{{ message }}</p>
    <div v-if="conflict" class="admin-toolbar mb-4">
      <u-button :loading="busy" @click="rebase">Загрузить версию и сверить черновик</u-button>
    </div>
    <p v-if="review.length" class="mb-4 text-sm" role="status">Проверьте пересекающиеся изменения: {{ review.join(', ') }}. Секреты нельзя сравнить: сервер не возвращает их значения.</p>
    <ui-empty-state v-if="busy && !snapshot?.settings.length" kind="loading" title="Загрузка настроек…" />
    <ui-empty-state v-else-if="snapshot && !snapshot.settings.length && !error" title="Настроек пока нет">
      <u-button color="neutral" variant="outline" :loading="busy" @click="load">Обновить</u-button>
    </ui-empty-state>
    <div v-else-if="snapshot?.settings.length" class="instance-workspace">
      <nav class="admin-subnav instance-groups" aria-label="Разделы подключений">
        <button v-for="group in groups" :key="group" type="button" :aria-current="selectedGroup === group ? 'page' : undefined" @click="selectedGroup = group">{{ group }}</button>
      </nav>
      <div class="space-y-5 min-w-0">
        <header class="admin-section-header"><h2>{{ selectedGroup }}</h2><span class="admin-muted text-xs">Версия {{ snapshot.revision }}</span></header>
        <fieldset :disabled="busy" class="space-y-4">
          <settings-university-branding v-if="selectedGroup === 'Оформление вуза'" v-model:draft="draft" v-model:file="logoFile" v-model:remove="removeLogo" />
          <p v-if="selectedGroup === 'Технический профиль'" class="text-sm admin-muted">Профиль влияет на стартовое наполнение и возможности НГУ. Смена не удаляет загруженные данные; для другого вуза нужен отдельный экземпляр с чистой базой.</p>
          <div v-for="setting in selectedGroup === 'Оформление вуза' ? [] : visibleSettings" :key="setting.key" class="instance-field">
            <label :for="`instance-${setting.key}`" class="block text-sm font-medium">{{ setting.label }}</label>
            <select v-if="setting.choices.length" :id="`instance-${setting.key}`" v-model="draft[setting.key]" class="instance-control w-full">
              <option v-for="choice in setting.choices" :key="choice" :value="choice">{{ choice }}</option>
            </select>
            <select v-else-if="setting.kind === 'boolean'" :id="`instance-${setting.key}`" v-model="draft[setting.key]" class="instance-control w-full">
              <option value="true">Включено</option>
              <option value="false">Выключено</option>
            </select>
            <div v-else class="flex flex-wrap gap-2">
              <input
                :id="`instance-${setting.key}`" v-model="draft[setting.key]"
                :type="setting.secret ? 'password' : setting.kind === 'number' ? 'number' : setting.kind === 'url' ? 'url' : 'text'"
                :step="setting.kind === 'number' ? 'any' : undefined" :disabled="removed.has(setting.key)"
                :placeholder="setting.secret && setting.configured ? 'Задан — оставьте пустым, чтобы сохранить' : 'Не задан'"
                :autocomplete="setting.secret ? 'new-password' : 'off'"
                class="instance-control min-w-40 flex-1"
              >
              <u-button v-if="setting.secret && setting.configured" color="neutral" variant="soft" @click="toggleRemoval(setting.key)">
                {{ removed.has(setting.key) ? 'Отменить удаление' : 'Удалить ключ' }}
              </u-button>
            </div>
            <p v-if="setting.secret" class="text-xs admin-muted">{{ setting.configured ? "Секрет задан. Пустое поле оставляет его без изменений." : "Секрет не задан." }}</p>
            <p v-if="removed.has(setting.key)" class="text-sm text-amber-700">Ключ будет удалён после сохранения.</p>
          </div>
        </fieldset>
        <div class="flex flex-wrap gap-2">
          <template v-if="selectedGroup === 'Telegram' || selectedGroup === 'MAX'">
            <u-button :disabled="busy" variant="soft" @click="check(selectedGroup === 'Telegram' ? 'telegram' : 'max')">Проверить бота</u-button>
          </template>
          <template v-if="availableChecks.length">
            <u-button v-for="purpose in availableChecks" :key="purpose.value" :disabled="busy" variant="soft" @click="check(`${selectedGroup.toLowerCase()}:${purpose.value}`)">
              Проверить: {{ purpose.label }}
            </u-button>
          </template>
        </div>
        <div class="admin-toolbar instance-savebar">
          <u-button :disabled="busy || !changedCount || conflict" :loading="busy" @click="save">Сохранить изменения{{ changedCount ? ` (${changedCount})` : '' }}</u-button>
          <u-modal title="Отменить изменения?" description="Несохранённый черновик будет заменён текущими значениями сервера.">
            <u-button variant="ghost" color="neutral" :disabled="busy || !changedCount">Отменить правки</u-button>
            <template #footer="{ close }"><u-button color="neutral" variant="ghost" @click="close">Продолжить редактирование</u-button><u-button @click="load(); close()">Отменить правки</u-button></template>
          </u-modal>
          <span class="admin-muted text-xs">{{ changedCount ? 'Есть несохранённые изменения' : 'Изменений нет' }}</span>
        </div>
        <p v-if="!['Оформление вуза', 'Технический профиль'].includes(selectedGroup)" class="text-sm admin-muted">Смену пространства эмбеддингов при наполненной базе система блокирует до переиндексации. CRAG, FAQ и лимиты запросов доступны в разделе «Правила и лимиты».</p>
      </div>
    </div>
    <u-button v-else :loading="busy" variant="soft" @click="load">Загрузить настройки</u-button>
    <u-modal :open="leaveOpen" title="Есть несохранённые изменения" description="Сохраните настройки или подтвердите уход без сохранения." @update:open="open => { if (!open) decideLeave(false) }">
      <template #footer><div class="admin-actions"><u-button color="neutral" variant="ghost" @click="decideLeave(false)">Продолжить редактирование</u-button><u-button color="error" @click="decideLeave(true)">Уйти без сохранения</u-button></div></template>
    </u-modal>
  </section>
</template>

<style>
.instance-editor {
  padding: 24px;
}

.instance-field {
  display: grid;
  gap: 6px;
  padding-bottom: 20px;
  border-bottom: 1px solid var(--ui-border);
}

.instance-control {
  background: var(--ui-bg);
  color: var(--ui-text);
  border: 1px solid var(--ui-border);
  border-radius: 8px;
  padding: 8px 10px;
  font-size: 14px;
}

.instance-workspace {
  display: grid;
  grid-template-columns: 200px minmax(0, 1fr);
  gap: 28px;
}

.instance-groups {
  display: flex;
  flex-direction: column;
  align-self: start;
  gap: 4px;
}

.instance-groups button {
  text-align: left;
  padding: 10px 12px;
  border-radius: 8px;
  font-size: 14px;
}

.instance-groups button[aria-current="page"] {
  color: var(--ui-primary);
  background: var(--ui-bg-elevated);
}

.instance-savebar {
  border-top: 1px solid var(--ui-border);
  padding-top: 20px;
}
@media (width < 768px) {
  .instance-workspace {
    grid-template-columns: 1fr;
  }

  .instance-groups {
    flex-flow: row wrap;
  }
}
</style>
