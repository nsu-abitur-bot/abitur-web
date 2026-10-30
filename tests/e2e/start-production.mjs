import { spawn } from "node:child_process"
import { cp, mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { resolve } from "node:path"
import process from "node:process"

// Run the deployable artifact outside the checkout, with no project node_modules
// available as a fallback for missing Nitro runtime dependencies.
async function main() {
  const directory = await mkdtemp(resolve(tmpdir(), "abitur-production-"))
  try {
    await cp(resolve(".output"), resolve(directory, ".output"), { recursive: true })
    const child = spawn(process.execPath, [resolve(directory, ".output/server/index.mjs")], {
      cwd: directory,
      stdio: "inherit",
      env: process.env,
    })
    for (const signal of ["SIGINT", "SIGTERM"]) {
      process.on(signal, () => child.kill(signal))
    }
    process.exitCode = await new Promise((resolveExit, reject) => {
      child.once("error", reject)
      child.once("exit", code => resolveExit(code ?? 0))
    })
  } finally {
    await rm(directory, { recursive: true })
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
