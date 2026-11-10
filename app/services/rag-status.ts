import type { RagDocumentDiagnostics } from "~/types/rag-debug"
import type { RagDocument } from "~/types/rag-upload"

export function materialState(doc: Pick<RagDocument, "status" | "import_state">, diagnostics?: RagDocumentDiagnostics | null) {
  switch (doc.import_state) {
    case "review": return { key: "attention", label: "Ожидает проверки" }
    case "queued": return { key: "attention", label: "В очереди" }
    case "processing": return { key: "attention", label: "Обрабатывается" }
    case "index_failed": return { key: "attention", label: "Ошибка индексации" }
  }
  const freshness = doc.status?.toLowerCase().replaceAll(" ", "_")
  if (["changed", "изменён", "изменен"].includes(freshness ?? "")) {
    return { key: "attention", label: "Источник изменился" }
  }
  if (["source_unavailable", "источник_недоступен"].includes(freshness ?? "")) {
    return { key: "attention", label: "Источник недоступен" }
  }
  if (["indexing_failed", "ошибка_индексации"].includes(freshness ?? "")) {
    return { key: "attention", label: "Ошибка индексации" }
  }
  switch (diagnostics?.lightrag_status) {
    case "processed": return { key: "ready", label: "Обработан" }
    case "processing": return { key: "attention", label: "Обрабатывается" }
    case "pending": return { key: "attention", label: "Ожидает обработки" }
    case "failed": return { key: "attention", label: "Ошибка обработки" }
    default: return { key: "unknown", label: "Обработка не подтверждена" }
  }
}

export function materialType(url?: string | null) {
  try {
    return new URL(url ?? "").pathname.toLowerCase().endsWith(".pdf") ? "PDF (по ссылке)" : "Неизвестен"
  } catch {
    return "Неизвестен"
  }
}
