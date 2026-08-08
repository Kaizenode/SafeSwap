# SafeSwap — MVP PRD

**Status:** Draft v0.1
**Owner:** Kaizenode / SafeSwap core team
**Last updated:** 2026-08-07
**Repo:** `SafeSwap/` (monorepo, active app: `p2p-safe-swap/`)

---

## 1. Product summary

SafeSwap is a peer-to-peer marketplace to buy and sell **USDC on Stellar** against off-chain fiat rails. The MVP targets **Costa Rica** with two payment methods: **bank transfer (CRC)** and **SINPE Móvil**. Every trade is protected by an on-chain **single-release escrow contract** deployed and orchestrated through the **Trustless Work API**. Neither counterparty needs to trust the other: USDC is locked in escrow before fiat moves, and only released once both sides confirm — funds never move peer-to-peer directly, they always route through the escrow contract.

**One-line pitch:** *Binance P2P, but the escrow is a real smart contract you can verify on Stellar.*

### 1.1 Why this exists
Centralized P2P desks (Binance, Bybit, OKX) custody user funds during a trade — meaning the exchange can freeze, censor, or lose them. Fully on-chain DEXs solve custody but cannot handle fiat legs. SafeSwap sits in the middle: **fiat off-chain, crypto in a public escrow contract, dispute resolution via a neutral resolver role** encoded in the contract itself.

### 1.2 Non-goals for MVP
- Multi-asset support beyond USDC (no XLM, EURC, USDT, or non-Stellar chains).
- Multi-release / milestone-based escrow (single milestone: "fiat received").
- Countries or fiat currencies other than Costa Rica / CRC.
- Payment methods other than **bank transfer (CRC)** and **SINPE Móvil**.
- Wallets other than **Freighter** and **LOBSTR** (no Albedo, xBull, Hana in MVP).
- Email / password / OAuth auth. Wallet signature is the only identity.
- In-app fiat rails (no card processor, no bank integration; users self-report the transfer).
- KYC / AML tooling beyond a basic reputation system.
- Native mobile app (MVP is a mobile-first responsive web app).
- Advanced order types (limit orders, stop orders, partial fills across multiple counterparties).
- Fiat-to-fiat trades.
- i18n (English only for MVP).

---

## 2. Current state — what is already built

The app lives in `p2p-safe-swap/` (Next.js 16 App Router + React 19 + Tailwind v4 + shadcn/ui). Legacy NestJS/GraphQL/Prisma mentions in the root README no longer reflect the codebase — everything ships from the Next app.

### 2.1 Views implemented

| Route | File | State | Notes |
|---|---|---|---|
| `/` | `app/page.tsx` | ✅ Landing | Static hero, CTA to `/p2p/orders`. |
| `/p2p/orders` | `app/p2p/orders/page.tsx` | ⚠️ Mock data, real escrow deploy | Three hard-coded orders. "Accept" wires into `deployEscrow` → real Trustless Work call. |
| `/p2p/orders/[id]` | `app/p2p/orders/[id]/page.tsx` | ⚠️ Mock only | Order detail with amount input. Data is a local const, no backend. |
| `/trades/[id]` | `app/trades/[id]/page.tsx` | ✅ Real chain flow | Fund → approve milestone → release, all against the Trustless Work API. Reads contractId from `localStorage`. Includes stepper + live balance. |
| `/chat/[id]` | `app/chat/[id]/page.tsx` | ⚠️ Mock messages | Local state chat. Dispute button wires into real `dispute-escrow`. |
| `/wallet` | `app/wallet/page.tsx` | ❌ Mock only | Hardcoded balance + fake tx list. No wallet reads. |
| `/transactions` | `app/transactions/page.tsx` | ✅ Real read | Pulls from Trustless Work `get-escrows-by-signer` via `useEscrows`. |
| `/escrow/[id]/admin` | `app/escrow/[id]/admin/page.tsx` | ⚠️ Form only | UI ready, `onSubmit` just logs. No API wiring for `update-escrow`. |

### 2.2 API routes implemented (`app/api/**`)

All are Next.js route handlers that forward to Trustless Work using the server-side `TW_API_KEY`:

- `POST /api/escrow/single-release/v2/deploy`
- `POST /api/escrow/single-release/v2/fund`
- `POST /api/escrow/single-release/v2/approve-milestone`
- `POST /api/escrow/single-release/v2/release-funds`
- `POST /api/escrow/single-release/v2/dispute`
- `GET /api/escrow/get-by-contract-id`
- `GET /api/escrows` (list by signer)
- `GET /api/helper/get-multiple-escrow-balance`
- `POST /api/stellar/send-transaction` (submit signed XDR via Trustless Work)
- `POST /api/stellar/submit-horizon` (direct Horizon submit fallback)
- `POST /api/stellar/setup-testnet` (Friendbot fund + USDC trustline for QA)

### 2.3 Integrations

- **Freighter wallet** (`@stellar/freighter-api`) — `frontend/lib/wallet-context.tsx`. Testnet passphrase is hard-coded (`Test SDF Network ; September 2015`).
- **Trustless Work API** — `lib/trustless-work.ts` client + `docs/trustless-work-integration.md` (Spanish). Points at `dev.api.trustlesswork.com` unless `TW_NETWORK=mainnet`.
- **Stellar SDK** (`@stellar/stellar-sdk`) — used server-side for the Horizon submit fallback and testnet setup.
- **Supabase** (`@supabase/ssr`, `@supabase/supabase-js`) — a client is instantiated in `lib/supabase.ts` but **not consumed anywhere**. It is a placeholder.

### 2.4 What is missing today
1. No **persistent backend** for orders, users, chat, or trades — everything except escrow state is either mocked or lives in `localStorage`.
2. No **authentication**. Wallet address is the only "identity".
3. No **chat backend** (no WebSocket, no realtime store).
4. `change-milestone-status` (buyer "I paid" signal) endpoint is not implemented; the buyer-side confirmation is skipped and the seller both approves and triggers release.
5. `resolve-dispute` endpoint is not implemented — disputes can be opened but there is no way to resolve them in-app.
6. `update-escrow` (`PUT /escrow/single-release/update-escrow`) is exposed in the TW client but has no API route or wiring.
7. No **notifications** (email, push, or in-app).
8. Real orders never appear in `/p2p/orders` — the marketplace is a static demo.
9. No **dispute resolver dashboard** for the platform to arbitrate.
10. No **rate/reputation** persistence, no verified badges beyond a boolean in the mock.
11. Wallet screen shows a hardcoded balance instead of reading the connected account.

---

## 3. MVP goal

Ship a **testnet-first, publicly usable P2P marketplace for USDC on Stellar** in Costa Rica, where two Stellar-wallet users (Freighter or LOBSTR) can:

1. Connect their wallet and pick a role: **buy USDC** or **sell USDC**.
2. Sellers post an order (price in CRC, min/max limit, bank transfer and/or SINPE Móvil).
3. Buyers browse the order book and take an offer.
4. Execute the full escrow lifecycle end-to-end (deploy → fund → confirm fiat sent → approve → release) through the SafeSwap UI, with USDC routed through the Trustless Work escrow contract at every step.
5. Chat inside the trade room and, if needed, open a dispute. Dispute resolution by a SafeSwap moderator is P1 (Sprint 4); the ability to *open* a dispute is P0.
6. See a truthful history of their trades and current wallet state.

**Definition of "MVP done":** two users on different machines, one with Freighter and one with LOBSTR, independently create wallets, one posts a sell order for CRC via SINPE Móvil, the other takes it, they complete a full trade through the UI without the developer helping, and the transaction is auditable on Stellar Expert. All on testnet.

---

## 4. Personas

Only two trader roles exist in the product. Moderator is a staff role, off the primary user journey.

| Persona | Description | Primary jobs |
|---|---|---|
| **Seller (maker)** | Holds USDC, wants CRC. Posts an offer with price, payment methods, and limits. | Post order · fund escrow · confirm fiat receipt · release funds. |
| **Buyer (taker)** | Wants USDC, holds CRC. Picks an offer from the order book. | Accept order · pay off-chain (bank transfer / SINPE Móvil) · claim funds released from escrow. |
| **Moderator** (staff) | SafeSwap operator. Named in every escrow contract as `disputeResolver`. Not exposed in the main app. | Read chat + evidence · call `resolve-dispute` with a distribution. Dashboard ships in Sprint 4 (P1). |

---

## 5. MVP feature scope

Priorities: **P0 = must ship**, **P1 = should ship**, **P2 = nice to have, cut first**.

### 5.1 Accounts & identity — P0
- **Wallet-only auth.** Supported wallets: **Freighter** (browser extension) and **LOBSTR** (via WalletConnect from the LOBSTR mobile app). No email/password, no OAuth, no KYC.
- Wallet abstraction via **`@creit.tech/stellar-wallets-kit`** so callers stay wallet-agnostic and additional wallets can be enabled later without rewiring.
- Signed-nonce session: server issues a challenge, wallet signs, server returns an HttpOnly JWT cookie (30-day sliding TTL). All write endpoints are gated by this cookie.
- Persist a `users` row keyed by Stellar address, storing display name, `preferred_mode` (buy/sell), avatar seed, created_at, aggregate ops count, average rating.

### 5.2 Trader mode selection — P0
- Immediately after first wallet connect, the user is routed to `/onboarding/mode` and picks **Buy USDC** or **Sell USDC**. The choice is persisted on `users.preferred_mode`.
- Returning sessions land directly on `/p2p/orders?mode=<preferred>`.
- Mode can be flipped from the order-list header without going through onboarding again.
- Mode drives which order-list view is default (buyers see sell orders; sellers see their own listings plus the ability to create).

### 5.3 Order book (marketplace) — P0
- `POST /orders` — authenticated seller creates a **sell USDC** order with: price (CRC per USDC), limits (min/max CRC), total available (USDC), payment methods (multi-select from the fixed list below), auto-cancel window.
- Buyer-side "buy USDC" orders are supported by the schema but not exposed in the UI for MVP — buyers take existing sell orders. Ship post-MVP if demand appears.
- `GET /orders?mode=sell&fiat=CRC&paymentMethod=…` — paginated, sorted by best price.
- Order lifecycle: `open → in_trade → filled | cancelled | paused | expired`.
- One order can spawn multiple trades until `available` is depleted.
- Displays merchant reputation (rating, ops count, verified flag) inline.
- **Fixed enums** for MVP:
  - `fiat`: `CRC`
  - `payment_methods`: `bank_transfer_cr`, `sinpe_movil`

### 5.4 Trade flow — P0
Trade is created when a buyer takes a sell order and specifies an amount within order limits. USDC never moves peer-to-peer; every value transfer goes seller → escrow → buyer.

Server steps on trade creation:
1. Insert a `trades` row (status `pending_escrow`).
2. Reserve the amount on the parent order (`available -= amount`).
3. Return the trade to both parties; they are routed to `/trades/[id]`.

On-chain steps (existing UI, requires backend orchestration):
1. **Seller** calls `POST /api/escrow/single-release/v2/deploy` → signs XDR → escrow contract created.
2. **Seller** calls `.../fund` → signs → USDC locked in escrow. Trade → `funded`.
3. **Buyer** transfers CRC off-chain (bank transfer or SINPE Móvil), then hits "I've paid" with a payment reference → calls `.../change-milestone-status`. Trade → `fiat_sent`. *(This endpoint is missing today — see §7.)*
4. **Seller** verifies the incoming payment in their bank / SINPE app, hits "Confirm fiat received" → `.../approve-milestone`. Trade → `approved`.
5. **Release** — auto-fired immediately after approval (see §11) → USDC transferred from escrow to buyer's wallet. Trade → `released`. Order → `filled` if `available` reaches 0.

Every step persists the resulting `contractId`, `txHash`, and `ledger` on the trade row (no more `localStorage` roundtrip).

### 5.5 In-trade chat — P0
- Realtime 1-to-1 messages scoped to the trade.
- Message types: `text`, `payment_confirmation` (structured "I paid X via SINPE Móvil, ref: …"), `system` (auto messages for status changes and disputes).
- Storage: Supabase `messages` table + Supabase Realtime channel per trade (leveraging the already-installed `@supabase/supabase-js`).
- Retention: messages retained for at least 90 days after trade completion; permanent while a dispute is open.
- No image/file attachments in MVP. Text plus a receipt URL field is enough.

### 5.6 Dispute — P0 (raise) / P1 (resolve UI)
- **P0 (ships with the trade flow):** either party can open a dispute at any time between `funded` and `released`. Reason (max 500 chars) stored server-side on `trades.dispute_reason` (Trustless Work only accepts `contractId` + `signer`; reason lives with us). Trade → `disputed`, chat gets a system message, further chain actions are blocked. Resolver identity is the platform wallet baked into every escrow at deploy time.
- **P1 (Sprint 4):** moderator dashboard at `/admin/disputes` (behind an `ADMIN_WALLETS` env allowlist): list of open disputes, chat replay, evidence links, and a form that calls `.../resolve-dispute` with a `distributions` array totalling the escrow balance. Until this ships, `resolve-dispute` is invoked manually from the server.

### 5.7 Wallet screen — P1
- Show the **real** connected wallet balance (XLM + USDC trustline balance from Horizon).
- Show real recent activity: escrow deploys, funds, releases, disputes, resolved — sourced from `get-escrows-by-signer` (already wired for `/transactions`, refactor to share).
- Quick actions: copy address, view on Stellar Expert. **Deferred:** in-app send/receive.

### 5.8 Reputation — P1
- After a released trade both sides can rate (1–5) and leave a short comment.
- User's aggregate rating and ops count are refreshed on trade release.
- Displayed on order cards and profile popovers.

### 5.9 Notifications — P1
- In-app toast + a badge on the bottom nav for: new message, trade status change, dispute update.
- Email notification (via Resend) for the same events, opt-in, requires an email supplied at opt-in time (not at first connect).
- **Deferred:** push notifications, SMS.

### 5.10 Cut for MVP (explicit P2)
- Additional wallets (Albedo, xBull, Hana, WalletConnect for anything other than LOBSTR).
- Multi-asset (XLM, USDT, EURC).
- Additional countries or fiat currencies (USD, MXN, etc.).
- Payment methods other than bank transfer (CRC) and SINPE Móvil.
- Buy-side orders (buyer publishes a "wanted" listing) — supported by schema, hidden in UI.
- Multi-release escrows.
- Advanced fiat verification (bank-statement upload OCR, SINPE webhook, third-party payment confirmation).
- Fee dashboards / merchant analytics.
- Public REST/GraphQL API for third parties.
- i18n beyond English (some Spanish strings exist today; consolidate to English-only for MVP).
- Referral / affiliate system.

---

## 6. Non-functional requirements

| Area | Requirement |
|---|---|
| **Network** | Stellar **testnet** for MVP launch; mainnet gated behind a single env flag (`TW_NETWORK=mainnet` + wallet passphrase switch). Ship-to-mainnet is a fast-follow, not part of MVP acceptance. |
| **Performance** | Time-to-interactive on `/p2p/orders` < 2 s on 4G. Trade actions provide loading state within 200 ms of click. |
| **Availability** | Best-effort during MVP. No SLA. |
| **Security** | `TW_API_KEY` never exposed to client. Rotate leaked key already in `docs/issues/02-*`. All signed XDR flows verify wallet address matches session before submitting. Rate-limit order/trade/message creation per wallet. |
| **Privacy** | Store only wallet address + optional email + display name + avatar init. No PII from fiat rail. Chat encrypted at rest via Supabase managed encryption. |
| **Accessibility** | WCAG 2.1 AA for all core flows. Keyboard-navigable stepper, focus rings preserved. |
| **Mobile** | Layouts constrained to `max-w-md` already; test at 360×640 minimum. |
| **Observability** | Structured logs on every escrow endpoint (Trustless Work request/response, redacted). Client error reporting (Sentry or equivalent). |

---

## 7. Backend & data model (new work)

The Next.js app needs a persistence layer. **Decision:** Supabase (Postgres + Realtime) since the SDK is already installed. Auth is not Supabase Auth — it's a custom wallet-signed nonce flow (see below), because Freighter and LOBSTR are the only identity sources.

Minimum tables:

```
users (
  address text primary key,        -- G… Stellar public key
  display_name text,
  preferred_mode text check (preferred_mode in ('buy','sell')),
  email text unique,               -- optional, only set when opting into notifications
  avatar_seed text,
  verified boolean default false,
  ops_count int default 0,
  rating_avg numeric(3,2),
  created_at timestamptz default now()
)

orders (
  id uuid primary key,
  maker_address text references users(address),
  mode text check (mode in ('buy','sell')),      -- MVP UI only exposes 'sell'
  fiat text check (fiat = 'CRC'),                -- MVP: CRC only
  price numeric,                                 -- CRC per USDC
  available numeric,                             -- USDC remaining
  min_limit numeric,                             -- CRC
  max_limit numeric,                             -- CRC
  payment_methods text[]
    check (payment_methods <@ ARRAY['bank_transfer_cr','sinpe_movil']),
  window_minutes int,
  status text check (status in ('open','paused','filled','cancelled','expired')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
)

trades (
  id uuid primary key,
  order_id uuid references orders(id),
  buyer_address text references users(address),
  seller_address text references users(address),
  amount_usdc numeric,
  amount_fiat numeric,             -- CRC, derived at creation from order.price
  payment_method text
    check (payment_method in ('bank_transfer_cr','sinpe_movil')),
  payment_reference text,          -- buyer-supplied reference on "I've paid"
  contract_id text,                -- Stellar C… once deployed
  status text,                     -- pending_escrow | funded | fiat_sent | approved | released | disputed | resolved | cancelled
  tx_hashes jsonb,                 -- {deploy, fund, milestone, approve, release, dispute, resolve}
  dispute_reason text,
  created_at timestamptz,
  updated_at timestamptz
)

messages (
  id uuid primary key,
  trade_id uuid references trades(id),
  author_address text,
  kind text,                       -- text | payment_confirmation | system
  body jsonb,
  created_at timestamptz default now()
)

ratings (
  id uuid primary key,
  trade_id uuid references trades(id),
  rater_address text,
  ratee_address text,
  score int check (score between 1 and 5),
  comment text,
  created_at timestamptz default now(),
  unique (trade_id, rater_address)
)
```

RLS: enabled on every table. Anyone can read `orders`; only the maker can mutate. Only trade participants can read that trade + its messages + related ratings. Writes on `trades`, `messages`, `ratings` require an authenticated session (see below).

New/changed API routes:

- `POST /api/auth/nonce`, `POST /api/auth/verify`, `POST /api/auth/logout` — wallet-nonce session flow (works with both Freighter and LOBSTR signatures).
- `POST /api/orders`, `GET /api/orders`, `PATCH /api/orders/:id` (cancel/pause).
- `POST /api/trades` (creates trade + reserves order capacity), `GET /api/trades/:id`, `GET /api/trades?address=…`.
- `POST /api/trades/:id/messages`, `GET /api/trades/:id/messages` (backed by Supabase Realtime for live updates).
- `POST /api/escrow/single-release/v2/change-milestone-status` — **missing, must be added** for the buyer's "I've paid" step.
- `POST /api/escrow/single-release/v2/resolve-dispute` — **missing, must be added** for moderator resolution.
- `POST /api/escrow/single-release/v2/update` — expose the update flow if we keep the admin editor page.

Auth model: **wallet-signed nonce → HttpOnly JWT cookie**. Server issues a short-lived challenge, the connected wallet (Freighter or LOBSTR via `@creit.tech/stellar-wallets-kit`) signs it, the server verifies and returns a 30-day sliding cookie used for all writes.

---

## 8. User flows (happy path)

### 8.1 Seller onboards + posts an offer
1. Open the app, tap "Connect wallet", pick **Freighter** or **LOBSTR** in the wallet picker, complete the connect flow.
2. Sign the auth nonce → session cookie set.
3. First-time: `/onboarding/mode` → pick **Sell USDC** → saved as `preferred_mode`.
4. Tap "Create order" → set price (CRC per USDC), limits (min/max CRC), total available (USDC), payment methods (bank transfer, SINPE Móvil, or both), window (minutes).
5. Order appears in `/p2p/orders` for buyers.

### 8.2 Buyer takes an offer (full trade)
1. Connect (Freighter or LOBSTR) → sign nonce → pick **Buy USDC** in onboarding.
2. Browse `/p2p/orders?mode=sell&fiat=CRC`, filter by SINPE Móvil or bank transfer, open order detail, enter CRC amount.
3. Tap "Buy USDC" → trade row created (`pending_escrow`), both parties routed to `/trades/[id]`.
4. Seller sees "Deploy escrow" → signs → "Fund escrow" → signs → USDC locked in the escrow contract. Trade → *Funded*.
5. Buyer transfers CRC via SINPE Móvil (or bank transfer) using the payment reference shown in chat, then taps "I've paid" and enters the reference → signs `change-milestone-status`. Trade → *Fiat sent*.
6. Seller verifies the incoming payment in their bank / SINPE app, taps "Confirm fiat received" → signs `approve-milestone`. Trade → *Approved*.
7. Release auto-fires → USDC transferred from escrow to buyer's wallet. Trade → *Released*, both parties can rate.

### 8.3 Dispute path
1. Any point between *Funded* and *Released*, either side taps "Open dispute" → signs `dispute-escrow`, reason stored server-side.
2. Trade → *Disputed*, chat gets a system message, further chain actions are blocked.
3. **P0:** moderator resolves manually via API (`resolve-dispute`) using the platform wallet.
4. **P1 (Sprint 4):** moderator opens `/admin/disputes`, reviews chat + evidence, submits a `distributions` payload via `resolve-dispute`. Trade → *Resolved*.

---

## 9. Success metrics

| Metric | Target for MVP acceptance |
|---|---|
| End-to-end trades completed on testnet by non-team users | ≥ 25 in the first 4 weeks. |
| Average trade completion time (from take → release) | < 15 minutes (fiat rails permitting). |
| Trades ending in dispute | < 10 %. |
| Dispute resolution median time | < 24 h. |
| Time-to-first-interaction on `/p2p/orders` | < 2 s p75. |
| Uncaught client errors / session | < 0.5 %. |

---

## 10. Milestones (sprint plan)

Four 2-week sprints, ≈8 weeks total for **2 FE + 1 BE + 1 shared PM/designer**. Sprint-by-sprint acceptance criteria live in [`EXECUTION-PLAN.md`](./EXECUTION-PLAN.md).

**Sprint 1 — Foundations (Weeks 1–2)**
- Multi-wallet connect (Freighter + LOBSTR via `@creit.tech/stellar-wallets-kit`).
- Wallet-nonce auth + JWT cookie.
- Trader mode selection screen + persistence.
- Supabase schema, migrations, RLS, seed script.
- Rotate leaked `TW_API_KEY`, add Sentry, structured logs skeleton.

**Sprint 2 — Orders marketplace (Weeks 3–4)**
- Order CRUD API + create-order form + wire `/p2p/orders` and `/p2p/orders/[id]` to the DB.
- Filters: fiat (`CRC`), payment method (`bank_transfer_cr`, `sinpe_movil`).
- Live best-price banner; maker cancel / pause.
- Rate limits on order endpoints.

**Sprint 3 — Trade + chat end-to-end (Weeks 5–6)**
- `POST /api/trades`, `GET /api/trades/:id`; persisted `contractId` (drop `localStorage`).
- Implement `change-milestone-status` + buyer "I've paid" button.
- Auto-cancel on `window_minutes` timeout.
- Realtime chat via Supabase; system messages on status transitions.
- Dispute reason persisted + `resolve-dispute` route (moderator uses it manually via API this sprint).

**Sprint 4 — Polish, reputation, moderator, launch (Weeks 7–8)**
- Wallet screen wired to real Horizon balances + shared activity feed.
- Post-release rating flow + reputation on order cards.
- `/admin/disputes` moderator dashboard behind `ADMIN_WALLETS` allowlist.
- In-app toasts + badge; email opt-in via Resend.
- E2E happy-path + dispute-path tests; docs refreshed; testnet public beta.

---

## 11. Open questions

Decisions locked since the first PRD draft:
- **Wallets:** Freighter + LOBSTR only, via `@creit.tech/stellar-wallets-kit`.
- **Auth:** wallet-signed nonce → JWT cookie. No email/password.
- **Fiat scope:** CRC only; methods `bank_transfer_cr` and `sinpe_movil`.
- **Order direction in UI:** sellers post; buyers take. Buy-side listings deferred.
- **Language:** English only for MVP.
- **Order cancellation timeout:** 15 minutes if not funded (auto-cancels, releases order capacity).

Still open (need answers before Sprint 3):
1. **Fiat verification depth.** Beyond the buyer's "I've paid" click + payment reference, do we require anything else (receipt URL, screenshot upload)? MVP assumption: reference string only.
2. **Auto-release vs manual.** After `approve-milestone`, auto-fire `release-funds` or make the seller click again? Recommendation: auto-fire.
3. **Fee model.** `platformFee` on every escrow — percentage, and which wallet receives it on testnet vs mainnet?
4. **Email collection.** Ask at first connect or only when opting into notifications? Recommendation: only when opting in.
5. **Moderator staffing + SLA.** Who's on the dispute rota, and what resolution time do we publish?
6. **Mainnet cutover criteria.** What testnet volume / stability bar promotes us to mainnet?

---

## 12. References

- Companion execution plan: [`EXECUTION-PLAN.md`](./EXECUTION-PLAN.md)
- Existing integration notes: `p2p-safe-swap/docs/trustless-work-integration.md`
- Issue tracker (per-endpoint work already scoped): `p2p-safe-swap/docs/issues/01-*` … `13-*`
- Trustless Work API docs: https://docs.trustlesswork.com/trustless-work/api-rest/introduction
- Freighter API: https://docs.freighter.app/
- LOBSTR (WalletConnect for Stellar): https://lobstr.co/protocols
- Stellar Wallets Kit: https://stellarwalletskit.dev/
- Stellar Horizon (testnet): https://horizon-testnet.stellar.org
