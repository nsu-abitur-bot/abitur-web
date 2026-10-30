# syntax=docker/dockerfile:1
# check=skip=SecretsUsedInArgOrEnv

FROM oven/bun:1.4.4 AS bun
FROM node:24.18.1-bookworm-slim AS base
COPY --from=bun /usr/local/bin/bun /usr/local/bin/bun
WORKDIR /app

FROM base AS deps
COPY package.json bun.lock ./
# Nuxt prepare needs source/config, so run it in the builder instead.
RUN --mount=type=cache,target=/root/.bun/install/cache bun install --frozen-lockfile --ignore-scripts

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN bun run prepare && bun run build

FROM node:24.18.1-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NITRO_HOST=0.0.0.0
ENV NITRO_PORT=3000
RUN apt-get update && apt-get install -y --no-install-recommends curl fontconfig fonts-dejavu-core && rm -r /var/lib/apt/lists/*
COPY --from=builder /app/.output ./.output
EXPOSE 3000
CMD ["sh", "-eu", "-c", "test -n \"$NUXT_SESSION_PASSWORD\" || { echo 'NUXT_SESSION_PASSWORD is required'; exit 1; }; [ ${#NUXT_SESSION_PASSWORD} -ge 32 ] || { echo 'NUXT_SESSION_PASSWORD must be at least 32 characters'; exit 1; }; test -n \"$NUXT_DATABASE_URL\" || { echo 'NUXT_DATABASE_URL is required'; exit 1; }; exec node .output/server/index.mjs"]
