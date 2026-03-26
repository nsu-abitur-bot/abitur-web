import type { H3Event } from "h3"
import { assertHttp401Unauthorized } from "h3-errors"

const config = useRuntimeConfig()

/**
 * Validate admin access (require either dev version, or HTTP header service-token: XXXXX).
 */
export function assertServiceRequest(event: H3Event) {
  assertHttp401Unauthorized(import.meta.dev || isServiceRequest(event), "Unauthorized service request.")
}

/**
 * Does the request come with proper server-token http header?
 */
export function isServiceRequest(event: H3Event) {
  const { serviceToken } = config
  if (!serviceToken) {
    return false
  }
  const token = getRequestHeader(event, "service-token")
  return token === serviceToken
}
