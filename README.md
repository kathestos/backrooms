# Backrooms VHS Simulator

Infinite first-person backrooms web game built with Next.js, React, TypeScript, Three.js, and worker-based procedural chunk streaming.

## Stack

- Next.js App Router + React + TypeScript
- `three` + `@react-three/fiber` + `@react-three/drei`
- `@react-three/postprocessing` + custom VHS shader effect
- Zustand state stores
- Web Worker chunk generation
- Optional telemetry API with tRPC + Prisma
- Unit tests with Vitest, e2e with Playwright
- Sentry wiring for error capture

## Features Implemented

- `/play` route with first-person controls (`W`, `A`, `S`, `D` + mouse look)
- Infinite procedural chunk generation (`24x24` cells per chunk, deterministic seed)
- Seam-safe wall generation across chunk borders
- Worker-based generation + active/cache chunk streaming
- Instanced world meshes for floor/walls/ceiling
- Collision against generated wall colliders
- Dynamic fluorescent lights with flicker
- VHS postprocessing (grain, scanlines, chromatic shift, wobble)
- Settings route with graphics presets and control sliders
- Session seed resets and runtime HUD
- Optional telemetry endpoints:
  - `run.start`
  - `run.ping`
  - `run.finish`

## Quick Start

1. Install dependencies:

```bash
pnpm install
```

2. Copy environment variables:

```bash
cp .env.example .env.local
```

3. Generate Prisma client:

```bash
pnpm prisma:generate
```

4. Run dev server:

```bash
pnpm dev
```

Open `http://localhost:3000`.

## Telemetry Setup (Optional)

Set in `.env.local`:

```bash
ENABLE_TELEMETRY="true"
NEXT_PUBLIC_ENABLE_TELEMETRY="true"
DATABASE_URL="postgresql://..."
```

Then run migration:

```bash
pnpm prisma:migrate
```

Gameplay works when telemetry is disabled or DB is unavailable.

## Scripts

- `pnpm dev` - Start local dev server
- `pnpm build` - Production build
- `pnpm start` - Run built app
- `pnpm lint` - ESLint
- `pnpm typecheck` - TypeScript check
- `pnpm test:unit` - Vitest unit tests
- `pnpm test:e2e` - Playwright e2e tests
- `pnpm prisma:generate` - Prisma client generation
- `pnpm prisma:migrate` - Prisma migration
- `pnpm prisma:studio` - Prisma studio

## Testing Notes

Install Playwright Chromium once:

```bash
pnpm exec playwright install chromium
```

Then run:

```bash
pnpm test:e2e
```

## Vercel Deployment

- App deploys directly on Vercel as a Next.js project.
- For telemetry, attach a Postgres database (Neon/Vercel Postgres) and set:
  - `DATABASE_URL`
  - `ENABLE_TELEMETRY=true`
  - `NEXT_PUBLIC_ENABLE_TELEMETRY=true`
- Optional Sentry env vars:
  - `NEXT_PUBLIC_SENTRY_DSN`
  - `SENTRY_ORG`
  - `SENTRY_PROJECT`
  - `SENTRY_AUTH_TOKEN`
