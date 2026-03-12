import { describe, expect, it } from "vitest"

import type { RagUploadResponse } from "~/types/rag-upload"
import {
  RAG_MAX_FILE_SIZE_BYTES,

} from "~/types/rag-upload"
import {
  getUploadStateFromResponse,
  mapRagUploadError,
  validateRagFiles,
} from "~/utils/rag-upload"

describe("validateRagFiles", () => {
  it("accepts supported formats up to 5 MB", () => {
    const files = [
      new File(["hello"], "doc.txt", { type: "text/plain" }),
      new File(["{"], "data.json", { type: "application/json" }),
    ]

    const result = validateRagFiles(files)

    expect(result.validFiles).toHaveLength(2)
    expect(result.rejectedFiles).toHaveLength(0)
  })

  it("rejects unsupported formats and oversized files", () => {
    const unsupported = new File(["binary"], "archive.zip", { type: "application/zip" })
    const oversized = new File(["a".repeat(RAG_MAX_FILE_SIZE_BYTES + 1)], "too-big.txt", {
      type: "text/plain",
    })

    const result = validateRagFiles([unsupported, oversized])

    expect(result.validFiles).toHaveLength(0)
    expect(result.rejectedFiles).toHaveLength(2)
    expect(result.rejectedFiles.at(0)?.reason).toContain("Неподдерживаемый формат")
    expect(result.rejectedFiles.at(1)?.reason).toContain("превышает 5 MB")
  })
})

describe("getUploadStateFromResponse", () => {
  it("returns success when all files are indexed", () => {
    const response: RagUploadResponse = {
      accepted_formats: [".txt"],
      indexed_count: 2,
      skipped_count: 0,
      results: [],
    }

    expect(getUploadStateFromResponse(response)).toBe("success")
  })

  it("returns partial when some files are skipped", () => {
    const response: RagUploadResponse = {
      accepted_formats: [".txt"],
      indexed_count: 1,
      skipped_count: 1,
      results: [],
    }

    expect(getUploadStateFromResponse(response)).toBe("partial")
  })
})

describe("mapRagUploadError", () => {
  it("maps 400 error", () => {
    expect(mapRagUploadError({ status: 400 })).toContain("400")
  })

  it("maps 503 error", () => {
    expect(mapRagUploadError({ response: { status: 503 } })).toContain("503")
  })

  it("maps network error", () => {
    expect(mapRagUploadError(new Error("Network down"))).toContain("сетевой")
  })
})
