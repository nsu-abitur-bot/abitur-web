<script setup lang="ts">
import type { AdmissionBasis } from "~/services/admission-scores"
import type { StudyFormValue } from "~/utils/admission-scores"
import { admissionBasisOptions, MAX_SEAT_COUNT, MAX_SOURCE_LENGTH, studyFormOptions } from "~/utils/admission-scores"

const studyForm = defineModel<StudyFormValue>("studyForm", { required: true })
const admissionBasis = defineModel<AdmissionBasis>("admissionBasis", { required: true })
const seatCount = defineModel<string | number>("seatCount", { required: true })
const sourceUrl = defineModel<string>("sourceUrl", { required: true })
</script>

<template lang="pug">
div(class="grid gap-3 sm:grid-cols-2")
  u-form-field(label="Форма обучения" name="study_form")
    u-select(v-model="studyForm" :items="studyFormOptions" class="w-full")
  u-form-field(label="Основание приёма" name="admission_basis" required)
    u-select(v-model="admissionBasis" :items="admissionBasisOptions" class="w-full")
  u-form-field(label="Объявленные места" name="seat_count")
    u-input(v-model="seatCount" type="number" min="0" :max="MAX_SEAT_COUNT" step="1" placeholder="Неизвестно" class="w-full")
  u-form-field(label="Источник" name="source_url")
    u-input(v-model="sourceUrl" type="url" placeholder="https://" :maxlength="MAX_SOURCE_LENGTH" class="w-full")
</template>
