<script setup lang="ts">
import type { AdmissionBasis, ScoreItem } from "~/services/admission-scores"
import { getAdmissionScores, importAdmissionScore } from "~/services/admission-scores"
import { educationLevelLabel, getFaculties } from "~/services/faculties"
import type { StudyFormValue } from "~/utils/admission-scores"
import { admissionBasisOptions, httpUrl, MAX_SOURCE_LENGTH, optionalNumber, scoreProgramKey, studyFormOptions, validSeatCount } from "~/utils/admission-scores"

const toast = useToast()
const { data: university } = await useUniversityIdentity()
const { data: facultiesData, status: facultiesStatus, error: facultiesError } = await useAsyncData("score-faculties", getFaculties)
const { data: scoresData, status: scoresStatus, error: scoresError, refresh } = await useAsyncData("admission-scores", getAdmissionScores)

const faculties = computed(() => facultiesData.value ?? [])
const scores = computed(() => [...(scoresData.value ?? [])].sort((a, b) => b.year - a.year || a.faculty_name.localeCompare(b.faculty_name) || a.program_name.localeCompare(b.program_name)))
const facultyOptions = computed(() => faculties.value.map(faculty => ({ label: faculty.name, value: faculty.id })))
const currentYear = new Date().getFullYear()
const state = reactive({
  faculty_id: "",
  program_id: "",
  year: String(currentYear - 1) as string | number,
  admissionBasis: "budget" as AdmissionBasis,
  studyForm: "unknown" as StudyFormValue,
  passingScore: "" as string | number,
  averageScore: "" as string | number,
  seatCount: "" as string | number,
  sourceUrl: "",
})
const selectedFaculty = computed(() => faculties.value.find(faculty => faculty.id === state.faculty_id))
const programs = computed(() => selectedFaculty.value?.programs ?? [])
const programOptions = computed(() => programs.value.map(program => ({ label: `${program.name} (${educationLevelLabel(program.level)})`, value: program.id })))
const selectedProgram = computed(() => programs.value.find(program => program.id === state.program_id))
const isSaving = ref(false)
const editingScore = shallowRef<ScoreItem>()
const scoreForm = useTemplateRef("scoreForm")

const filters = reactive({
  program: "all",
  year: "all",
  studyForm: "all",
  admissionBasis: "all",
})
const all = { value: "all", label: "Все" }
const filterProgramOptions = computed(() => [all, ...new Map(scores.value.map(score => [
  scoreProgramKey(score),
  { value: scoreProgramKey(score), label: `${score.program_name} — ${score.faculty_name} (${educationLevelLabel(score.level)})` },
])).values()])
const filterYearOptions = computed(() => [all, ...[...new Set(scores.value.map(score => score.year))].map(year => ({ value: String(year), label: String(year) }))])
const visibleScores = computed(() => scores.value.filter(score =>
  (filters.program === "all" || scoreProgramKey(score) === filters.program)
  && (filters.year === "all" || String(score.year) === filters.year)
  && (filters.studyForm === "all" || (score.study_form ?? "unknown") === filters.studyForm)
  && (filters.admissionBasis === "all" || (score.admission_basis ?? score.form) === filters.admissionBasis),
))

watch(() => state.faculty_id, () => {
  state.program_id = ""
}, { flush: "sync" })

function editScores(score: ScoreItem) {
  const faculty = faculties.value.find(item => item.name === score.faculty_name)
  const matches = faculty?.programs?.filter(item => item.name === score.program_name && (item.code ?? null) === (score.code ?? null) && item.level === score.level) ?? []
  const basis = admissionBasisOptions.find(option => option.value === (score.admission_basis ?? score.form))?.value
  const program = matches.length === 1 ? matches[0] : undefined
  if (!faculty || !program || !basis) {
    toast.add({ title: "Не удалось выбрать программу и основание приёма для записи", color: "error" })
    return
  }

  state.faculty_id = faculty.id
  state.program_id = program.id
  state.year = String(score.year)
  state.admissionBasis = basis
  state.studyForm = score.study_form ?? "unknown"
  state.passingScore = score.passing_score ?? ""
  state.averageScore = score.average_score ?? ""
  state.seatCount = ""
  state.sourceUrl = ""
  scoreForm.value?.scrollIntoView({ behavior: "smooth" })
}

function onEdited(score: ScoreItem) {
  scoresData.value = scoresData.value?.map(item => item.id === score.id ? score : item)
  editingScore.value = undefined
  toast.add({ title: "Данные приёма обновлены", color: "success" })
}

async function saveScore() {
  const faculty = selectedFaculty.value
  const program = selectedProgram.value
  const year = Number(state.year)
  const studyForm = state.studyForm === "unknown" ? null : state.studyForm
  const passingScore = optionalNumber(state.passingScore)
  const averageScore = optionalNumber(state.averageScore)
  const seatCount = optionalNumber(state.seatCount)
  const sourceInput = state.sourceUrl.trim()
  const sourceUrl = httpUrl(sourceInput) ?? null

  if (!faculty || !program || !/^\d{4}$/.test(String(state.year)) || year < 1900 || year > currentYear) {
    toast.add({ title: "Проверьте направление и год приёма", color: "error" })
    return
  }
  if ([passingScore, averageScore].some(score => score !== null && (!Number.isFinite(score) || score < 0))) {
    toast.add({ title: "Баллы должны быть неотрицательными числами", color: "error" })
    return
  }
  if (!validSeatCount(seatCount)) {
    toast.add({ title: "Укажите целое неотрицательное число мест", color: "error" })
    return
  }
  if (sourceInput && (!sourceUrl || sourceInput.length > MAX_SOURCE_LENGTH)) {
    toast.add({ title: "Укажите ссылку на источник, которая начинается с http:// или https://", color: "error" })
    return
  }
  if (passingScore === null && averageScore === null && seatCount === null && sourceUrl === null) {
    toast.add({ title: "Укажите баллы, число объявленных мест или источник", color: "error" })
    return
  }

  const programData = { faculty_name: faculty.name, program_name: program.name, code: program.code, level: program.level }
  const programKey = scoreProgramKey(programData)
  if (passingScore !== null && averageScore === null && scores.value.some(score =>
    scoreProgramKey(score) === programKey && score.year === year && (score.study_form ?? null) === studyForm
    && (score.admission_basis ?? score.form) === state.admissionBasis && score.average_score != null,
  )) {
    toast.add({ title: "Укажите средний балл", description: "Сохранённый средний балл можно заменить, но нельзя удалить.", color: "error" })
    return
  }

  isSaving.value = true
  try {
    const result = await importAdmissionScore({
      ...programData,
      year,
      admission_basis: state.admissionBasis,
      study_form: studyForm,
      passing_score: passingScore,
      average_score: averageScore,
      seat_count: seatCount,
      source_url: sourceUrl,
    })
    if (result.skipped > 0 || result.created + result.updated === 0) {
      toast.add({ title: "Запись не сохранена", description: "Направление не удалось сопоставить со справочником", color: "error" })
      return
    }
    toast.add({ title: result.created ? "Запись добавлена" : "Запись обновлена", color: "success" })
    state.passingScore = ""
    state.averageScore = ""
    state.seatCount = ""
    state.sourceUrl = ""
    await refresh()
  } catch {
    toast.add({ title: "Не удалось сохранить данные приёма", color: "error" })
  } finally {
    isSaving.value = false
  }
}
</script>

<template lang="pug">
ui-page(title="Баллы и места")
  div(class="space-y-4")
    section(ref="scoreForm")
      ui-box(title="Добавить или обновить запись")
        p(class="text-sm text-muted mb-4") Повторный ввод для той же программы, года, формы обучения и основания обновляет запись. Пустые поля сохраняют ранее внесённые данные.
        ui-empty-state(v-if="facultiesStatus === 'pending'" kind="loading" title="Загружаем направления…")
        ui-empty-state(v-else-if="facultiesError" kind="error" title="Не удалось загрузить направления.")
        u-form(v-else :state="state" class="space-y-4" @submit="saveScore")
          div(class="grid gap-3 md:grid-cols-2")
            u-form-field(label="Факультет" name="faculty_id" required)
              u-select(v-model="state.faculty_id" :items="facultyOptions" placeholder="Выберите факультет" class="w-full")
            u-form-field(label="Направление" name="program_id" required)
              u-select(v-model="state.program_id" :items="programOptions" placeholder="Выберите направление" :disabled="!state.faculty_id" class="w-full")
          div(class="grid gap-3 sm:grid-cols-3")
            u-form-field(label="Год приёма" name="year" required)
              u-input(v-model="state.year" type="number" min="1900" :max="currentYear" class="w-full")
            u-form-field(label="Проходной балл" name="passing_score")
              u-input(v-model="state.passingScore" type="number" min="0" step="any" class="w-full")
            u-form-field(label="Средний балл" name="average_score")
              u-input(v-model="state.averageScore" type="number" min="0" step="any" class="w-full")
          admission-scores-metadata-fields(
            v-model:study-form="state.studyForm"
            v-model:admission-basis="state.admissionBasis"
            v-model:seat-count="state.seatCount"
            v-model:source-url="state.sourceUrl"
          )
          div(class="flex justify-end")
            u-button(type="submit" color="primary" :loading="isSaving") Сохранить запись

    ui-box(title="Сохранённые данные приёма")
      div(v-if="university?.profile === 'nsu'" class="mb-4")
        admission-scores-import-dialog(@imported="() => refresh()")
      ui-empty-state(v-if="scoresStatus === 'pending' && scores.length === 0" kind="loading" title="Загружаем баллы…")
      ui-empty-state(v-else-if="scoresError" kind="error" title="Не удалось загрузить баллы.")
        u-button(variant="outline" @click="() => refresh()") Повторить
      ui-empty-state(v-else-if="scores.length === 0" title="Баллы пока не добавлены.")
      template(v-else)
        div(role="group" aria-label="Фильтры записей" class="grid gap-3 mb-4 sm:grid-cols-2 xl:grid-cols-4")
          u-form-field(label="Направление")
            u-select(v-model="filters.program" :items="filterProgramOptions" class="w-full")
          u-form-field(label="Год приёма")
            u-select(v-model="filters.year" :items="filterYearOptions" class="w-full")
          u-form-field(label="Форма обучения")
            u-select(v-model="filters.studyForm" :items="[all, ...studyFormOptions]" class="w-full")
          u-form-field(label="Основание приёма")
            u-select(v-model="filters.admissionBasis" :items="[all, ...admissionBasisOptions]" class="w-full")
        admission-scores-records-table(v-if="visibleScores.length" :rows="visibleScores")
          template(#actions="{ score }")
            div(class="flex flex-col items-start")
              u-button(size="xs" variant="ghost" class="whitespace-nowrap" @click="editingScore = score") Изменить запись
              u-button(size="xs" variant="ghost" class="whitespace-nowrap" @click="editScores(score)") Изменить баллы
        ui-empty-state(v-else title="По выбранным фильтрам записей нет.")

  admission-scores-edit-dialog(v-if="editingScore" :score="editingScore" @close="editingScore = undefined" @saved="onEdited")
</template>
