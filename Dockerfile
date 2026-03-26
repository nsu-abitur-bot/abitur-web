# syntax=docker/dockerfile:1
# check=skip=SecretsUsedInArgOrEnv

FROM node:24.10-alpine3.22 AS base

RUN corepack enable

ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH

WORKDIR /app

#
# deps (cache pnpm store by lockfile)
#

FROM base AS deps

COPY package.json pnpm-lock.yaml ./
RUN pnpm fetch --frozen-lockfile

#
# builder
#

FROM base AS builder

# Disable husky in CI/container builds.
ENV HUSKY=0
ENV NODE_ENV=production

COPY --from=deps /pnpm/store /pnpm/store
COPY . .

RUN pnpm install --frozen-lockfile --offline

RUN pnpm exec nuxt build

#
# runner
#

FROM node:24.10-alpine3.22 AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NITRO_HOST=0.0.0.0
ENV NITRO_PORT=3000
ENV NUXT_SESSION_PASSWORD=
ENV NUXT_DATABASE_URL=

# Reduce sharp/font warnings in some setups and provide curl for health checks.
RUN apk add --no-cache curl fontconfig ttf-dejavu

COPY --from=builder /app/.output ./.output
COPY --from=builder /app/node_modules ./node_modules

EXPOSE 3000

CMD ["sh", "-eu", "-c", "test -n \"$NUXT_SESSION_PASSWORD\" || { echo 'NUXT_SESSION_PASSWORD is required'; exit 1; }; [ ${#NUXT_SESSION_PASSWORD} -ge 32 ] || { echo 'NUXT_SESSION_PASSWORD must be at least 32 characters'; exit 1; }; test -n \"$NUXT_DATABASE_URL\" || { echo 'NUXT_DATABASE_URL is required'; exit 1; }; exec node .output/server/index.mjs"]
