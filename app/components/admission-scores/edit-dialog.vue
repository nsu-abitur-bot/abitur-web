<script setup lang="ts">
import type { ScoreItem, ScoreUpdate } from "~/services/admission-scores"
import { updateAdmissionScore } from "~/services/admission-scores"
import type { StudyFormValue } from "~/utils/admission-scores"
import { admissionBasisOptions, httpUrl, MAX_SOURCE_LENGTH, optionalNumber, validSeatCount } from "~/utils/admission-scores"

const props = defineProps<{ score: ScoreItem }>()
const emit = defineEmits<{ close: [], saved: [score: ScoreItem] }>()

const initialBasis = admissionBasisOptions.find(option => option.value === (props.score.admission_basis ?? props.score.form))?.value
const state = reactive({
  studyForm: (props.score.study_form ?? "unknown") as StudyFormValue,
  admissionBasis: initialBasis ?? "budget" as const,
  seatCount: props.score.seat_count ?? "" as string | number,
  sourceUrl: props.score.source_url ?? "",
})

const saving = ref(false)
const error = ref("")

function close() {
  if (!saving.value) {
    emit("close")
  }
}

async function save() {
  const score = props.score
  const seatCount = optionalNumber(state.seatCount)
  const previousSource = score.source_url ?? ""
  const sourceChanged = state.sourceUrl !== previousSource
  const sourceInput = state.sourceUrl.trim()
  const sourceUrl = httpUrl(sourceInput) ?? null
  if (!validSeatCount(seatCount)) {
    error.value = "Укажите целое неотрицательное число мест."
    return
  }
  if (sourceChanged && sourceInput && (!sourceUrl || sourceInput.length > MAX_SOURCE_LENGTH)) {
    error.value = "Укажите ссылку на источник, которая начинается с http:// или https://."
    return
  }

  const studyForm = state.studyForm === "unknown" ? null : state.studyForm
  const changes: ScoreUpdate = {}
  if (studyForm !== (score.study_form ?? null)) {
    changes.study_form = studyForm
  }
  if (state.admissionBasis !== initialBasis) {
    changes.admission_basis = state.admissionBasis
  }
  if (seatCount !== (score.seat_count ?? null)) {
    changes.seat_count = seatCount
  }
  if (sourceChanged && sourceUrl !== (score.source_url ?? null)) {
    changes.source_url = sourceUrl
  }
  if (Object.keys(changes).length === 0) {
    close()
    return
  }

  saving.value = true
  error.value = ""
  try {
    emit("saved", await updateAdmissionScore(score.id, changes))
  } catch (failure) {
    const status = (failure as { statusCode?: number }).statusCode
    error.value = status === 409
      ? "Для этой программы, года, формы обучения и основания приёма уже есть запись."
      : "Не удалось сохранить данные приёма."
  } finally {
    saving.value = false
  }
}
</script>

<template lang="pug">
ui-form-dialog(:open="true" title="Редактирование данных приёма" :dismissible="!saving" @update:open="close")
  template(#body)
    p(class="text-sm text-muted") {{ score.program_name }}, {{ score.faculty_name }}, {{ score.year }}
    u-form(id="edit-admission-score" :state="state" @submit="save")
      admission-scores-metadata-fields(
        v-model:study-form="state.studyForm"
        v-model:admission-basis="state.admissionBasis"
        v-model:seat-count="state.seatCount"
        v-model:source-url="state.sourceUrl"
      )
    p(v-if="error" role="alert" class="text-sm text-error") {{ error }}
  template(#footer)
    u-button(variant="outline" color="neutral" :disabled="saving" @click="close") Отмена
    u-button(type="submit" form="edit-admission-score" :loading="saving") Сохранить изменения
</template>
