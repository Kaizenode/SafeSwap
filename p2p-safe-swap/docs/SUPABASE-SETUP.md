# Supabase Setup

How SafeSwap's database layer is provisioned: the two remote projects, the
local dev stack, environment plumbing, and the migrations workflow.

## 1. Remote projects

We run two Supabase projects:

| Project | Purpose |
|---|---|
| `safeswap-dev` | Development / testnet. Point `.env.local` here while developing. |
| `safeswap-prod` | Production. Only referenced by deployed environments. |

> **Where the secrets live.** Project URLs and keys (anon + service role) are
> recorded in **1Password**, not in git. If you can't find them, ask the team
> lead to add you to the SafeSwap vault. Do **not** paste real keys into
> `.env.example` — that file must only ever contain empty placeholders.

For each project, the values we need are:

- **Project URL** — `https://<ref>.supabase.co` (shown under *Settings → API*).
- **Anon (public) key** — safe for the browser.
- **Service role key** — server-only. Bypasses RLS; never expose it.

## 2. Prerequisites

- [Supabase CLI](https://supabase.com/docs/guides/cli) (`supabase --version`).
- [Docker](https://docs.docker.com/desktop/) — only needed to run the **local**
  stack (`supabase start`).

## 3. Local stack

The `supabase/` directory was initialized with `supabase init`:

```bash
cd p2p-safe-swap
supabase init            # creates supabase/config.toml (already committed)
supabase start           # boots Postgres, PostgREST, Auth, Storage, Studio
```

- **Studio** (local dashboard): http://localhost:54323
- **API URL**: http://127.0.0.1:54321
- **Postgres**: postgresql://postgres:postgres@127.0.0.1:54322/postgres

`supabase stop` shuts the stack down (data persists across restarts unless you
run `supabase db reset`).

## 4. Linking to a remote project

Link the local project to a remote one so `supabase db push` knows where to
apply migrations:

```bash
# Development
supabase link --project-ref <safeswap-dev-project-ref>

# Production (do this from a dedicated checkout / with care)
supabase link --project-ref <safeswap-prod-project-ref>
```

The project ref is the `<ref>` in your project URL (`https://<ref>.supabase.co`).
You can re-link at any time; linking only affects where `db push` targets.

## 5. Environment variables

Copy the template and fill in the values from 1Password:

```bash
cp .env.example .env.local
```

| Variable | Exposed to client? | Used by |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Browser + server clients |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Browser client |
| `SUPABASE_SERVICE_ROLE_KEY` | **No** | Server admin client |

Point `.env.local` at `safeswap-dev` (or your local stack's API URL + anon key)
during development.

## 6. Running migrations locally

Migrations live in `supabase/migrations/` as ordered SQL files
(`0001_*.sql`, `0002_*.sql`, …).

```bash
# Reset the local DB to a clean state and re-apply migrations + seed.
supabase db reset

# Apply pending migrations to the linked remote project.
supabase db push

# Verify the migration status.
supabase migration list
```

Workflow:

1. Write your change as the next numbered `supabase/migrations/000N_*.sql`.
2. `supabase db reset` — confirm it applies cleanly from a wipe.
3. `supabase db push` — apply it to the linked remote.

Never hand-edit the remote DB in the dashboard; always go through migrations.

## 7. Client wrappers

Two clients replace the old single `lib/supabase.ts`:

| Module | Key | Scope |
|---|---|---|
| `lib/supabase/browser.ts` | anon key | Client components. Enforce RLS. |
| `lib/supabase/server.ts` | service role | Server components / route handlers only. |

- `createSupabaseBrowserClient()` — use in client components.
- `supabaseAdmin` — use in server-only code (API routes, Server Components).

`lib/supabase/server.ts` imports `server-only`, so importing it from a client
component fails the build. Keep the service role key out of the browser.
