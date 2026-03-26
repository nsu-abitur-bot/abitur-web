import { change } from "../rake"

change(async (db) => {
  await db.createTable("user", t => ({
    id: t.uuid().primaryKey(),
    login: t.string().unique(),
    password: t.string(),
    ...t.timestamps(),
  }))
})
