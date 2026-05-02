export const useApiBaseUrl = () => useRuntimeConfig().public.apiBaseUrl
export const useAuthToken = () => useCookie("abitur-token")

export const useApi: typeof useMyApi = ((path, options) => {
  const token = useAuthToken()
  const mergedOptions = {
    ...options,
    baseURL: useApiBaseUrl(),
    headers: {
      ...(options as { headers?: Record<string, string> })?.headers,
      ...(token.value ? { Authorization: `Bearer ${token.value}` } : {}),
    },
  }

  return useMyApi(path as never, mergedOptions as never)
}) as typeof useMyApi

export const apiFetch = async <T>(
  path: string,
  options?: Parameters<typeof $fetch<T>>[1],
) => {
  const token = useAuthToken()
  return await $fetch<T>(path, {
    ...options,
    baseURL: useApiBaseUrl(),
    headers: {
      ...(options as { headers?: Record<string, string> })?.headers,
      ...(token.value ? { Authorization: `Bearer ${token.value}` } : {}),
    },
  })
}
