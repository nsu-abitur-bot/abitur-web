import { assertHttp400BadRequest, assertHttp401Unauthorized } from "h3-errors"

import { db } from "#server/db"

export default defineEventHandler(async (event) => {
  const body = await readBody<{ login?: string, password?: string }>(event)

  assertHttp400BadRequest(body?.login && body?.password, "Логин и пароль обязательны.")

  const { login, password } = body

  // Проверяем — есть ли уже пользователь в системе
  const existingUser = await db.user.select("login", "password", "id").takeOptional()

  if (!existingUser) {
    // Первый вход — создаём суперюзера
    const hashedPassword = hashPassword(password)
    const user = await db.user.create({
      login,
      password: hashedPassword,
    })

    await setUserSession(event, { user: { id: user.id, login: user.login } })
    return { ok: true }
  }

  // Последующие входы — проверяем логин и пароль
  assertHttp401Unauthorized(existingUser.login === login, "Неправильный логин или пароль.")
  assertHttp401Unauthorized(validatePassword(password, existingUser.password), "Неправильный логин или пароль.")

  await setUserSession(event, { user: { id: existingUser.id, login: existingUser.login } })
  return { ok: true }
})
