import { spawnSync } from "node:child_process"
import process from "node:process"

const current = spawnSync("git", ["config", "--local", "--get", "core.hooksPath"], { encoding: "utf8" })
// Migrate only the path installed by this repository's former hook manager.
// Preserve other custom hook configurations: Lefthook will explain the conflict.
const args = current.stdout.trim() === ".husky/_" ? ["install", "--reset-hooks-path"] : ["install"]
const result = spawnSync("lefthook", args, { stdio: "inherit" })
if (result.error) {
  throw result.error
}
process.exit(result.status ?? 1)
