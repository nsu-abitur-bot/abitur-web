import { BaseTable } from "../base"

export class UserTable extends BaseTable {
  override readonly table = "user"

  override columns = this.setColumns(t => ({
    id: t.idv7(),
    login: t.string().unique(),
    password: t.string(),
    ...t.timestamps(),
  }))
}
