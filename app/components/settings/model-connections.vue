<script setup lang="ts">
import type {
  InstanceSetting,
  InstanceSettings,
} from "~/services/instance-settings"
import {
  checkInstanceConnection,
  collectChanges,
  rebaseSettings,
} from "~/services/instance-settings"
import type { ModelConfiguration } from "~/services/model-settings"
import {
  checkModelChanges,
  controlModelJob,
  getModelConfiguration,
  isModelJobActive,
  modelChoices,
  modelSnapshot,
  saveModelConfiguration,
} from "~/services/model-settings"

const props = defineProps<{ snapshot: InstanceSettings }>()
const emit = defineEmits<{
  dirty: [count: number]
  saved: []
  pending: [active: boolean]
}>()
const configuration = ref<ModelConfiguration | null>(null)
const baseline = ref<InstanceSettings | null>(null)
const draft = ref<Record<string, string>>({})
const removed = reactive(new Set<string>())
const busy = ref(false)
const error = ref("")
const message = ref("")
const confirmOpen = ref(false)
const conflict = ref(false)
const active = computed(() => isModelJobActive(configuration.value?.job))
const changes = computed(() =>
  collectChanges(baseline.value?.settings ?? [], draft.value, removed),
)
const providerLabels: Record<string, string> = {
  openai: "OpenAI",
  gemini: "Gemini",
  deepseek: "DeepSeek",
  gigachat: "GigaChat",
}
const textProviders = ["openai", "gemini", "deepseek"].map(value => ({
  value,
  label: providerLabels[value],
}))
const embeddingProviders = ["openai", "gemini", "gigachat"].map(value => ({
  value,
  label: providerLabels[value],
}))
const credentials = computed(() =>
  [
    ...new Set([draft.value.TEXT_PROVIDER, draft.value.EMBEDDING_PROVIDER]),
  ].filter((value): value is string => Boolean(value)),
)
const stages: Record<string, string> = {
  queued: "Ожидает запуска",
  running: "Пересчёт эмбеддингов",
  cancelling: "Завершаем отмену",
  completed: "Новый индекс включён",
  failed: "Пересчёт не завершён",
  cancelled: "Пересчёт отменён",
}
watch(changes, value => emit("dirty", Object.keys(value).length), {
  immediate: true,
})
watch(active, value => emit("pending", value), { immediate: true })
function detail(err: unknown) {
  const text = (err as { data?: { detail?: unknown } })?.data?.detail
  return typeof text === "string"
    ? text
    : "Не удалось выполнить запрос. Повторите попытку."
}
function populate(snapshot: InstanceSettings, config: ModelConfiguration) {
  baseline.value = modelSnapshot(snapshot, config)
  configuration.value = config
  draft.value = Object.fromEntries(
    baseline.value.settings.map(setting => [
      setting.key,
      setting.secret ? "" : (setting.value ?? ""),
    ]),
  )
  removed.clear()
  conflict.value = false
}
async function load() {
  busy.value = true
  try {
    const config = await getModelConfiguration()
    populate(config.snapshot, config)
    error.value = ""
  } catch (err) {
    error.value = detail(err)
  } finally {
    busy.value = false
  }
}
watch(() => props.snapshot.revision, () => {
  if (baseline.value && Object.keys(changes.value).length) {
    conflict.value = true
    error.value = "Настройки изменились. Черновик сохранён; загрузите новую версию для сверки."
  } else {
    void load()
  }
}, { immediate: true })
function setting(key: string): InstanceSetting | undefined {
  return baseline.value?.settings.find(item => item.key === key)
}
function providerFields(provider: string, advanced: boolean) {
  const suffixes = advanced
    ? ["BASE_URL", "SOCKS5_PROXY"]
    : ["API_KEY", "SCOPE"]
  return (
    baseline.value?.settings.filter(item =>
      suffixes.some(
        suffix => item.key === `${provider.toUpperCase()}_${suffix}`,
      ),
    ) ?? []
  )
}
function selectProvider(kind: "TEXT" | "EMBEDDING", value: string) {
  draft.value[`${kind}_PROVIDER`] = value
  draft.value[`${kind}_MODEL`]
    = setting(
      `${value.toUpperCase()}_${kind === "TEXT" ? "MODEL" : "EMBEDDING_MODEL"}`,
    )?.value ?? ""
}
function toggleRemoval(key: string) {
  if (removed.has(key)) {
    removed.delete(key)
  } else {
    removed.add(key)
  }
}
async function save(confirmed = false) {
  if (!baseline.value || !configuration.value) {
    return
  }
  busy.value = true
  error.value = ""
  try {
    const result = await saveModelConfiguration(
      baseline.value.revision,
      { ...changes.value, ...modelChoices(draft.value) },
      confirmed,
    )
    if (result.job) {
      configuration.value.job = result.job
      message.value
        = "Пересчёт запущен. Поиск работает с прежним индексом до завершения."
    } else {
      message.value = "Модели сохранены."
    }
    removed.clear()
    emit("dirty", 0)
    emit("saved")
    await load()
    confirmOpen.value = false
  } catch (err) {
    confirmOpen.value = false
    error.value = detail(err)
    const response = err as { status?: number, statusCode?: number }
    conflict.value = response.status === 409 || response.statusCode === 409
    if (error.value.startsWith("Нужен пересчёт")) {
      confirmOpen.value = true
    }
  } finally {
    busy.value = false
  }
}
function requestSave() {
  const embeddingChanged = Object.keys(changes.value).some(key =>
    /^(?:EMBEDDING_|(?:OPENAI|GEMINI)_BASE_URL)/.test(key),
  )
  const legacyDiffers = configuration.value?.legacy
    .filter(row => ["FAQ", "База знаний"].includes(row.label))
    .some(
      row =>
        row.provider !== draft.value.EMBEDDING_PROVIDER
        || row.model !== draft.value.EMBEDDING_MODEL,
    )
  if (embeddingChanged || legacyDiffers || (configuration.value?.version ?? 2) < 2) {
    confirmOpen.value = true
  } else {
    void save()
  }
}
async function check(kind: "TEXT" | "EMBEDDING") {
  if (!baseline.value) {
    return
  }
  busy.value = true
  error.value = ""
  try {
    const target = `${draft.value[`${kind}_PROVIDER`]}:${kind === "TEXT" ? "chat" : "embedding"}`
    message.value = (
      await checkInstanceConnection(
        baseline.value.revision,
        checkModelChanges(draft.value, changes.value),
        target,
      )
    ).message
  } catch (err) {
    error.value = detail(err)
  } finally {
    busy.value = false
  }
}
async function rebase() {
  if (!baseline.value) {
    return
  }
  busy.value = true
  try {
    const config = await getModelConfiguration()
    const latest = config.snapshot
    const result = rebaseSettings(
      baseline.value,
      modelSnapshot(latest, config),
      draft.value,
      removed,
    )
    populate(latest, config)
    Object.assign(draft.value, result.draft)
    result.removed.forEach(key => removed.add(key))
    message.value = result.conflicts.length
      ? `Проверьте поля: ${result.conflicts.join(", ")}. Черновик сохранён.`
      : "Черновик перенесён на новую версию. Проверьте и сохраните."
  } catch (err) {
    error.value = detail(err)
  } finally {
    busy.value = false
  }
}
async function control(action: "retry" | "cancel") {
  if (!configuration.value?.job) {
    return
  }
  busy.value = true
  try {
    configuration.value.job = await controlModelJob(
      configuration.value.job.id,
      action,
    )
  } catch (err) {
    error.value = detail(err)
  } finally {
    busy.value = false
  }
}
let timer: ReturnType<typeof setTimeout> | undefined
let disposed = false
async function poll() {
  try {
    if (active.value && configuration.value && !busy.value) {
      const previous = configuration.value.job?.status
      const latest = await getModelConfiguration()
      configuration.value.job = latest.job
      if (
        previous !== latest.job?.status
        && latest.job?.status === "completed"
      ) {
        emit("saved")
      }
    }
  } catch (err) {
    error.value = detail(err)
  } finally {
    if (!disposed) {
      timer = setTimeout(poll, 2000)
    }
  }
}
onMounted(() => {
  timer = setTimeout(poll, 2000)
})
onBeforeUnmount(() => {
  disposed = true
  clearTimeout(timer)
  emit("dirty", 0)
  emit("pending", false)
})
</script>

<template>
  <div class="model-connections">
    <p v-if="error" role="alert" class="text-sm text-error">{{ error }}</p>
    <p v-if="message" role="status" class="text-sm admin-muted">
      {{ message }}
    </p>
    <u-button
      v-if="conflict"
      :loading="busy"
      color="neutral"
      variant="outline"
      @click="rebase"
    >Загрузить версию и сверить черновик</u-button>
    <ui-empty-state
      v-if="!configuration"
      :kind="error ? 'error' : 'loading'"
      :title="error || 'Загрузка моделей…'"
    >
      <u-button v-if="error" color="neutral" variant="outline" @click="load">Повторить</u-button>
    </ui-empty-state>
    <template v-else>
      <details v-if="configuration.version < 2" class="model-legacy" open>
        <summary>Сейчас этапы настроены отдельно</summary>
        <p class="text-sm admin-muted">
          После сохранения текстовые этапы будут использовать одну модель, FAQ и
          база знаний — одну модель эмбеддингов. Распознавание сканов останется
          отдельным подключением.
        </p>
        <dl>
          <template v-for="row in configuration.legacy" :key="row.label"><dt>{{ row.label }}</dt>
            <dd>
              {{ providerLabels[row.provider] ?? row.provider }} ·
              {{ row.model }}
            </dd></template>
        </dl>
      </details>
      <section
        v-if="configuration.job"
        role="status"
        aria-live="polite"
        class="model-job"
      >
        <h3>{{ stages[configuration.job.status] }}</h3>
        <p v-if="configuration.job.target_models" class="text-sm admin-muted">
          Запрошено: {{ configuration.job.target_models.TEXT_MODEL }} ·
          {{ configuration.job.target_models.EMBEDDING_MODEL }}
        </p>
        <p v-if="active" class="text-sm admin-muted">
          До завершения используется прежний индекс. Правки FAQ и материалов
          временно недоступны.
        </p>
        <p
          v-if="configuration.job.progress.completed_vectors !== undefined"
          class="text-sm"
        >
          Рассчитано уникальных векторов:
          {{ configuration.job.progress.completed_vectors }}
        </p>
        <p v-if="configuration.job.error" class="text-sm text-error">
          {{ configuration.job.error }}
        </p>
        <div class="flex flex-wrap gap-2">
          <u-button
            v-if="['queued', 'running'].includes(configuration.job.status)"
            :disabled="busy"
            color="neutral"
            variant="outline"
            @click="control('cancel')"
          >Отменить пересчёт</u-button>
          <u-button
            v-if="['failed', 'cancelled'].includes(configuration.job.status)"
            :disabled="busy"
            color="neutral"
            variant="outline"
            @click="control('retry')"
          >Продолжить пересчёт</u-button>
        </div>
      </section>
      <fieldset :disabled="busy || active" class="model-fields">
        <div class="model-assignments">
          <section class="model-assignment">
            <h3>Текстовая модель</h3>
            <p class="text-sm admin-muted">
              Ответы, поиск по знаниям и обработка текста.
            </p>
            <u-form-field label="Провайдер текста"><u-select
              :model-value="draft.TEXT_PROVIDER"
              :items="textProviders"
              class="w-full"
              @update:model-value="
                (value) => selectProvider('TEXT', String(value))
              "
            /></u-form-field>
            <u-form-field label="Текстовая модель"><u-input v-model="draft.TEXT_MODEL" class="w-full" /></u-form-field>
            <u-button
              color="neutral"
              variant="outline"
              :disabled="busy || active"
              @click="check('TEXT')"
            >Проверить текстовую модель</u-button>
          </section>
          <section class="model-assignment">
            <h3>Модель эмбеддингов</h3>
            <p class="text-sm admin-muted">
              Единая модель поиска для FAQ и базы знаний.
            </p>
            <u-form-field label="Провайдер эмбеддингов"><u-select
              :model-value="draft.EMBEDDING_PROVIDER"
              :items="embeddingProviders"
              class="w-full"
              @update:model-value="
                (value) => selectProvider('EMBEDDING', String(value))
              "
            /></u-form-field>
            <u-form-field label="Модель эмбеддингов"><u-input v-model="draft.EMBEDDING_MODEL" class="w-full" /></u-form-field>
            <u-button
              color="neutral"
              variant="outline"
              :disabled="busy || active"
              @click="check('EMBEDDING')"
            >Проверить эмбеддинги</u-button>
          </section>
        </div>
        <details class="model-vision">
          <summary>Распознавание сканов PDF</summary>
          <p class="text-sm admin-muted">
            Текстовый слой PDF читается без модели. Для сканов нужно подключение
            OpenAI или Gemini. DeepSeek изображения не распознаёт.
          </p>
          <u-switch
            :model-value="draft.DOCUMENT_RECOGNITION_ENABLED === 'true'"
            label="Распознавать сканы"
            @update:model-value="
              (value) =>
                (draft.DOCUMENT_RECOGNITION_ENABLED = value ? 'true' : 'false')
            "
          />
          <template v-if="draft.DOCUMENT_RECOGNITION_ENABLED === 'true'">
            <settings-instance-field
              v-if="setting('PDF_PARSER_PROVIDER')"
              v-model="draft.PDF_PARSER_PROVIDER!"
              :setting="setting('PDF_PARSER_PROVIDER')!"
              :removed="false"
            />
            <settings-instance-field
              v-if="
                setting(
                  `${draft.PDF_PARSER_PROVIDER?.toUpperCase()}_MODEL_VISION`,
                )
              "
              v-model="
                draft[
                  `${draft.PDF_PARSER_PROVIDER?.toUpperCase()}_MODEL_VISION`
                ]!
              "
              :setting="
                setting(
                  `${draft.PDF_PARSER_PROVIDER?.toUpperCase()}_MODEL_VISION`,
                )!
              "
              :removed="false"
            />
            <template
              v-if="!credentials.includes(draft.PDF_PARSER_PROVIDER || '')"
            >
              <settings-instance-field
                v-for="field in providerFields(
                  draft.PDF_PARSER_PROVIDER || 'openai',
                  false,
                )"
                :key="field.key"
                v-model="draft[field.key]!"
                :setting="field"
                :removed="removed.has(field.key)"
                @remove="toggleRemoval(field.key)"
              />
              <details>
                <summary>Адрес API и прокси распознавания</summary>
                <settings-instance-field
                  v-for="field in providerFields(
                    draft.PDF_PARSER_PROVIDER || 'openai',
                    true,
                  )"
                  :key="field.key"
                  v-model="draft[field.key]!"
                  :setting="field"
                  :removed="removed.has(field.key)"
                  @remove="toggleRemoval(field.key)"
                />
              </details>
            </template>
          </template>
        </details>
        <section
          v-for="provider in credentials"
          :key="provider"
          class="model-connection"
        >
          <h3>Подключение {{ providerLabels[provider] ?? provider }}</h3>
          <settings-instance-field
            v-for="field in providerFields(provider, false)"
            :key="field.key"
            v-model="draft[field.key]!"
            :setting="field"
            :removed="removed.has(field.key)"
            @remove="toggleRemoval(field.key)"
          />
          <details v-if="providerFields(provider, true).length">
            <summary>Адрес API и прокси</summary>
            <settings-instance-field
              v-for="field in providerFields(provider, true)"
              :key="field.key"
              v-model="draft[field.key]!"
              :setting="field"
              :removed="removed.has(field.key)"
              @remove="toggleRemoval(field.key)"
            />
          </details>
        </section>
        <p class="text-xs admin-muted">
          Проверка и сохранение отправляют небольшие запросы к выбранным
          моделям. Сохранённые ключи не показываются.
        </p>
      </fieldset>
      <div class="admin-toolbar instance-savebar">
        <u-button
          :loading="busy"
          :disabled="
            busy
              || active
              || conflict
              || (!Object.keys(changes).length && configuration.version >= 2)
          "
          @click="requestSave"
        >{{
          configuration.version < 2
            ? "Применить общие модели"
            : "Сохранить модели"
        }}</u-button>
        <u-button
          color="neutral"
          variant="ghost"
          :disabled="busy || active || !Object.keys(changes).length"
          @click="load"
        >Отменить правки</u-button>
      </div>
    </template>
    <u-modal
      v-model:open="confirmOpen"
      title="Пересчитать эмбеддинги?"
      description="Пересчёт использует платные запросы к новой модели. Старый индекс продолжит отвечать до завершения, а правки FAQ и материалов временно приостановятся. При ошибке старый индекс сохранится."
    >
      <template #footer><u-button
        color="neutral"
        variant="ghost"
        :disabled="busy"
        @click="confirmOpen = false"
      >Отмена</u-button><u-button :loading="busy" @click="save(true)">Сохранить и пересчитать</u-button></template>
    </u-modal>
  </div>
</template>

<style scoped>
.model-connections,
.model-fields,
.model-assignment,
.model-connection,
.model-vision,
.model-legacy,
.model-job {
  display: grid;
  gap: 16px;
}

.model-assignments {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 24px;
}

.model-assignment {
  align-content: start;
}

h3 {
  font-weight: 600;
}

.model-connection,
.model-vision,
.model-legacy,
.model-job {
  border-top: 1px solid var(--ui-border);
  padding-top: 20px;
}

summary {
  cursor: pointer;
  font-weight: 500;
}

dl {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 8px 20px;
  font-size: 13px;
}

dd {
  overflow-wrap: anywhere;
}

details > :not(summary) {
  margin-top: 12px;
}
@media (width <= 700px) {
  .model-assignments {
    grid-template-columns: 1fr;
  }
}
</style>
