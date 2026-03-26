import { rakeDb } from "orchid-orm/migrations/postgres-js"

import { BaseTable } from "./base"
import { url as databaseURL } from "./config"
import { migrations } from "./migrations"

const { change, run } = rakeDb.lazy(
  { databaseURL },
  {
    baseTable: BaseTable,
    basePath: import.meta.url,
    migrations,
    migrationsTable: "rake_migration",
  },
)

// Для задания миграций
export { change, run }
