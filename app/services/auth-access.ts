import type { components } from "#openapi"

type Role = components["schemas"]["AdminRole"]

export const publicPaths = new Set(["/login", "/register", "/rating"])

/** Route restrictions supplement the backend's authoritative permission checks. */
export function canAccessRoute(role: Role, path: string, section?: unknown): boolean {
  if (publicPaths.has(path)) {
    return true
  }
  if (path === "/settings" && (section === "team" || section === "connections")) {
    return role === "superadmin"
  }
  if (role !== "viewer") {
    return true
  }
  return ["/messages", "/feedback", "/stats"].some(route => path === route || path.startsWith(`${route}/`))
}
