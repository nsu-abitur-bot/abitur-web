import { run } from "#server/db/rake"

/**
 * Run rake via http.
 *
 * Remove after https://github.com/nuxt/cli/issues/62.
 */
export default defineEventHandler(async (event) => {
  assertServiceRequest(event)
  const body = await readRawBody(event)

  const messages: string[] = []
  function log(message: string) {
    messages.push(message)
  }

  await run(body?.split(/\s+/) ?? [], {
    logger: { log, warn: log, error: log },
  })

  return messages.join("\n")
})
