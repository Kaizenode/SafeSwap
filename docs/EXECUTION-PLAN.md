# SafeSwap MVP — Execution Plan

**Companion to:** [`PRD-MVP.md`](./PRD-MVP.md)
**Status:** Draft v0.1
**Last updated:** 2026-08-07

This document turns the PRD into a concrete, feature-scoped delivery plan. It reflects the additional MVP constraints agreed after the PRD:

- **Two trader roles only:** seller and buyer (no moderator role in v1 shipping; disputes handled by a hard-coded platform wallet, dashboard is P1).
- **Auth is wallet-only.** Supported wallets: **Freighter** and **LOBSTR** (both Stellar-native). No email/password, no OAuth.
- **First step after connect:** trader picks *Buy USDC* or *Sell USDC*. Mode drives the UI from that point.
- **Fiat rails (MVP):** **bank transfer** and **SINPE Móvil** (Costa Rica). Country/rail set is intentionally narrow.
- **Order persistence is required.** Sellers publish, buyers browse — both from a real DB, not the current mocks.
- **Escrow-mediated transfers.** USDC never moves peer-to-peer directly; every trade routes through a Trustless Work escrow contract, and only *release-funds* pays the counterparty's wallet.

---

## 1. Delta vs. current state (recap)

| Area | Today | MVP requires |
|---|---|---|
| Wallet auth | Freighter only, address stored in `localStorage`, no server session | Freighter **and** LOBSTR; signed-nonce session on the server |
| Trader mode | Buy/sell toggle on the order list only (client-side) | Explicit **mode selection screen** after wallet connect; propagated to server |
| Orders | Three hard-coded orders in `MOCK_ORDERS` | Real DB (Supabase). Sellers create, buyers browse, both filter by fiat + payment method |
| Fiat methods | Generic strings (SEPA, Wise, Bizum, Revolut) | Fixed list: `bank_transfer_cr`, `sinpe_movil` |
| Trade tracking | Trade `contractId` lives in `localStorage` per browser | Trades persisted server-side keyed by trade id + contract id |
| Escrow lifecycle | deploy · fund · approve-milestone · release · dispute (real) | Add `change-milestone-status` (buyer "I paid") + `resolve-dispute` (moderator) |
| Chat | Local state mock messages | Realtime chat scoped to trade (Supabase Realtime) |
| Wallet screen | Mock balance + mock tx list | Real XLM/USDC balances from Horizon, real escrow history |
| Reputation | Boolean `verified` in mock | Aggregate rating + ops count per wallet, updated on release |
| Notifications | None | In-app toast + badge; email opt-in (deferred until Sprint 4) |

---

## 2. Feature inventory & gap map

Each feature below is a self-contained deliverable with its own acceptance criteria. **P0** = required to call the MVP shipped; **P1** = required to publicly launch beyond internal beta.

### F1 — Multi-wallet connect (Freighter + LOBSTR)  · P0
**Have:** `frontend/lib/wallet-context.tsx` wraps `@stellar/freighter-api` (connect, address, sign, testnet passphrase hard-coded).
**Missing:**
- LOBSTR support (LOBSTR does not ship a browser extension API; connection is via WalletConnect through the LOBSTR mobile app).
- Wallet picker UI ("Connect with Freighter / Connect with LOBSTR").
- Provider abstraction so calling code stays wallet-agnostic.
- Testnet vs mainnet passphrase driven by env, not hard-coded.

**Recommended approach:** replace the hand-rolled Freighter client with **`@creit.tech/stellar-wallets-kit`** (single kit that ships adapters for Freighter, LOBSTR-via-WalletConnect, Albedo, xBull, Hana). Rewrite `WalletProvider` to expose the same `{ publicKey, connect, disconnect, signTransaction }` shape so downstream callers stay unchanged.

**Acceptance:**
- Modal offers Freighter and LOBSTR; each successfully returns a `G…` public key and can sign an XDR.
- `signTransaction` picks the passphrase from `NEXT_PUBLIC_STELLAR_NETWORK`.
- Session survives a page reload without re-prompting.

### F2 — Server-side wallet session (auth)  · P0
**Have:** nothing. All "auth" is a client-side address in `localStorage`.
**Missing:**
- `POST /api/auth/nonce` → returns a short-lived challenge string.
- `POST /api/auth/verify` → validates a wallet-signed nonce, upserts a `users` row, returns an HttpOnly JWT cookie.
- Middleware that guards all mutation routes (order/trade/message create) and injects the caller's address.
- `POST /api/auth/logout` (clears cookie).

**Acceptance:**
- Any write endpoint returns 401 without a valid session cookie.
- A signed nonce from Freighter *and* from LOBSTR both succeed.
- Cookie is HttpOnly, `SameSite=Lax`, TTL 30 days sliding.

### F3 — Trader mode selection (buy / sell)  · P0
**Have:** local state `mode` toggle on `/p2p/orders`.
**Missing:**
- Post-connect screen or step: "What do you want to do? [Buy USDC] [Sell USDC]".
- Persisted `preferred_mode` on the user row for return sessions.
- Order-list default filter driven by the choice (buyers see sell orders; sellers see buy orders — or their own listings).
- Route: `/onboarding/mode` after first connect; remembered as the default landing thereafter.

**Acceptance:**
- New user's first navigation after connect is `/onboarding/mode`.
- Returning user with a stored preference lands on `/p2p/orders?mode=...` directly.
- Mode can be flipped from the order list without re-onboarding.

### F4 — Data layer (Supabase schema + client)  · P0
**Have:** Supabase client instantiated in `lib/supabase.ts`, never called.
**Missing:** everything. Tables + RLS + a server-only client that uses the service role for privileged writes.

**Tables** (final MVP set):
```
users(address PK, display_name, preferred_mode, avatar_seed, ops_count, rating_avg, created_at)
orders(id PK, maker_address FK, mode, fiat, price, available, min_limit, max_limit,
       payment_methods text[], window_minutes, status, created_at, updated_at)
trades(id PK, order_id FK, buyer_address, seller_address, amount_usdc, amount_fiat,
       payment_method, contract_id, status, tx_hashes jsonb, dispute_reason,
       created_at, updated_at)
messages(id PK, trade_id FK, author_address, kind, body jsonb, created_at)
ratings(id PK, trade_id FK, rater_address, ratee_address, score, comment, created_at,
        UNIQUE(trade_id, rater_address))
```

**Enums / fixed values:**
- `mode`: `buy | sell`
- `fiat`: `CRC` (MVP is Costa Rica-only; USD later)
- `payment_methods`: `bank_transfer_cr | sinpe_movil`
- `orders.status`: `open | paused | filled | cancelled | expired`
- `trades.status`: `pending_escrow | funded | fiat_sent | approved | released | disputed | resolved | cancelled`

**Acceptance:**
- Migrations checked into `supabase/migrations/`.
- RLS enabled: users can read all `orders`, but only mutate their own; can only read `trades` where they are buyer or seller; can only read `messages` for trades they're party to.
- Seed script produces 5 dummy sellers + 5 dummy orders for local dev.

### F5 — Orders marketplace (CRUD + browse)  · P0
**Have:** `/p2p/orders` UI (mocked), order detail page (mocked).
**Missing:**
- `POST /api/orders` (sellers only in v1: sell USDC for CRC via bank / SINPE).
- `GET /api/orders?mode=sell&fiat=CRC&payment_method=…&page=…` returning DB orders sorted by best price.
- `PATCH /api/orders/:id` (pause / cancel; only by maker).
- Create-order form: price, min/max limit in CRC, total available in USDC, payment methods multi-select, window minutes.
- Replace `MOCK_ORDERS` / `MOCK_ORDERS` in `app/p2p/orders/page.tsx` and `app/p2p/orders/[id]/page.tsx` with fetched data.
- Best-price banner recomputed from the live list, not the hard-coded `BEST_PRICE`.

**Buyer-created buy orders (post-MVP switch):** the schema supports both directions; in Sprint 1 we only expose the seller flow to keep the surface small. Buy orders come in Sprint 3 if needed.

**Acceptance:**
- A seller can create an order, see it on the public list within 500 ms, edit and cancel it.
- A buyer sees the same order and can filter by `bank_transfer_cr` or `sinpe_movil`.
- Empty state and pagination both render correctly.

### F6 — Trade lifecycle (persisted + escrow-orchestrated)  · P0
**Have:** `/trades/[id]` implements the on-chain steps (deploy, fund, approve, release, dispute) end-to-end against Trustless Work. Contract id lives in `localStorage`.
**Missing:**
- `POST /api/trades` — creates the trade row (`pending_escrow`), reserves capacity on the parent order, returns id.
- `GET /api/trades/:id` — returns full state so both parties see the same trade after refresh.
- `POST /api/trades/:id/advance` (server-side status machine invoked by each on-chain step webhook / callback).
- **Buyer "I've paid" endpoint:** `POST /api/escrow/single-release/v2/change-milestone-status` — currently absent (`docs/issues/05-*` scoped it, not implemented). Adds trade status transition `funded → fiat_sent`.
- Move `contractId` off `localStorage` onto `trades.contract_id`; hydrate `/trades/[id]` from the server so the counterpart can join by URL.
- Enforce trade timeout: auto-cancel if not funded within `orders.window_minutes` (background job or cron on Supabase).

**Acceptance:**
- Two independent browsers using different wallets can complete the full happy path without any localStorage/dev intervention.
- After each on-chain success the DB status advances and both clients render the new step.
- A funded trade shows the buyer's "I've paid" button, and only the seller can click "Confirm fiat received".

### F7 — In-trade chat (realtime)  · P0
**Have:** mock messages on `/chat/[id]` and inside `/p2p/orders`.
**Missing:**
- `messages` table + Supabase Realtime channel subscription per trade id.
- `POST /api/trades/:id/messages` (kinds: `text`, `payment_confirmation`, `system`).
- System messages auto-inserted on: trade created, escrow deployed, escrow funded, fiat sent, approved, released, disputed, resolved, cancelled.
- Basic anti-abuse: 5 msg / 10 s per wallet.

**Deferred:** attachments, read receipts, typing indicators.

**Acceptance:**
- Message sent by user A appears on user B's screen within 2 s.
- System messages appear at each status transition.

### F8 — Dispute flow + resolver  · P0 (dispute open) / P1 (resolver UI)
**Have:** raise-dispute dialog wired to `POST /api/escrow/single-release/v2/dispute` from both `/p2p/orders` and `/chat/[id]`.
**Missing:**
- `POST /api/escrow/single-release/v2/resolve-dispute` route (Trustless Work call).
- Dispute reason persisted on `trades.dispute_reason`.
- Trade status → `disputed`; auto-block further chain actions until resolved.
- **Moderator dashboard `/admin/disputes`** (P1, Sprint 4): list of open disputes, chat replay, distribution form (buyer amount + seller amount that sum to escrow balance), submit → `resolve-dispute`.
- Access gate for `/admin/**`: env `ADMIN_WALLETS` allowlist.

**Acceptance (P0):** either side can open a dispute; state persists across reload; the platform wallet (from env) is set as `disputeResolver` on every deployed escrow.
**Acceptance (P1):** an allowlisted moderator wallet sees the dispute, files a distribution, funds move accordingly.

### F9 — Wallet screen (real balances + activity)  · P1
**Have:** `/wallet` shows `MOCK_ADDRESS` and hard-coded balance + tx list.
**Missing:**
- Read connected wallet address (from `WalletContext`).
- Fetch XLM balance and USDC trustline balance from Horizon (`GET /accounts/{id}`).
- Reuse `useEscrows` (already wired for `/transactions`) for the activity feed.
- Actions: copy address, view on Stellar Expert. Send/receive deferred.

**Acceptance:** connected wallet's actual balances render; disconnected state shows a "connect" prompt.

### F10 — Reputation (rating on release)  · P1
**Have:** UI shows `rating`, `opsCount`, `verified` from mocks.
**Missing:**
- `POST /api/trades/:id/ratings` (once, per party, after `released`).
- Aggregate refresh: on rating insert, recompute `users.rating_avg` and `users.ops_count`.
- Post-release rating dialog on `/trades/[id]`.
- Reputation surfaced on order cards and profile popovers.

**Acceptance:** a completed trade lets both sides rate 1–5 with an optional comment; the counterpart's card updates on next fetch.

### F11 — Notifications  · P1
**Have:** nothing.
**Missing:**
- In-app toast + a badge on `BottomNav` for unread message / trade update.
- Server-sent events (or Realtime channel) per user for cross-tab updates.
- Email notifications (Resend) opt-in, for status changes + new messages when tab is inactive. Requires optional email at profile.

**Acceptance:** message received while on another tab shows a toast + increments the badge; opting in and receiving an email works end-to-end.

### F12 — Ops hardening (rate limits, logs, error reporting, key rotation)  · P0
**Have:** nothing.
**Missing:**
- Rate limits on `/api/orders`, `/api/trades`, `/api/**/messages` (e.g. `next-rate-limit` or Upstash).
- Structured logs (pino) on every escrow endpoint with request/response redaction.
- Sentry (or equivalent) on both client and server.
- **Rotate the leaked `TW_API_KEY`** (`docs/issues/02-*`) before public testnet.
- README/env docs updated to remove NestJS/GraphQL/Prisma references.

**Acceptance:** load-test 100 orders creation from one wallet → 429 after the configured threshold; a client crash lands in Sentry.

---

## 3. Sprint plan (4 × 2-week sprints ≈ 8 weeks)

Sprints are sized for **2 FE + 1 BE + 1 shared PM/designer**. Each sprint ends with a working, testable slice on Stellar testnet.

### Sprint 1 — Foundations (Weeks 1–2)
**Goal:** a signed-in user with a mode preference lives in a real DB.

- **F1** Multi-wallet connect (Freighter + LOBSTR via `stellar-wallets-kit`).
- **F2** Wallet-nonce auth + JWT cookie.
- **F3** Trader mode selection screen + persistence.
- **F4** Supabase schema, migrations, RLS, seed script.
- **F12** Rotate `TW_API_KEY`, add Sentry, structured logs skeleton.

**Demo at end of sprint:** connect with either wallet on two devices, pick Buy/Sell, refresh the page, session persists.

### Sprint 2 — Orders marketplace (Weeks 3–4)
**Goal:** real orders replace all mocks.

- **F5** Order CRUD API + create-order form + wire `/p2p/orders` and `/p2p/orders/[id]` to the DB.
- Best-price banner recomputed live.
- Filters: fiat (`CRC`), payment method (`bank_transfer_cr`, `sinpe_movil`).
- Cancellation / pausing by maker.
- **F12** Rate limits on order endpoints.

**Demo:** seller creates an order from device A; buyer on device B sees, filters, opens detail, and can navigate toward "Take order" (which no-ops for now with a placeholder toast).

### Sprint 3 — Trade + chat end-to-end (Weeks 5–6)
**Goal:** two users complete a trade start-to-finish through the UI, unattended.

- **F6** `POST /api/trades`, `GET /api/trades/:id`, persisted `contractId`, remove `localStorage` roundtrip.
- **F6** Implement `change-milestone-status` API route + buyer "I've paid" button on `/trades/[id]`.
- **F6** Auto-cancel on `window_minutes` timeout (Supabase scheduled function).
- **F7** Chat messages table + Realtime subscription + system messages on status transitions.
- **F8 (P0 half)** Persist dispute reason; block chain actions when `disputed`; implement `resolve-dispute` route (invoked manually via `curl` for now).

**Demo:** full happy path (create order → take → deploy → fund → I've paid → confirm → release) plus a manual dispute → resolve flow via API.

### Sprint 4 — Polish, reputation, moderator, launch (Weeks 7–8)
**Goal:** publicly usable testnet beta.

- **F9** Wallet screen wired to real Horizon balances + shared activity feed.
- **F10** Rating flow post-release + reputation on order cards.
- **F8 (P1 half)** `/admin/disputes` moderator dashboard behind `ADMIN_WALLETS` allowlist.
- **F11** In-app toasts + badge; email opt-in via Resend.
- **F12** E2E happy-path + dispute-path Playwright tests; complete Sentry + logs coverage; docs (`README`, `.env.example`) refreshed.

**Demo / launch readiness:** two external testers complete a trade unaided; moderator resolves a seeded dispute from the dashboard; email notifications received.

---

## 4. Cross-cutting engineering decisions

- **Where the state of truth lives:** on-chain for escrow balance & flags; Postgres for everything else. UI reads from Postgres and reconciles with `get-escrows-by-signer` / `get-multiple-escrow-balance` on the trade detail page.
- **Money never leaves without a signed XDR from the acting wallet.** No server-side custody. All fund / approve / release / dispute calls return an unsigned XDR that the connected wallet signs before we submit it via `send-transaction`.
- **Freighter and LOBSTR only.** No Albedo / xBull for MVP even though the kit supports them — reduces support surface. Add later behind the same abstraction.
- **Costa Rica fiat only.** CRC + `bank_transfer_cr` + `sinpe_movil`. Adding a country later = new enum value + a payment-method label; no schema change.
- **English UI, English strings.** Consolidate the existing Spanish strings in `/transactions` (`Conecta tu wallet…`, `Cargando…`) during Sprint 4 polish.
- **Wallet kit choice:** `@creit.tech/stellar-wallets-kit` — supports Freighter directly and LOBSTR via WalletConnect, same signature API. Confirms our LOBSTR path without hand-rolling WalletConnect.

---

## 5. Risks & mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| LOBSTR requires WalletConnect and a mobile phone in-hand — desktop-only users can't use it. | Reduces addressable users. | Keep Freighter as the default; document LOBSTR as "connect via QR from the mobile app". Consider adding a browser-native wallet later. |
| Supabase RLS misconfiguration exposes other users' trades or messages. | Data leak. | Write RLS policies as SQL migrations, code-review each; add automated tests that hit the anon key and expect denials. |
| Trustless Work API changes payload shapes (already once between docs and impl). | Breaks trade flow. | Wrap all TW calls in the existing `lib/trustless-work.ts` client; snapshot-test request/response shapes; run a testnet smoke test in CI. |
| Off-chain fiat is unverifiable — a buyer can click "I've paid" without paying. | Dispute rate spike. | Require a *payment reference* string in the "I've paid" confirmation; expose it to seller in-chat; disputes fall back to moderator judgment. Post-MVP: bank webhook or CR-specific SINPE confirmation API. |
| Leaked API key in git history. | Free abuse of TW quota. | Rotate in Sprint 1, scrub via `git filter-repo` or accept the leak as "burned" and rotate. |

---

## 6. Explicit non-scope for the MVP

Anything not in the sprint plan above is out of scope. Notable exclusions worth calling out:
- No multi-asset (no XLM/EURC/USDT trading).
- No multi-release escrow.
- No fiat-rail auto-verification.
- No native mobile app.
- No public API / third-party integration.
- No partial fills across multiple orders.
- No i18n; English only.

---

## 7. Open questions inherited from the PRD (need answers before Sprint 3)

1. **Auto-release after seller approval, or two clicks?** — recommend auto.
2. **Platform fee percentage** and destination wallet (testnet vs mainnet).
3. **Buy-side order flow:** ship in Sprint 3 or defer past MVP? (Plan currently defers.)
4. **Optional email at profile** — collected at connect, or only when opting into notifications? (Plan: only when opting in.)
5. **SLA for dispute resolution** — moderator staffing model.
