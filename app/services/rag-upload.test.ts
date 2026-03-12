import { describe, expect, it, vi } from "vitest"

import { uploadRagDocuments } from "~/services/rag-upload"
import type { RagUploadResponse } from "~/types/rag-upload"

describe("uploadRagDocuments", () => {
  it("builds multipart request with repeated files field and default graph_id", async () => {
    const response: RagUploadResponse = {
      accepted_formats: [".txt", ".md"],
      indexed_count: 2,
      skipped_count: 0,
      results: [
        { filename: "one.txt", status: "indexed", message: "Indexed", chars: 120 },
        { filename: "two.md", status: "indexed", message: "Indexed", chars: 85 },
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
    expect(result.indexed_count).toBe(2)
  })

  it("supports partial response from backend", async () => {
    const response: RagUploadResponse = {
      accepted_formats: [".txt"],
      indexed_count: 1,
      skipped_count: 1,
      results: [
        { filename: "good.txt", status: "indexed", message: "Indexed", chars: 42 },
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
