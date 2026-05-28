---
name: update-openapi
description: Update this repository's OpenAPI contract and generated TypeScript types. Use when refreshing openapi.json from the backend, regenerating types/openapi.d.ts, or adapting frontend code after backend API changes.
---

# Update OpenAPI

## Workflow

1. Confirm the backend is running. The default schema URL is `http://localhost:8000/openapi.json`.
2. Run the shared project command from the repository root:

   ```bash
   pnpm run openapi:update
   ```

   To use another backend URL:

   ```bash
   pnpm run openapi:update -- http://localhost:8000/openapi.json
   ```

3. Inspect the diff for `openapi.json` and `types/openapi.d.ts`.
4. Search for frontend breakages caused by schema changes, especially in `app/composables/api.ts`, `app/services`, `app/pages`, and `app/components`.
5. Update affected frontend code using the generated types as the source of truth.
6. Validate with:

   ```bash
   pnpm test
   pnpm run check
   ```

## Script Behavior

The command runs `scripts/update-openapi.mjs`. It fetches the schema, writes deterministic pretty-printed JSON to `openapi.json`, and regenerates `types/openapi.d.ts` with:

```bash
pnpm exec openapi-typescript openapi.json -o types/openapi.d.ts
```

Prefer the `pnpm run openapi:update` wrapper so humans, Codex, and Claude use the same entrypoint.

## Frontend Update Notes

- Do not hand-edit `types/openapi.d.ts`; regenerate it from `openapi.json`.
- Treat `openapi.json` as backend-owned data. Avoid unrelated formatting or manual schema changes.
- If endpoint paths, request bodies, or response shapes changed, update typed API calls first, then Vue usage sites.
- If generated types look wrong, refetch the backend schema before changing frontend code.
