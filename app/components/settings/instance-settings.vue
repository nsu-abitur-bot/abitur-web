<script setup lang="ts">
import { onBeforeRouteLeave } from "vue-router"

import type { InstanceSettings } from "~/services/instance-settings"
import { checkInstanceConnection, collectChanges, connectionPurposes, getInstanceSettings, isRevisionConflict, rebaseSettings, saveInstanceSettings } from "~/services/instance-settings"
import type { InstanceSection } from "~/utils/instance-settings-layout"
import { instanceGroup, instanceSection, instanceSections, isAdvancedSetting, isBrandingSetting } from "~/utils/instance-settings-layout"

const { refresh: refreshUniversity } = useUniversityIdentity()
const { refresh: refreshBranding } = useBranding()
const logoFile = ref<File | null>(null)
const removeLogo = ref(false)
const snapshot = ref<InstanceSettings | null>(null)
const authToken = useAuthToken()
const draft = ref<Record<string, string>>({})
const removed = reactive(new Set<string>())
const selectedSection = ref<InstanceSection>("Модели")
const modelDirty = ref(0)
const migrationActive = ref(false)
const modelFeature = computed(() => snapshot.value?.settings.some(setting => setting.key === "TEXT_PROVIDER"))
const busy = ref(false)
const conflict = ref(false)
const review = ref<string[]>([])
const message = ref("")
const error = ref("")
const groups = computed(() => [...new Set(snapshot.value?.settings.filter(s => instanceSection(s) === selectedSection.value && !isBrandingSetting(s)).map(instanceGroup) ?? [])].sort((a, b) => Number(b === "Назначение моделей") - Number(a === "Назначение моделей")))
function isCollapsible(group: string) {
  return selectedSection.value === "Дополнительно" || (selectedSection.value === "Модели" && group !== "Назначение моделей") || group === "Контакты и помощник"
}
function settingsFor(group: string, advanced = false) {
  return snapshot.value?.settings.filter(s => instanceSection(s) === selectedSection.value && instanceGroup(s) === group && !isBrandingSetting(s) && (selectedSection.value === "Дополнительно" ? !advanced : isAdvancedSetting(s) === advanced)) ?? []
}
const changes = computed(() => collectChanges(snapshot.value?.settings ?? [], draft.value, removed))
function groupChanges(group: string) {
  return snapshot.value?.settings.filter(s => instanceGroup(s) === group && Object.hasOwn(changes.value, s.key)).length ?? 0
}
const settingsChangedCount = computed(() => Object.keys(changes.value).length + Number(Boolean(logoFile.value || removeLogo.value)))
const changedCount = computed(() => settingsChangedCount.value + modelDirty.value)

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
  if (!data.settings.some(setting => instanceSection(setting) === selectedSection.value)) {
    selectedSection.value = instanceSections.find(section => data.settings.some(setting => instanceSection(setting) === section)) ?? "Модели"
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
    <p v-if="snapshot && !snapshot.encryption_ready && ['Модели', 'Боты'].includes(selectedSection)" class="mb-4 text-sm text-amber-700" role="status">
      Сохранение секретов недоступно: на сервере не настроен ключ шифрования.
    </p>
    <p v-if="error && snapshot?.settings.length" class="mb-4 text-sm text-error" role="alert">{{ error }}</p>
    <p v-if="message" class="mb-4 text-sm admin-muted" role="status">{{ message }}</p>
    <div v-if="conflict" class="admin-toolbar mb-4">
      <u-button :loading="busy" @click="rebase">Загрузить версию и сверить черновик</u-button>
    </div>
    <p v-if="review.length" class="mb-4 text-sm" role="status">Проверьте пересекающиеся изменения: {{ review.join(', ') }}. Секреты нельзя сравнить: сервер не возвращает их значения.</p>
    <ui-empty-state v-if="busy && !snapshot?.settings.length" kind="loading" title="Загрузка настроек…" />
    <ui-empty-state v-else-if="error && !snapshot?.settings.length" kind="error" :title="error">
      <u-button color="neutral" variant="outline" :loading="busy" @click="load">Загрузить настройки</u-button>
    </ui-empty-state>
    <ui-empty-state v-else-if="snapshot && !snapshot.settings.length && !error" title="Настроек пока нет">
      <u-button color="neutral" variant="outline" :loading="busy" @click="load">Обновить</u-button>
    </ui-empty-state>
    <div v-else-if="snapshot?.settings.length" class="instance-workspace">
      <nav class="instance-sections" aria-label="Разделы подключений">
        <button v-for="section in instanceSections" :key="section" type="button" :aria-current="selectedSection === section ? 'page' : undefined" @click="selectedSection = section">{{ section }}</button>
      </nav>
      <div class="instance-content">
        <header class="instance-heading"><h2>{{ selectedSection }}</h2><span class="admin-muted text-xs" role="status">{{ changedCount ? `Не сохранено: ${changedCount}` : 'Изменений нет' }}</span></header>
        <ui-empty-state v-if="!snapshot.settings.some(setting => instanceSection(setting) === selectedSection)" title="Настроек в этом разделе пока нет" />
        <settings-model-connections v-if="modelFeature" v-show="selectedSection === 'Модели'" :snapshot="snapshot" @dirty="modelDirty = $event" @pending="migrationActive = $event" @saved="rebase" />
        <fieldset v-if="!modelFeature || selectedSection !== 'Модели'" :disabled="busy || migrationActive" class="instance-fields">
          <settings-university-branding v-if="selectedSection === 'Оформление' && snapshot.settings.some(isBrandingSetting)" v-model:draft="draft" v-model:file="logoFile" v-model:remove="removeLogo" />
          <template v-for="group in groups" :key="group">
            <component :is="isCollapsible(group) ? 'details' : 'section'" class="instance-group">
              <component :is="isCollapsible(group) ? 'summary' : 'h3'" class="instance-group-title">
                {{ group }}<span v-if="groupChanges(group)" class="instance-draft-mark">Изменено: {{ groupChanges(group) }}</span>
              </component>
              <div class="instance-group-body">
                <p v-if="group === 'Профиль вуза'" class="text-sm admin-muted">Смена профиля не удаляет данные. Для другого вуза нужен отдельный экземпляр с чистой базой.</p>
                <div class="instance-field-grid">
                  <settings-instance-field v-for="setting in settingsFor(group)" :key="setting.key" v-model="draft[setting.key]!" :setting="setting" :removed="removed.has(setting.key)" :disabled="busy" @remove="toggleRemoval(setting.key)" />
                </div>
                <details v-if="settingsFor(group, true).length" class="instance-advanced">
                  <summary>Дополнительно</summary>
                  <div class="instance-field-grid">
                    <settings-instance-field v-for="setting in settingsFor(group, true)" :key="setting.key" v-model="draft[setting.key]!" :setting="setting" :removed="removed.has(setting.key)" :disabled="busy" @remove="toggleRemoval(setting.key)" />
                  </div>
                </details>
                <div v-if="connectionPurposes(snapshot.settings, group).length || ['Telegram', 'MAX'].includes(group)" class="instance-checks">
                  <p v-if="connectionPurposes(snapshot.settings, group).length" class="text-xs admin-muted">Проверка отправит запрос к модели и может расходовать токены.</p>
                  <div class="flex flex-wrap gap-2">
                    <u-button v-if="group === 'Telegram' || group === 'MAX'" :disabled="busy" color="neutral" variant="outline" @click="check(group === 'Telegram' ? 'telegram' : 'max')">Проверить бота</u-button>
                    <u-button v-for="purpose in connectionPurposes(snapshot.settings, group)" :key="purpose.value" :disabled="busy" color="neutral" variant="outline" @click="check(`${group.toLowerCase()}:${purpose.value}`)">Проверить: {{ purpose.label }}</u-button>
                  </div>
                </div>
                <p v-if="group === 'Назначение моделей'" class="text-xs admin-muted">Смена пространства эмбеддингов при наполненной базе заблокирована до переиндексации.</p>
              </div>
            </component>
          </template>
        </fieldset>
        <div v-if="!modelFeature || selectedSection !== 'Модели'" class="admin-toolbar instance-savebar">
          <u-button :disabled="busy || migrationActive || !settingsChangedCount || conflict" :loading="busy" @click="save">Сохранить изменения{{ settingsChangedCount ? ` (${settingsChangedCount})` : '' }}</u-button>
          <u-modal title="Отменить изменения?" description="Несохранённый черновик будет заменён текущими значениями сервера.">
            <u-button variant="ghost" color="neutral" :disabled="busy || !settingsChangedCount">Отменить правки</u-button>
            <template #footer="{ close }"><u-button color="neutral" variant="ghost" @click="close">Продолжить редактирование</u-button><u-button @click="load(); close()">Отменить правки</u-button></template>
          </u-modal>
        </div>
      </div>
    </div>
    <u-button v-else :loading="busy" variant="soft" @click="load">Загрузить настройки</u-button>
    <u-modal :open="leaveOpen" title="Есть несохранённые изменения" description="Сохраните настройки или подтвердите уход без сохранения." @update:open="open => { if (!open) decideLeave(false) }">
      <template #footer><div class="admin-actions"><u-button color="neutral" variant="ghost" @click="decideLeave(false)">Продолжить редактирование</u-button><u-button color="error" @click="decideLeave(true)">Уйти без сохранения</u-button></div></template>
    </u-modal>
  </section>
</template>

<style>
.instance-editor .instance-control {
  background: var(--ui-bg);
  color: var(--ui-text);
  border: 1px solid var(--ui-border);
  border-radius: 8px;
  padding: 8px 10px;
  font-size: 14px;
}
</style>

<style scoped>
.instance-editor {
  padding: 24px;
}

.instance-workspace,
.instance-content,
.instance-fields {
  display: grid;
  gap: 24px;
  min-width: 0;
}

.instance-sections {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  border-bottom: 1px solid var(--ui-border);
  padding-bottom: 12px;
}

.instance-sections button {
  padding: 8px 12px;
  border-radius: 8px;
  font-size: 14px;
}

.instance-sections button[aria-current="page"] {
  color: var(--ui-primary);
  background: var(--ui-bg-elevated);
  font-weight: 600;
}

.instance-heading {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.instance-heading h2 {
  font-size: 18px;
  font-weight: 600;
}

.instance-group {
  min-width: 0;
  border-bottom: 1px solid var(--ui-border);
  padding-bottom: 20px;
}

.instance-group-title {
  font-size: 14px;
  font-weight: 600;
}

summary {
  cursor: pointer;
}

.instance-group-body {
  display: grid;
  gap: 20px;
  padding-top: 20px;
}

.instance-field-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 20px 24px;
}

.instance-advanced {
  color: var(--ui-text-muted);
  font-size: 14px;
}

.instance-advanced .instance-field-grid {
  padding-top: 20px;
  color: var(--ui-text);
}

.instance-checks {
  display: grid;
  gap: 10px;
}

.instance-draft-mark {
  display: inline-block;
  margin-left: 12px;
  font-size: 12px;
  color: var(--ui-primary);
  font-weight: 400;
}

.instance-savebar {
  border: 0;
  padding: 0;
}

@media (width < 768px) {
  .instance-editor {
    padding: 16px;
  }

  .instance-field-grid {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
