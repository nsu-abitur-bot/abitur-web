<script setup lang="ts">
import type { ScoreItem } from "~/services/admission-scores"
import { getAdmissionScores, importAdmissionScore } from "~/services/admission-scores"
import { educationLevelLabel, getFaculties } from "~/services/faculties"

const toast = useToast()
const { data: facultiesData, status: facultiesStatus, error: facultiesError } = await useAsyncData("score-faculties", getFaculties)
const { data: scoresData, status: scoresStatus, error: scoresError, refresh } = await useAsyncData("admission-scores", getAdmissionScores)

const faculties = computed(() => facultiesData.value ?? [])
const scores = computed(() => [...(scoresData.value ?? [])].sort((a, b) => b.year - a.year || a.faculty_name.localeCompare(b.faculty_name) || a.program_name.localeCompare(b.program_name)))
const facultyOptions = computed(() => faculties.value.map(faculty => ({ label: faculty.name, value: faculty.id })))
const state = reactive({
  faculty_id: "",
  program_id: "",
  year: String(new Date().getFullYear() - 1) as string | number,
  form: "budget",
  passing_score: "" as string | number,
  average_score: "" as string | number,
})
const selectedFaculty = computed(() => faculties.value.find(faculty => faculty.id === state.faculty_id))
const programs = computed(() => selectedFaculty.value?.programs ?? [])
const programOptions = computed(() => programs.value.map(program => ({ label: `${program.name} (${educationLevelLabel(program.level)})`, value: program.id })))
const selectedProgram = computed(() => programs.value.find(program => program.id === state.program_id))
const isSaving = ref(false)
const formOptions = [
  { label: "Бюджет", value: "budget" },
  { label: "Платное", value: "paid" },
]

watch(() => state.faculty_id, () => {
  state.program_id = ""
})

function editScore(score: ScoreItem) {
  const faculty = faculties.value.find(item => item.name === score.faculty_name)
  const matches = faculty?.programs?.filter(item => item.name === score.program_name && (item.code ?? null) === (score.code ?? null)) ?? []
  const program = matches.length === 1 ? matches[0] : undefined
  if (!faculty || !program) {
    toast.add({ title: "Направление не удалось однозначно найти в справочнике", color: "error" })
    return
  }
  state.faculty_id = faculty.id
  nextTick(() => {
    state.program_id = program.id
  })
  state.year = String(score.year)
  state.form = score.form
  state.passing_score = score.passing_score == null ? "" : String(score.passing_score)
  state.average_score = score.average_score == null ? "" : String(score.average_score)
  window.scrollTo({ top: 0, behavior: "smooth" })
}

async function saveScore() {
  const faculty = selectedFaculty.value
  const program = selectedProgram.value
  const year = Number(state.year)
  const passingScore = Number(state.passing_score)
  const averageScore = String(state.average_score).trim() === "" ? null : Number(state.average_score)
  if (!faculty || !program || !/^\d{4}$/.test(String(state.year)) || year < 1900 || year > new Date().getFullYear() || !Number.isInteger(passingScore) || passingScore <= 0 || (averageScore !== null && (!Number.isFinite(averageScore) || averageScore <= 0))) {
    toast.add({ title: "Проверьте направление, год и баллы", color: "error" })
    return
  }

  if (averageScore === null && scores.value.some(score => score.faculty_name === faculty.name && score.program_name === program.name && (score.code ?? null) === (program.code ?? null) && score.year === year && score.form === state.form && score.average_score != null)) {
    toast.add({ title: "Укажите средний балл", description: "Сохранённый средний балл можно заменить, но нельзя удалить.", color: "error" })
    return
  }

  isSaving.value = true
  try {
    const result = await importAdmissionScore({
      faculty_name: faculty.name,
      program_name: program.name,
      code: program.code,
      level: program.level,
      year,
      form: state.form,
      passing_score: passingScore,
      average_score: averageScore,
    })
    if (result.skipped > 0 || result.created + result.updated === 0) {
      toast.add({ title: "Балл не сохранён", description: "Направление не удалось сопоставить со справочником", color: "error" })
      return
    }
    toast.add({ title: result.created ? "Балл добавлен" : "Балл обновлён", color: "success" })
    state.passing_score = ""
    state.average_score = ""
    await refresh()
  } catch {
    toast.add({ title: "Не удалось сохранить балл", color: "error" })
  } finally {
    isSaving.value = false
  }
}
</script>

<template lang="pug">
ui-page(title="Проходные баллы прошлых лет")
  div(class="space-y-4")
    ui-box(title="Добавить или обновить балл")
      p(class="text-sm text-gray-500 mb-4") Выберите направление из справочника. Повторная запись для того же года и формы обновит балл.
      ui-empty-state(v-if="facultiesStatus === 'pending'" kind="loading" title="Загружаем направления…")
      ui-empty-state(v-else-if="facultiesError" kind="error" title="Не удалось загрузить направления.")
      u-form(v-else :state="state" class="space-y-4" @submit="saveScore")
        div(class="grid gap-3 md:grid-cols-2")
          u-form-field(label="Факультет" name="faculty_id" required)
            u-select(v-model="state.faculty_id" :items="facultyOptions" value-key="value" label-key="label" placeholder="Выберите факультет" class="w-full")
          u-form-field(label="Направление" name="program_id" required)
            u-select(v-model="state.program_id" :items="programOptions" value-key="value" label-key="label" placeholder="Выберите направление" :disabled="!state.faculty_id" class="w-full")
        div(class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4")
          u-form-field(label="Год приёма" name="year" required)
            u-input(v-model="state.year" type="number" min="1900" :max="new Date().getFullYear()" class="w-full")
          u-form-field(label="Форма" name="form" required)
            u-select(v-model="state.form" :items="formOptions" value-key="value" label-key="label" class="w-full")
          u-form-field(label="Проходной балл" name="passing_score" required)
            u-input(v-model="state.passing_score" type="number" min="1" step="1" class="w-full")
          u-form-field(label="Средний балл" name="average_score")
            u-input(v-model="state.average_score" type="number" min="0" step="any" class="w-full")
        div(class="flex justify-end")
          u-button(type="submit" color="primary" :loading="isSaving") Сохранить балл

    ui-box(title="Сохранённые баллы")
      ui-empty-state(v-if="scoresStatus === 'pending'" kind="loading" title="Загружаем баллы…")
      ui-empty-state(v-else-if="scoresError" kind="error" title="Не удалось загрузить баллы.")
        u-button(variant="outline" @click="() => refresh()") Повторить
      ui-empty-state(v-else-if="scores.length === 0" title="Баллы пока не добавлены.")
      div(v-else class="max-h-[36rem] overflow-auto")
        table(class="w-full text-sm text-left")
          thead(class="sticky top-0 bg-white dark:bg-gray-900")
            tr(class="border-b border-default")
              th(class="p-2") Год
              th(class="p-2") Факультет и направление
              th(class="p-2") Форма
              th(class="p-2") Проходной
              th(class="p-2") Средний
              th(class="p-2")
          tbody
            tr(v-for="score in scores" :key="`${score.faculty_name}-${score.program_name}-${score.code ?? ''}-${score.year}-${score.form}`" class="border-b border-default")
              td(class="p-2 align-top") {{ score.year }}
              td(class="p-2 align-top")
                div(class="font-medium") {{ score.program_name }}
                div(class="text-xs text-gray-500") {{ score.faculty_name }}
              td(class="p-2 align-top") {{ score.form === "budget" ? "Бюджет" : "Платное" }}
              td(class="p-2 align-top") {{ score.passing_score ?? "—" }}
              td(class="p-2 align-top") {{ score.average_score ?? "—" }}
              td(class="p-2 align-top")
                u-button(size="xs" variant="ghost" @click="editScore(score)") Изменить
</template>
