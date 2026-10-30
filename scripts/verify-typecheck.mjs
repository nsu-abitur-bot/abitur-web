import assert from "node:assert/strict"
import { spawnSync } from "node:child_process"
import { mkdtemp, rm, writeFile } from "node:fs/promises"
import { resolve } from "node:path"
import process from "node:process"

// Check the actual production includes, not a separate fixture tsconfig.
const root = process.cwd()
for (const [name, parent, source, config, command] of [
  ["pug", "app/components", "<script setup lang=\"ts\">\nconst count = 1\n</script>\n<template lang=\"pug\">\np {{ count.nonexistentProperty }}\n</template>\n", "tsconfig.client.json", ["bunx", "--no-install", "golar", "tsc", "--noEmit"]],
  ["server", "server", "const count: number = \"invalid-server-assignment\"\nexport { count }\n", ".nuxt/tsconfig.server.json", ["bun", "check", "--no-script"]],
]) {
  const directory = await mkdtemp(resolve(root, parent, "typecheck-"))
  try {
    const fixture = resolve(directory, name === "pug" ? "fixture.vue" : "fixture.ts")
    await writeFile(fixture, source)
    const result = spawnSync(command[0], [...command.slice(1), "-p", config], { cwd: root, encoding: "utf8" })
    const output = result.stdout + result.stderr
    assert.equal(result.status, 1, `${name} checker must reject the invalid fixture:\n${output}`)
    assert.match(output, name === "pug" ? /nonexistentProperty/ : /not assignable/, output)
    console.log(`${name}: invalid fixture correctly rejected by ${command.join(" ")} -p ${config}`)
  } finally {
    await rm(directory, { recursive: true })
  }
}
