/** Fetch the complete filtered history only when export is explicitly requested. */
export async function collectMessageExport<T>(
  fetchPage: (offset: number, limit: number, snapshotId?: string) => Promise<{ items: T[], total: number, snapshot_id?: string | null }>,
  signal: AbortSignal,
): Promise<T[]> {
  const items: T[] = []
  const limit = 500
  let snapshotId: string | undefined
  let total: number | undefined
  for (let offset = 0; ; offset += limit) {
    signal.throwIfAborted()
    const page = await fetchPage(offset, limit, snapshotId)
    signal.throwIfAborted()
    if (offset === 0) {
      snapshotId = page.snapshot_id ?? undefined
      total = page.total
    }
    if (page.total !== total || (page.total > 0 && (!snapshotId || page.snapshot_id !== snapshotId))) {
      throw new Error("Message export changed during download")
    }
    items.push(...page.items)
    if (items.length >= page.total) {
      return items
    }
    if (page.items.length < limit) {
      throw new Error("Incomplete message export")
    }
  }
}
