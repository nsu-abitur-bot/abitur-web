import { defineEventHandler } from "h3"

import { db } from "#server/db"

export default defineEventHandler(async () => {
  try {
    const lastLeaderboard = await db.leaderboard.select("updatedAt").order({ updatedAt: "DESC" }).takeOptional()

    return {
      lastParsedAt: lastLeaderboard?.updatedAt || null,
    }
  } catch (error) {
    console.error("Error fetching parsing stats:", error)
    return {
      lastParsedAt: null,
      error: "Failed to fetch parsing stats",
    }
  }
})
