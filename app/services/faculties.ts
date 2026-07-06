import type { components } from "#openapi"

export type FacultyItem = components["schemas"]["FacultyItem"]
export type FacultyCreate = components["schemas"]["FacultyCreate"]
export type FacultyUpdate = components["schemas"]["FacultyUpdate"]
export type ProgramItem = components["schemas"]["ProgramItem"]
export type ProgramCreate = components["schemas"]["ProgramCreate"]
export type ProgramUpdate = components["schemas"]["ProgramUpdate"]

export async function getFaculties(): Promise<FacultyItem[]> {
  return await apiFetch<FacultyItem[]>("/api/v1/faculties")
}

export async function createFaculty(payload: FacultyCreate): Promise<FacultyItem> {
  return await apiFetch<FacultyItem>("/api/v1/faculties", {
    method: "POST",
    body: payload,
  })
}

export async function updateFaculty(
  facultyId: string,
  payload: FacultyUpdate,
): Promise<FacultyItem> {
  return await apiFetch<FacultyItem>(`/api/v1/faculties/${facultyId}`, {
    method: "PUT",
    body: payload,
  })
}

export async function deleteFaculty(facultyId: string): Promise<void> {
  await apiFetch<void>(`/api/v1/faculties/${facultyId}`, {
    method: "DELETE",
  })
}

export async function createProgram(
  facultyId: string,
  payload: ProgramCreate,
): Promise<ProgramItem> {
  return await apiFetch<ProgramItem>(`/api/v1/faculties/${facultyId}/programs`, {
    method: "POST",
    body: payload,
  })
}

export async function updateProgram(
  programId: string,
  payload: ProgramUpdate,
): Promise<ProgramItem> {
  return await apiFetch<ProgramItem>(`/api/v1/faculties/programs/${programId}`, {
    method: "PUT",
    body: payload,
  })
}

export async function deleteProgram(programId: string): Promise<void> {
  await apiFetch<void>(`/api/v1/faculties/programs/${programId}`, {
    method: "DELETE",
  })
}

export const EDUCATION_LEVELS: { label: string, value: string }[] = [
  { label: "Бакалавриат", value: "bachelor" },
  { label: "Специалитет", value: "specialist" },
  { label: "Магистратура", value: "master" },
]

export function educationLevelLabel(level: string): string {
  return EDUCATION_LEVELS.find(l => l.value === level)?.label ?? level
}
