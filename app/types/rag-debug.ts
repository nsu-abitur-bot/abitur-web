import type { components } from "#openapi"

/** Режимы поиска для выпадающего списка инспектора (бэкенд принимает их как строку). */
export const RAG_DEBUG_MODES = [
  "hybrid",
  "mix",
  "local",
  "global",
  "naive",
] as const

export type RagDebugMode = (typeof RAG_DEBUG_MODES)[number]

export type RagDebugQueryRequest = components["schemas"]["DebugQueryRequest"]
export type RagDebugQueryResponse = components["schemas"]["DebugQueryResponse"]
export type RagDebugSettings = components["schemas"]["DebugQuerySettings"]
export type RagDebugChunk = components["schemas"]["DebugChunk"]
export type RagDebugEntity = components["schemas"]["DebugEntity"]
export type RagDebugRelation = components["schemas"]["DebugRelation"]
export type RagDebugSource = components["schemas"]["DebugSource"]
export type RagDocumentDiagnostics = components["schemas"]["DocumentDiagnosticsResponse"]
