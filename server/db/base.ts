import { createBaseTable } from "orchid-orm"
import { v7 as uuidv7 } from "uuid"

export const BaseTable = createBaseTable({
  columnTypes: t => ({
    ...t,
    id: () => t.uuid().primaryKey(),
    idv7: () => t.uuid().primaryKey().default(uuidv7),
  }),
  snakeCase: true,
})

export const { sql } = BaseTable
