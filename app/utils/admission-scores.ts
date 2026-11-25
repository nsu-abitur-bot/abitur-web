import type { AdmissionBasis, ScoreItem, StudyForm } from "~/services/admission-scores"

const basisLabels: Record<AdmissionBasis, string> = { budget: "Бюджет", paid: "Платное" }
const studyFormLabels: Record<StudyForm, string> = { full_time: "Очная", correspondence: "Заочная" }

export const admissionBasisOptions = Object.entries(basisLabels).map(([value, label]) => ({ value: value as AdmissionBasis, label }))
export const studyFormOptions = [
  { value: "unknown" as const, label: "Неизвестна" },
  ...Object.entries(studyFormLabels).map(([value, label]) => ({ value: value as StudyForm, label })),
]
export type StudyFormValue = typeof studyFormOptions[number]["value"]

export function admissionBasisLabel(value: string): string {
  return admissionBasisOptions.find(option => option.value === value)?.label ?? value
}

export function studyFormLabel(value: StudyForm | null | undefined): string {
  return value == null ? studyFormOptions[0]!.label : studyFormLabels[value] ?? value
}

export function optionalNumber(input: string | number | undefined): number | null {
  const text = String(input ?? "").trim()
  return text === "" ? null : Number(text)
}

export const MAX_SEAT_COUNT = 2_147_483_647
export const MAX_SOURCE_LENGTH = 500

export function validSeatCount(value: number | null): boolean {
  return value === null || (Number.isInteger(value) && value >= 0 && value <= MAX_SEAT_COUNT)
}

export function httpUrl(value: string | null | undefined): string | undefined {
  const url = value?.trim()
  return url && /^https?:\/\//i.test(url) && URL.canParse(url) ? url : undefined
}

export function scoreProgramKey(score: Pick<ScoreItem, "faculty_name" | "program_name" | "code" | "level">): string {
  return JSON.stringify([score.faculty_name, score.program_name, score.code ?? null, score.level])
}
