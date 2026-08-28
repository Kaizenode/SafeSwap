# Supabase Setup

This document covers the Supabase projects, environment plumbing, and the
client wrappers used by the SafeSwap app (`p2p-safe-swap`).

## Projects

| Environment | Project name  | Use                                  |
|-------------|---------------|--------------------------------------|
| Dev         | `safeswap-dev`| Local development / testnet testing  |
| Prod        | `safeswap-prod` | Production traffic                 |

The project URLs, anon keys, and service role keys are stored in 1Password
under **SafeSwap — Supabase**. Do not commit real keys.

## Environment variables

Copy `p2p-safe-swap/.env.example` to `p2p-safe-swap/.env.local` and fill in:

| Variable                       | Scope          | Description                          |
|--------------------------------|----------------|--------------------------------------|
| `NEXT_PUBLIC_SUPABASE_URL`     | client + server| Project URL (safe to expose)         |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`| client + server| Anon key (safe to expose)            |
| `SUPABASE_SERVICE_ROLE_KEY`    | server only    | Service role key — **never expose**  |

## Client wrappers

- `lib/supabase/browser.ts` — anon-key client for client components
  (`import { supabase } from "@/lib/supabase/browser"`).
- `lib/supabase/server.ts` — service-role client for server code
  (`import { supabaseServer } from "@/lib/supabase/server"`). Importing it
  from a client component throws at runtime; treat it as server-only.

## CLI setup

Install the [Supabase CLI](https://supabase.com/docs/guides/cli), then from
the repository root:

```sh
# 1. Initialise (creates/repairs supabase/config.toml)
supabase init

# 2. Start the local stack (Postgres, API, Studio)
supabase start

# 3. Link to the dev project (safeSwap-dev ref from the Supabase dashboard)
supabase link --project-ref <dev-project-ref>
```

## Running migrations locally

Migrations live in `supabase/migrations/`. To apply them to the local
database and reseed:

```sh
supabase db reset
```

Or from the app directory: `npm run db:reset` (runs
`supabase db reset --workdir ..`).

To push the current migration state to a linked remote project:

```sh
supabase db push
```

## Environment notes

- The app uses a custom wallet-nonce JWT auth flow; RLS tests
  (`p2p-safe-swap/tests/rls.test.ts`) need `SUPABASE_URL`,
  `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, and
  `SUPABASE_JWT_SECRET` set locally.
- The service role key bypasses RLS. Only use `lib/supabase/server` for
  trusted server-side operations.
