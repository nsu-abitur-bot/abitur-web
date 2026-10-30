import { describe, expect, it } from "vitest"

import { materialState, materialType } from "~/services/rag-status"
import type { RagDocumentDiagnostics } from "~/types/rag-debug"

const processed: RagDocumentDiagnostics = { id: "a", postgres_status: "indexed", lightrag_status: "processed", chunks_count: 1, entities_count: 0, relations_count: 0 }

describe("materialState", () => {
  it("requires LightRAG confirmation, including after freshness checks", () => {
    expect(materialState({ status: "indexed" }).key).toBe("unknown")
    expect(materialState({ status: "unchanged" }, { ...processed, lightrag_status: "failed" }).key).toBe("attention")
    expect(materialState({ status: "indexed" }, processed).key).toBe("ready")
  })
  it("keeps changed sources in attention and permits processed local files", () => {
    expect(materialState({ status: "changed" }, processed).key).toBe("attention")
    expect(materialState({ status: "no_source" }, processed).key).toBe("ready")
    expect(materialState({ status: "indexed" }, { ...processed, lightrag_status: "not_found" }).key).toBe("unknown")
  })
  it("labels inferred URL types without inventing MIME", () => {
    expect(materialType("https://example.org/rules.PDF?q=1")).toBe("PDF (по ссылке)")
    expect(materialType("https://example.org/rules")).toBe("Неизвестен")
    expect(materialType(null)).toBe("Неизвестен")
  })
})
