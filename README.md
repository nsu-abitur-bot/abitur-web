# Nuxt Minimal Starter

Look at the [Nuxt documentation](https://nuxt.com/docs/getting-started/introduction) to learn more.

## Setup

Make sure to install dependencies:

```bash
# npm
npm install

# pnpm
pnpm install

# yarn
yarn install

# bun
bun install
```

## Development Server

Start the development server on `http://localhost:3000`:

```bash
# npm
npm run dev

# pnpm
pnpm dev

# yarn
yarn dev

# bun
bun run dev
```

## Production

Build the application for production:

```bash
# npm
npm run build

# pnpm
pnpm build

# yarn
yarn build

# bun
bun run build
```

Locally preview production build:

```bash
# npm
npm run preview

# pnpm
pnpm preview

# yarn
yarn preview

# bun
bun run preview
```

Check out the [deployment documentation](https://nuxt.com/docs/getting-started/deployment) for more information.

## Docker

Build image:

```bash
docker build -t abitur-web:local .
```

Run container:

```bash
docker run --rm -p 3000:3000 -e NUXT_SESSION_PASSWORD=local-session-password-min-32-chars -e NUXT_DATABASE_URL=postgres://user:pass@host:5432/abitur_web abitur-web:local
```

App will be available at `http://localhost:3000`.

## Docker Compose (app + postgres)

Run everything with one command:

```bash
docker compose up --build
```

What this starts:

- `db` (PostgreSQL 17) with auto-created database `abitur_web`
- `app` (Nuxt server)
- `migrate` one-shot service that runs DB migrations automatically

After start, app is available at `http://localhost:3000`.
