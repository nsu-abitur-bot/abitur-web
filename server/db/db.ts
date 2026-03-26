import { orchidORM } from "orchid-orm/postgres-js"

import { log, url as databaseURL } from "./config"
import { UserTable } from "./tables/user"

export const db = orchidORM(
  { databaseURL, log },
  {
    user: UserTable,
  },
)
