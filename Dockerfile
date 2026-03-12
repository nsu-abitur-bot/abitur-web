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

RUN pnpm run build

#
# runner
#

FROM node:24.10-alpine3.22 AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NITRO_HOST=0.0.0.0
ENV NITRO_PORT=3000

# Reduce sharp/font warnings in some setups.
RUN apk add --no-cache fontconfig ttf-dejavu

COPY --from=builder /app/.output ./.output
COPY --from=builder /app/node_modules ./node_modules

EXPOSE 3000

CMD ["node", ".output/server/index.mjs"]
