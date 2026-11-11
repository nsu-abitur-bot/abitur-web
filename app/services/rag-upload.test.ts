import { describe, expect, it, vi } from "vitest"

import { uploadRagDocuments } from "~/services/rag-upload"
import type { RagUploadResponse } from "~/types/rag-upload"

describe("uploadRagDocuments", () => {
  it("builds multipart request with repeated files field and default graph_id", async () => {
    const response: RagUploadResponse = {
      accepted_formats: [".txt", ".md"],
      queued_count: 2,
      skipped_count: 0,
      results: [
        { filename: "one.txt", status: "queued", message: "Indexed", chars: 120 },
        { filename: "two.md", status: "queued", message: "Indexed", chars: 85 },
      ],
    }

    const request = vi.fn(async (formData: FormData) => {
      const files = formData.getAll("files")
      expect(files).toHaveLength(2)
      expect((files[0] as File).name).toBe("one.txt")
      expect((files[1] as File).name).toBe("two.md")
      return response
    })

    const files = [
      new File(["one"], "one.txt", { type: "text/plain" }),
      new File(["two"], "two.md", { type: "text/markdown" }),
    ]

    const result = await uploadRagDocuments({
      files,
      request,
    })

    expect(request).toHaveBeenCalledOnce()
    expect(result.queued_count).toBe(2)
  })

  it("supports partial response from backend", async () => {
    const response: RagUploadResponse = {
      accepted_formats: [".txt"],
      queued_count: 1,
      skipped_count: 1,
      results: [
        { filename: "good.txt", status: "queued", message: "Indexed", chars: 42 },
        { filename: "bad.txt", status: "skipped", message: "Empty file", chars: 0 },
      ],
    }

    const request = vi.fn(async () => response)

    const result = await uploadRagDocuments({
      files: [new File(["ok"], "good.txt", { type: "text/plain" })],
      request,
    })

    expect(result.skipped_count).toBe(1)
    expect(result.results.at(1)?.status).toBe("skipped")
  })
})

describe("document batch operations", () => {
  it("loads a page and its row statuses with one cancellable request", async () => {
    const response = { documents: [{ id: "doc", status: "indexed", lightrag_status: "processed" }], total: 41, total_all: 80, has_pending: true }
    const request = vi.fn(async () => response)
    vi.stubGlobal("apiFetch", request)
    const { listRagDocuments } = await import("~/services/rag-upload")
    const params = { limit: 20, offset: 20, q: "приём", state: "ready" }
    const controller = new AbortController()
    expect(await listRagDocuments(params, controller.signal)).toEqual(response)
    expect(request).toHaveBeenCalledExactlyOnceWith("/api/v1/rag/docs", { query: params, signal: controller.signal })
    vi.unstubAllGlobals()
  })
  it("never interprets an empty selection as all documents", async () => {
    const request = vi.fn()
    vi.stubGlobal("apiFetch", request)
    const { checkRagDocuments, updateChangedRagDocuments } = await import("~/services/rag-upload")
    await expect(checkRagDocuments([])).rejects.toThrow("Не выбраны")
    await expect(updateChangedRagDocuments([])).rejects.toThrow("Не выбраны")
    expect(request).not.toHaveBeenCalled()
    vi.unstubAllGlobals()
  })
  it("preserves explicit empty metadata strings for clearing fields", async () => {
    const request = vi.fn(async () => ({ id: "doc" }))
    vi.stubGlobal("apiFetch", request)
    const { updateRagDocument } = await import("~/services/rag-upload")
    await updateRagDocument("doc", { title: "", source_url: "" })
    expect(request).toHaveBeenCalledWith("/api/v1/rag/docs/doc", { method: "PATCH", body: { title: "", source_url: "" } })
    vi.unstubAllGlobals()
  })
  it("settles every deletion and preserves the failed id", async () => {
    const request = vi.fn((path: string) => path.endsWith("bad") ? Promise.reject(new Error("Failed")) : Promise.resolve())
    vi.stubGlobal("apiFetch", request)
    const { deleteRagDocuments } = await import("~/services/rag-upload")
    const results = await deleteRagDocuments(["ok", "bad", "last"])
    expect(results.map(result => [result.id, result.status])).toEqual([["ok", "fulfilled"], ["bad", "rejected"], ["last", "fulfilled"]])
    expect(request).toHaveBeenCalledTimes(3)
    vi.unstubAllGlobals()
  })
})
