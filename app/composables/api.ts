export const useApiBaseUrl = () => useRuntimeConfig().public.apiBaseUrl

// Временный костыль пока мы не сделали авторизацию на питон бекенде.
export const useApi: typeof useMyApi = ((path, options) => {
  return useMyApi(path, {
    ...options,
    baseURL: useApiBaseUrl(),
  })
}) as typeof useMyApi

export const apiFetch = async <T>(
  path: string,
  options?: Parameters<typeof $fetch<T>>[1],
) => {
  return await $fetch<T>(path, {
    ...options,
    baseURL: useApiBaseUrl(),
  })
}
