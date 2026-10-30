export const useApiBaseUrl = () => useRuntimeConfig().public.apiBaseUrl
export const useAuthToken = () => useCookie("abitur-token")

export const useApi: typeof useMyApi = ((path, options) => {
  const token = useAuthToken()
  const requestToken = token.value
  const nuxtApp = useNuxtApp()
  const mergedOptions = {
    ...options,
    baseURL: useApiBaseUrl(),
    headers: {
      ...(options as { headers?: Record<string, string> })?.headers,
      ...(token.value ? { Authorization: `Bearer ${token.value}` } : {}),
    },
  }

  const result = useMyApi(path as never, mergedOptions as never)
  watch(result.error, (error) => {
    if (error?.statusCode === 401 && requestToken && token.value === requestToken) {
      token.value = null
      void nuxtApp.runWithContext(() => navigateTo("/login"))
    }
  }, { immediate: true })
  return result
}) as typeof useMyApi

export const apiFetch = async <T>(
  path: string,
  options?: Parameters<typeof $fetch<T>>[1],
) => {
  const token = useAuthToken()
  const requestToken = token.value
  const nuxtApp = useNuxtApp()
  try {
    return await $fetch<T>(path, {
      ...options,
      baseURL: useApiBaseUrl(),
      headers: {
        ...(options as { headers?: Record<string, string> })?.headers,
        ...(token.value ? { Authorization: `Bearer ${token.value}` } : {}),
      },
    })
  } catch (error) {
    if ((error as { statusCode?: number }).statusCode === 401 && requestToken && token.value === requestToken) {
      token.value = null
      await nuxtApp.runWithContext(() => navigateTo("/login"))
    }
    throw error
  }
}
