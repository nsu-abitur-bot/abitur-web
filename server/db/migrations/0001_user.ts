import { change } from "../rake"

export default change(async (db) => {
  await db.createTable("user", t => ({
    id: t.uuid().primaryKey(),
    ...t.timestamps(),
    login: t.string().unique(),
    password: t.string(),
  }))
})
