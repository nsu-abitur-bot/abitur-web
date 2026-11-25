<script setup lang="ts">
import type { PreviewResponse, ScoreItem } from "~/services/admission-scores"
import { educationLevelLabel } from "~/services/faculties"
import { admissionBasisLabel, httpUrl, studyFormLabel } from "~/utils/admission-scores"

defineProps<{
  rows: ScoreItem[] | NonNullable<PreviewResponse["rows"]>
}>()
</script>

<template lang="pug">
div(class="max-h-[36rem] overflow-auto")
  table(class="w-full min-w-[42rem] text-sm text-left [overflow-wrap:normal]")
    thead(class="sticky top-0 bg-default")
      tr(class="border-b border-default")
        th(scope="col" class="px-1.5 py-2") Год
        th(scope="col" class="px-1.5 py-2") Факультет и направление
        th(scope="col" class="px-1.5 py-2") Форма обучения
        th(scope="col" class="px-1.5 py-2") Основание приёма
        th(scope="col" class="px-1.5 py-2") Проходной
        th(scope="col" class="px-1.5 py-2") Средний
        th(scope="col" class="px-1.5 py-2") Объявленные места
        th(scope="col" class="px-1.5 py-2") Источник
        th(v-if="$slots.actions" scope="col" class="px-1.5 py-2")
          span(class="sr-only") Действия
    tbody
      tr(v-for="(score, index) in rows" :key="'id' in score ? score.id : index" class="border-b border-default")
        td(class="px-1.5 py-2 align-top whitespace-nowrap") {{ score.year }}
        td(class="px-1.5 py-2 align-top min-w-36")
          div(class="font-medium") {{ score.program_name }}
          div(class="text-xs text-muted") {{ score.faculty_name }}
          div(v-if="score.level" class="text-xs text-muted") {{ educationLevelLabel(score.level) }}
        td(class="px-1.5 py-2 align-top") {{ studyFormLabel(score.study_form) }}
        td(class="px-1.5 py-2 align-top") {{ admissionBasisLabel(score.admission_basis ?? score.form) }}
        td(class="px-1.5 py-2 align-top") {{ score.passing_score ?? "—" }}
        td(class="px-1.5 py-2 align-top") {{ score.average_score ?? "—" }}
        td(class="px-1.5 py-2 align-top") {{ score.seat_count ?? "—" }}
        td(class="px-1.5 py-2 align-top")
          a(v-if="httpUrl(score.source_url)" :href="httpUrl(score.source_url)" :title="score.source_url ?? undefined" target="_blank" rel="noopener noreferrer" class="text-primary underline underline-offset-2") Открыть источник
          span(v-else) —
        td(v-if="'id' in score && $slots.actions" class="px-1.5 py-2 align-top")
          slot(name="actions" :score="score")
</template>
