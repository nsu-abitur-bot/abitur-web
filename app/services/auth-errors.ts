const messages: Record<string, string> = {
  "Incorrect username or password": "Неверный логин или пароль",
  "Invite code required": "Введите код приглашения",
  "Invalid or already used invite code": "Код приглашения неверен или уже использован",
  "Invite code has expired": "Срок действия приглашения истёк",
  "Username already taken": "Этот логин уже занят",
  "Cannot deactivate yourself": "Нельзя деактивировать свой аккаунт",
  "Cannot change your own role": "Нельзя изменить свою роль",
}

export function authErrorMessage(error: unknown, fallback: string): string {
  const detail = (error as { data?: { detail?: unknown } })?.data?.detail
  return typeof detail === "string" ? messages[detail] ?? fallback : fallback
}
