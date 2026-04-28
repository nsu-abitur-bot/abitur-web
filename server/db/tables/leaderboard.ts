import { BaseTable } from "../base"

export class LeaderboardTable extends BaseTable {
  readonly table = "leaderboard"

  columns = this.setColumns(t => ({
    id: t.string().primaryKey(),
    url: t.string().unique(),
    direction: t.string().default(""),
    contentHash: t.string().nullable(),
    isActive: t.boolean().default(true),
    updatedAt: t.timestamp(),
  }))
}
