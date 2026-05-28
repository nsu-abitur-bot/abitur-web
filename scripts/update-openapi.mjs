#!/usr/bin/env node

import { spawnSync } from "node:child_process"
import { writeFileSync } from "node:fs"
import process from "node:process"

const url = process.argv[2] ?? "http://localhost:8000/openapi.json"

const response = await fetch(url, {
  headers: {
    accept: "application/json",
  },
})

if (!response.ok) {
  throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`)
}

const schema = await response.json()
writeFileSync("openapi.json", `${JSON.stringify(schema, null, 2)}\n`)

const result = spawnSync(
  "pnpm",
  ["exec", "openapi-typescript", "openapi.json", "-o", "types/openapi.d.ts"],
  {
    stdio: "inherit",
  },
)

if (result.error) {
  throw result.error
}

if (result.status !== 0) {
  process.exit(result.status ?? 1)
}

console.warn(`Updated openapi.json from ${url}`)
