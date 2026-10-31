// Staff-only university profile; shared by the sidebar, header and settings editor.
export interface UniversityIdentity {
  profile: string
  short_name: string
  full_name: string
  assistant_name: string
  website: string
  email: string
  phone: string
  address: string
  logo_url: string | null
}

export function useUniversityIdentity() {
  return useAsyncData("university-identity", () => apiFetch<UniversityIdentity>("/api/v1/university"))
}
