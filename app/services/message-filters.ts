/** Nuxt UI numeric inputs can emit a number even when the initial model is a string. */
export function parseUserId(value: string | number): number | undefined {
  const text = String(value).trim()
  if (!text) {
    return undefined
  }
  const id = Number(text)
  if (!Number.isSafeInteger(id) || id < 0) {
    throw new Error("Введите целый идентификатор пользователя.")
  }
  return id
}
