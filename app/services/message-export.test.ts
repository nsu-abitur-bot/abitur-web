import { describe, expect, it } from "vitest"

import { collectMessageExport } from "./message-export"

describe("explicit message export", () => {
  it("exports filtered records across the 500-record boundary", async () => {
    const records = Array.from({ length: 525 }, (_, id) => id)
    const offsets: number[] = []
    expect(await collectMessageExport(async (offset, limit) => {
      offsets.push(offset)
      return { items: records.slice(offset, offset + limit), total: records.length, snapshot_id: "snapshot" }
    }, new AbortController().signal)).toEqual(records)
    expect(offsets).toEqual([0, 500])
  })
  it("pins later pages to the first snapshot when a new message arrives", async () => {
    const records = Array.from({ length: 525 }, (_, id) => id)
    const result = await collectMessageExport(async (offset, limit, snapshotId) => {
      if (offset) {
        expect(snapshotId).toBe("snapshot")
      }
      return { items: records.slice(offset, offset + limit), total: records.length, snapshot_id: "snapshot" }
    }, new AbortController().signal)
    expect(result).toEqual(records)
  })
  it("rejects an export whose snapshot count changes between pages", async () => {
    await expect(collectMessageExport(async offset => ({
      items: Array.from({ length: offset ? 24 : 500 }, (_, id) => id),
      total: offset ? 524 : 525,
      snapshot_id: "snapshot",
    }), new AbortController().signal)).rejects.toThrow("Message export changed")
  })
  it("never downloads partial results on a failed batch", async () => {
    await expect(collectMessageExport(async (offset) => {
      if (offset) {
        throw new Error("Unavailable")
      }
      return { items: Array.from({ length: 500 }, (_, id) => id), total: 501, snapshot_id: "snapshot" }
    }, new AbortController().signal)).rejects.toThrow("Unavailable")
  })
  it("stops before requesting the next batch after cancellation", async () => {
    const controller = new AbortController()
    let calls = 0
    await expect(collectMessageExport(async () => {
      calls++
      controller.abort()
      return { items: Array.from({ length: 500 }, (_, id) => id), total: 501, snapshot_id: "snapshot" }
    }, controller.signal)).rejects.toThrow()
    expect(calls).toBe(1)
  })
})
