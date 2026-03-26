import { Buffer } from "node:buffer"
import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto"

import { assert } from "ts-essentials"

/**
 * Хешировать пароль со случайной солью.
 */
export function hashPassword(password: string): string {
  assert(password, "Password can not be empty.")
  const salt = randomBytes(16).toString("base64url")
  const passwordBuf = scryptSync(password, salt, 64)
  return `${passwordBuf.toString("base64url")}.${salt}`
}

/**
 * Сравнить пароль с сохраненным хешем.
 */
export function validatePassword(password: string, hash: string): boolean {
  const [hashedPassword, salt] = hash.split(".")
  assert(hashedPassword && salt, "Invalid password hash.")
  const passwordBuf = scryptSync(password, salt, 64)
  const hashedPasswordBuf = Buffer.from(hashedPassword, "base64url")
  return timingSafeEqual(new Uint8Array(hashedPasswordBuf), new Uint8Array(passwordBuf))
}
