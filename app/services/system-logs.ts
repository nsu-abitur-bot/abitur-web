export async function listLogFiles(): Promise<string[]> {
  return await apiFetch<string[]>("/api/v1/system-logs/files")
}

export async function getSystemLogs(filename?: string, lines = 100): Promise<string[]> {
  return await apiFetch<string[]>("/api/v1/system-logs/", {
    query: {
      ...(filename ? { filename } : {}),
      lines,
    },
  })
}

export async function downloadSystemLogs(filename?: string): Promise<void> {
  const token = useAuthToken()
  const baseURL = useApiBaseUrl()
  const params = new URLSearchParams()
  if (filename) {
    params.set("filename", filename)
  }
  const queryString = params.toString()
  const url = `${baseURL}/api/v1/system-logs/download${queryString ? `?${queryString}` : ""}`

  const response = await fetch(url, {
    headers: token.value ? { Authorization: `Bearer ${token.value}` } : undefined,
  })

  if (!response.ok) {
    throw new Error(`Не удалось скачать файл логов: ${response.status}`)
  }

  const blob = await response.blob()
  const objectUrl = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = objectUrl
  link.download = filename || "system.log"
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  setTimeout(() => {
    URL.revokeObjectURL(objectUrl)
  }, 1000)
}
