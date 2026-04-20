export const useApiBaseUrl = () => useRuntimeConfig().public.apiBaseUrl

// Временный костыль пока мы не сделали авторизацию на питон бекенде.
export const useApi: typeof useMyApi = ((path, options) => {
  const mergedOptions = {
    ...options,
    baseURL: useApiBaseUrl(),
  }

  return useMyApi(path as never, mergedOptions as never)
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
