# Sprint 1 — GitHub Issues

**Sprint:** 1 — Foundations (Weeks 1–2)
**Companion docs:** [`PRD-MVP.md`](./PRD-MVP.md) · [`EXECUTION-PLAN.md`](./EXECUTION-PLAN.md)
**Sprint goal:** a signed-in user with a mode preference lives in a real DB, on both Freighter and LOBSTR.

Each item below is one PR / one issue. Sizes are rough dev-days (0.5 = half day, 3 = three days). Dependencies use ticket numbers below.

**Suggested labels:** `sprint-1` on all, plus one of `area:wallet`, `area:auth`, `area:onboarding`, `area:db`, `area:ops`.

---

## Dependency graph (short version)

```
#1 wallet-kit ──▶ #2 wallet picker ──▶ #5 connect→sign→session
#8 supabase bootstrap ──▶ #9 schema ──▶ #10 RLS ──▶ #11 seed
#8 ─────────────────────▶ #3 auth endpoints ──▶ #4 auth middleware ──▶ #5
#4 + #9 ─────────────────▶ #6 onboarding + persistence ──▶ #7 mode switcher
#12 (secret rotation) can start day 1, independent
#13 Sentry, #14 logging: independent, land any time
```

---

## Wallet (F1)

### Issue #1 — Adopt `stellar-wallets-kit`, replace `freighter-api`
**Labels:** `sprint-1`, `area:wallet`
**Size:** 1.5 d
**Depends on:** —

**Context.** Today `frontend/lib/wallet-context.tsx` calls `@stellar/freighter-api` directly and hard-codes the testnet passphrase. We need an abstraction that also supports LOBSTR (via WalletConnect). The chosen library is `@creit.tech/stellar-wallets-kit`.

**Scope.**
- Add `@creit.tech/stellar-wallets-kit` to `p2p-safe-swap/package.json`.
- Refactor `WalletProvider` / `useWallet` to use the kit internally while keeping the exact same public API (`publicKey`, `network`, `isConnecting`, `connect`, `disconnect`, `signTransaction`). No downstream call sites should need changes.
- Read the network from `NEXT_PUBLIC_STELLAR_NETWORK` (`testnet` | `mainnet`) and pass the correct passphrase to the kit.
- Remove the direct `@stellar/freighter-api` import from `wallet-context.tsx`. Keep the dep in `package.json` only if the kit needs it transitively.

**Acceptance.**
- Existing "Connect wallet" button still works with Freighter after the refactor (regression check).
- Signing an XDR still returns a `signedTxXdr` string.
- Switching `NEXT_PUBLIC_STELLAR_NETWORK` between `testnet` and `mainnet` flips the passphrase used to sign.
- No consumer file changed except `wallet-context.tsx` and the env example.

---

### Issue #2 — Wallet picker modal (Freighter + LOBSTR)
**Labels:** `sprint-1`, `area:wallet`
**Size:** 1.5 d
**Depends on:** #1

**Context.** `ConnectWalletButton` currently triggers Freighter directly. We need a picker so the user chooses **Freighter** or **LOBSTR** before signing. LOBSTR connects via WalletConnect (QR from the LOBSTR mobile app).

**Scope.**
- Replace the single "Connect wallet" button with a small modal that lists Freighter and LOBSTR (icons + labels).
- Configure the kit's allowed wallets to exactly these two (no Albedo, xBull, Hana in MVP).
- Handle the LOBSTR WalletConnect flow: show the QR modal from the kit, wait for pairing, resolve to a `publicKey`.
- Persist the chosen wallet id so the reconnect-on-reload path uses it.
- Error states: wallet not installed (Freighter), user cancelled (both), WalletConnect timeout (LOBSTR).

**Acceptance.**
- Modal shows both options; each connects successfully on testnet.
- After connecting once, refreshing the page reuses the same wallet without re-prompting.
- Disconnect clears both the session and the persisted wallet id.
- Cancelling the picker leaves `publicKey` as `null` with no error toast.

---

## Auth (F2)

### Issue #3 — `POST /api/auth/{nonce,verify,logout}` endpoints
**Labels:** `sprint-1`, `area:auth`
**Size:** 2 d
**Depends on:** #8 (needs the Supabase server client to upsert users)

**Context.** The server has no idea who's calling. We need a wallet-signed nonce → JWT cookie flow that works for both Freighter and LOBSTR signatures.

**Scope.**
- `POST /api/auth/nonce` — accepts `{ address }`, returns `{ nonce, expiresAt }` (5-minute TTL). Store nonce keyed by address in a short-lived cache (in-memory Map behind a comment for now; Redis later).
- `POST /api/auth/verify` — accepts `{ address, signedNonce }`. Verify the Stellar signature (use `@stellar/stellar-sdk` `Keypair.fromPublicKey(...).verify(...)`), consume the nonce, upsert a `users` row, set an HttpOnly JWT cookie (`safeswap.session`, `SameSite=Lax`, 30-day sliding, signed with `SESSION_SECRET`).
- `POST /api/auth/logout` — clears the cookie.
- Add `SESSION_SECRET` to `.env.example`.

**Acceptance.**
- A signed nonce from Freighter and from LOBSTR both verify.
- Reusing a consumed nonce fails with 400.
- Cookie is HttpOnly and `Secure` in production.
- New wallet triggers a `users` row insert on first verify.

---

### Issue #4 — Auth middleware + `getSession()` helper
**Labels:** `sprint-1`, `area:auth`
**Size:** 1 d
**Depends on:** #3

**Context.** Once the cookie exists we need a uniform way to read it in API routes and to reject unauthenticated writes.

**Scope.**
- Add `lib/auth/session.ts` with `getSession(request): Promise<{ address } | null>` and `requireSession(request)` (throws 401).
- Guard every mutating API route added later against `requireSession`. For Sprint 1 the only existing writes are the escrow endpoints — leave those alone for now (they'll be wrapped in Sprint 3 when trades move to the DB); the guard is required infra ready-to-use.
- Add a `GET /api/auth/me` that returns the current user row or 401.

**Acceptance.**
- `GET /api/auth/me` returns `{ address, preferred_mode, display_name, ... }` for a valid cookie, 401 otherwise.
- Helper is documented in `lib/auth/README.md` (2-liner usage example).

---

### Issue #5 — Wire wallet connect → sign nonce → set session
**Labels:** `sprint-1`, `area:auth`, `area:wallet`
**Size:** 1 d
**Depends on:** #2, #3

**Context.** After picking a wallet and getting the public key, the client should immediately fetch a nonce, ask the wallet to sign it, and post to `/api/auth/verify` to set the cookie.

**Scope.**
- Extend `WalletProvider.connect()` (or add a `signIn()` step in the picker flow) to call the nonce/verify endpoints after obtaining `publicKey`.
- Surface a spinner state ("Signing in…") between wallet connect and session established.
- On failure, disconnect the wallet and show the error.
- Persist the session-established flag so we don't re-sign on every page load if the cookie is still valid — call `GET /api/auth/me` once on mount and short-circuit if authed.

**Acceptance.**
- Fresh user: connect → sign → cookie set → `GET /api/auth/me` returns the user row.
- Returning user with valid cookie: no signature prompt on page load.
- Signature refused: wallet is disconnected, error is shown, no cookie set.

---

## Onboarding (F3)

### Issue #6 — `/onboarding/mode` page + redirect logic
**Labels:** `sprint-1`, `area:onboarding`
**Size:** 1 d
**Depends on:** #4, #9 (needs `users.preferred_mode`)

**Context.** After first connect the user must pick Buy or Sell USDC; the choice is stored on their user row and drives the default landing page.

**Scope.**
- New route `app/onboarding/mode/page.tsx` with two big cards: **Buy USDC** and **Sell USDC**.
- `PATCH /api/users/me` accepting `{ preferred_mode }`; writes to `users.preferred_mode`.
- Global redirect logic (in `AppShell` or a small hook): if session exists and `preferred_mode` is null and the current path isn't `/onboarding/mode`, redirect there. If it's set, `/` and post-connect land the user on `/p2p/orders?mode=<preferred>`.

**Acceptance.**
- New wallet's first navigation after connect is `/onboarding/mode`.
- Returning wallet with `preferred_mode` set skips onboarding.
- Picking a mode saves it and routes to `/p2p/orders?mode=<preferred>`.

---

### Issue #7 — Mode switcher in order-list header
**Labels:** `sprint-1`, `area:onboarding`
**Size:** 0.5 d
**Depends on:** #6

**Context.** Users should be able to flip between Buy/Sell views without re-onboarding.

**Scope.**
- Small segmented control at the top of `/p2p/orders` that toggles the `mode` URL param.
- Optional: on toggle, also update `users.preferred_mode` (Sprint 1 nice-to-have; Sprint 2 can defer).

**Acceptance.**
- Toggle changes the URL and the list re-fetches. No page reload.

---

## Database (F4)

### Issue #8 — Bootstrap Supabase project + client wrappers
**Labels:** `sprint-1`, `area:db`
**Size:** 1 d
**Depends on:** —

**Context.** `lib/supabase.ts` instantiates a client but nothing consumes it. We need dev + prod Supabase projects, environment plumbing, and a server-only client that uses the service role key.

**Scope.**
- Create Supabase projects: `safeswap-dev` and `safeswap-prod` (record the URLs somewhere the team can access, e.g. 1Password).
- Update `.env.example` with:
  ```
  NEXT_PUBLIC_SUPABASE_URL=
  NEXT_PUBLIC_SUPABASE_ANON_KEY=
  SUPABASE_SERVICE_ROLE_KEY=
  ```
- Split `lib/supabase.ts` into `lib/supabase/browser.ts` (anon key, safe for client) and `lib/supabase/server.ts` (service role, server-only, throws if imported in client).
- Add `supabase/config.toml` and initial CLI setup (`supabase init`, `supabase link`) documented in `docs/SUPABASE-SETUP.md`.

**Acceptance.**
- `npm run dev` boots without runtime error when the env vars are set.
- Importing `lib/supabase/server` from a client component fails at build time (or clearly at runtime).
- README section explains how to run migrations locally.

---

### Issue #9 — Migration: initial schema (users, orders, trades, messages, ratings)
**Labels:** `sprint-1`, `area:db`
**Size:** 1.5 d
**Depends on:** #8

**Context.** The five MVP tables spec'd in `PRD-MVP.md` §7 plus their indexes and `updated_at` triggers.

**Scope.**
- Create `supabase/migrations/0001_initial_schema.sql` with the five tables exactly matching PRD §7 (CHECK constraints, enums-as-check for `mode`, `fiat=CRC`, `payment_methods`, `status`).
- Indexes:
  - `orders (status, price)` — order-list sort by best price
  - `orders (maker_address)` — "my orders"
  - `trades (buyer_address, created_at desc)`, `trades (seller_address, created_at desc)`
  - `trades (contract_id)` unique-where-not-null
  - `messages (trade_id, created_at)` — chat pagination
- `updated_at` trigger on `orders` and `trades`.
- Ratings aggregation trigger deferred to Sprint 4 (F10); include a `TODO` comment where it will live.

**Acceptance.**
- `supabase db reset` runs the migration cleanly.
- All expected indexes appear in `pg_indexes`.
- Inserting an order with an unsupported `payment_methods` value fails the check constraint.

---

### Issue #10 — Migration: RLS policies for all tables
**Labels:** `sprint-1`, `area:db`
**Size:** 1 d
**Depends on:** #9

**Context.** Without RLS the anon key can read/write anything. We need policies per PRD §7.

**Scope.**
- `supabase/migrations/0002_rls_policies.sql`.
- `users`: SELECT self only; UPDATE self only. INSERT restricted to service role (auth verify path).
- `orders`: SELECT public; INSERT/UPDATE/DELETE only when `maker_address = auth.jwt() ->> 'address'`.
- `trades`: SELECT and UPDATE only when caller is `buyer_address` or `seller_address`. INSERT restricted to service role.
- `messages`: SELECT/INSERT only for trade participants (join to `trades`).
- `ratings`: SELECT public; INSERT only when caller was a participant on the trade and the trade is `released`.
- Add integration test (Vitest + supabase-js with anon key) that verifies each denied path returns 401/403.

**Acceptance.**
- Anon key cannot read another user's trade.
- Anon key cannot update someone else's order.
- Test suite passes; each policy has at least one deny + one allow test.

---

### Issue #11 — Seed script for local dev
**Labels:** `sprint-1`, `area:db`
**Size:** 0.5 d
**Depends on:** #10

**Context.** Empty tables make the UI unusable during Sprint 2 dev. Seed a handful of fake users + open sell orders.

**Scope.**
- `supabase/seed.sql` inserting ~5 users (fake `G…` addresses fine, mark them all with a `display_name`) and ~5 open sell orders in CRC with a mix of `bank_transfer_cr` and `sinpe_movil`.
- Ensure `supabase db reset` re-applies the seed automatically.
- Add `npm run db:reset` script to `package.json`.

**Acceptance.**
- `npm run db:reset` gets the DB to a state where `/p2p/orders` (after Sprint 2 wiring) will render a non-empty list.

---

## Ops (F12 — partial)

### Issue #12 — Rotate leaked `TW_API_KEY` and scrub `.env.example`
**Labels:** `sprint-1`, `area:ops`, `priority:security`
**Size:** 0.5 d
**Depends on:** —

**Context.** `docs/issues/02-rotate-leaked-api-key.md` flagged that a real-looking Trustless Work key was committed to `p2p-safe-swap/app/api/.env.example`. It's since been replaced with a placeholder, but the leaked key must be rotated on the TW dashboard and considered burned.

**Scope.**
- Rotate the key via the Trustless Work dashboard.
- Confirm `.env.example` contains only `TW_API_KEY=your_api_key_here`.
- Distribute the new key to team members via 1Password (or equivalent), not git.
- Add a short entry to `README.md` noting: never commit API keys, use `.env.local` only.

**Acceptance.**
- Old key returns 401 when hit against TW API.
- New key present in local `.env.local` for at least one team member and verified working end-to-end (deploy an escrow on testnet).

---

### Issue #13 — Add Sentry (client + server)
**Labels:** `sprint-1`, `area:ops`
**Size:** 1 d
**Depends on:** —

**Context.** We have no visibility into runtime errors. Sentry gives us both client-side (unhandled promise rejections, React errors) and server-side (API route throws) coverage with minimal setup on Next.js.

**Scope.**
- `npx @sentry/wizard@latest -i nextjs` and commit the generated files.
- Add `NEXT_PUBLIC_SENTRY_DSN` to `.env.example`.
- Configure sample rates: 100 % errors, 10 % traces in production.
- Ignore common noise (wallet user-cancelled errors, expected 401s from `/api/auth/me`).
- Verify one intentional client error and one intentional server error appear in Sentry.

**Acceptance.**
- Sentry project exists and receives events.
- No PII (wallet addresses excluded from `beforeSend`? Discuss — for now include, they're public).

---

### Issue #14 — Structured logging skeleton (pino)
**Labels:** `sprint-1`, `area:ops`
**Size:** 0.5 d
**Depends on:** —

**Context.** Console logs sprinkled across API routes are unstructured and unsearchable. Pino gives JSON logs with request-scoped children.

**Scope.**
- Add `pino` + `pino-pretty` (dev only).
- `lib/log.ts` exports a default logger + a `withRequest(request)` helper that binds `{ requestId, path, method, address? }`.
- Refactor existing escrow API routes to use `log.info` / `log.error` instead of `console.log` / `console.error`, with redaction on any field containing `apiKey` or `signedTxXdr`.

**Acceptance.**
- Production logs are one JSON object per line.
- Dev logs are colorized via `pino-pretty`.
- Grepping for a `requestId` returns every line for that request.

---

## Sprint 1 exit checklist

Before calling Sprint 1 done:

- [ ] Freighter and LOBSTR both connect + sign on testnet (#1, #2).
- [ ] Fresh wallet on device A + fresh wallet on device B each create their own `users` row and land on `/onboarding/mode` (#3–#7).
- [ ] Both users then land on `/p2p/orders?mode=<preferred>` after picking.
- [ ] Supabase migrations run cleanly from a wipe (`supabase db reset && npm run db:reset`) (#8–#11).
- [ ] RLS test suite passes (#10).
- [ ] Leaked TW API key rotated (#12).
- [ ] Sentry receives a test error (#13).
- [ ] All API routes emit structured JSON logs (#14).

**Cut lines if the sprint slips:** #7 (mode switcher) → Sprint 2. #14 (pino) → Sprint 2. Everything else is load-bearing for Sprint 2/3.
