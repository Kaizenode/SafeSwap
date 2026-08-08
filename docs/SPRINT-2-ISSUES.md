# Sprint 2 — GitHub Issues

**Sprint:** 2 — Orders marketplace (Weeks 3–4)
**Companion docs:** [`PRD-MVP.md`](./PRD-MVP.md) · [`EXECUTION-PLAN.md`](./EXECUTION-PLAN.md) · [`SPRINT-1-ISSUES.md`](./SPRINT-1-ISSUES.md)
**Sprint goal:** kill every mock on the order screens. Sellers create real orders in Supabase; buyers browse the live list with filters, pagination, and empty states. Rate limits protect write endpoints.

Ticket numbering continues from Sprint 1 (#15+). Each item is one PR / one issue. Sizes are rough dev-days.

**Suggested labels:** `sprint-2` on all, plus one of `area:api`, `area:orders`, `area:validation`, `area:ops`.

---

## Dependency graph (short version)

```
#15 zod schemas ──▶ #16 POST /orders ──▶ #17 GET /orders ──▶ #18 PATCH + GET /mine
                       │                       │
                       └────────────▶ #19 rate limits
                                              ▼
#20 create-order form ──▶ #21 rewire list ──▶ #22 rewire detail
                                              │
                                              ├──▶ #23 my-orders view
                                              └──▶ #24 mode filter + polish
```

Sprint 1 dependencies inherited: #4 (auth middleware), #6 (preferred_mode set), #8–#11 (Supabase + schema + RLS + seed).

---

## Backend / API (F5)

### Issue #15 — Zod schemas + shared validation helpers
**Labels:** `sprint-2`, `area:validation`
**Size:** 1 d
**Depends on:** —

**Context.** Every API route added this sprint will need input validation and a consistent 400-response shape. Introducing Zod once here avoids each route rolling its own.

**Scope.**
- Add `zod` to `p2p-safe-swap/package.json`.
- `lib/validation/schemas.ts` with shared shapes: `stellarAddress` (`G` + 55 chars), `usdcAmount` (`z.number().positive().finite()`), `crcAmount`, `paymentMethod` (`z.enum(["bank_transfer_cr","sinpe_movil"])`), `orderStatus`, etc.
- `lib/validation/parseRequest.ts` helper: `parseJson(request, schema)` returning `{ data }` or throwing a typed `ValidationError` that the shared error middleware turns into a `400 { error, issues }` response.
- Backfill the existing escrow API routes (`/api/escrow/**`) to use this helper — reduces future drift.

**Acceptance.**
- Sending an invalid body to any escrow route returns a JSON error with `issues` array (Zod issue format), status 400.
- Escrow happy paths still work end-to-end on testnet.

---

### Issue #16 — `POST /api/orders` (create sell order)
**Labels:** `sprint-2`, `area:api`, `area:orders`
**Size:** 1 d
**Depends on:** #15, Sprint 1 #4 (auth middleware), Sprint 1 #10 (RLS)

**Context.** Sellers publish sell orders. Buyer-side "buy USDC" listings are supported by the schema but the UI stays seller-only for MVP.

**Scope.**
- Route: `app/api/orders/route.ts` — `POST` handler.
- Requires session cookie (`requireSession`). Sets `maker_address = session.address`.
- Zod schema: `mode='sell'` (only), `fiat='CRC'` (only), `price > 0`, `available > 0`, `min_limit <= max_limit <= available * price`, `payment_methods` non-empty subset of the two allowed values, `window_minutes` in `[5, 120]`.
- Inserts `status='open'` and returns the created row.
- Rejects if the same maker already has 10 open orders (soft cap for MVP).

**Acceptance.**
- Authenticated seller can create an order; response is the persisted row with a UUID id.
- 401 without a session cookie.
- 400 on any validation failure with a helpful `issues` payload.
- Maker cap enforced (11th open order → 429 or 400 with a clear message).

---

### Issue #17 — `GET /api/orders` (list with filters, sort, pagination)
**Labels:** `sprint-2`, `area:api`, `area:orders`
**Size:** 1.5 d
**Depends on:** #16

**Context.** Buyers browse the marketplace. Needs to be publicly readable (RLS already allows it) and to support the filter chips in #24.

**Scope.**
- `GET` handler on `app/api/orders/route.ts`.
- Query params: `mode` (default `sell`), `fiat` (default `CRC`), `paymentMethod` (optional single value from the enum), `page` (default 1), `pageSize` (default 20, max 50).
- Default sort: `status='open'` first, then `price ASC` (best price for buyers first).
- Response shape: `{ orders: Order[], page, pageSize, hasNextPage }`.
- Join maker's `display_name`, `rating_avg`, `ops_count`, `verified` into the response (or expose a nested `maker` object).

**Acceptance.**
- Anonymous request works (no session cookie needed).
- Filter by `paymentMethod=sinpe_movil` only returns orders whose `payment_methods` array contains it.
- Pagination is consistent (no duplicates across pages under stable data).
- Response includes maker reputation fields even if 0 / null.

---

### Issue #18 — `PATCH /api/orders/:id` + `GET /api/orders/mine`
**Labels:** `sprint-2`, `area:api`, `area:orders`
**Size:** 1 d
**Depends on:** #16

**Context.** Makers need to pause, resume, or cancel their own orders, and to view a "my orders" list distinct from the public browse.

**Scope.**
- `PATCH /api/orders/:id` — accepts `{ status: 'paused' | 'open' | 'cancelled' }`. Only the maker can call (RLS enforces; API also checks defensively). Cannot cancel an order with an open trade in flight (block if any child `trades` row exists in a non-terminal state — join-check).
- `GET /api/orders/mine` — returns the caller's orders regardless of status, sorted by `created_at desc`. Requires session.

**Acceptance.**
- Maker can pause and resume their own order; a non-maker gets 403.
- Cancelling an order with an in-flight trade returns a clear 409.
- `/api/orders/mine` returns exactly the caller's orders.

---

### Issue #19 — Rate limits on order write endpoints (F12)
**Labels:** `sprint-2`, `area:ops`
**Size:** 1 d
**Depends on:** #16

**Context.** Without limits, one wallet could flood the marketplace with junk orders. This ticket sets the limiting pattern the rest of the app will follow in Sprints 3 and 4.

**Scope.**
- Add Upstash Redis (or an in-process LRU as a fallback for local dev) via `@upstash/ratelimit`.
- `lib/rate-limit.ts` exposing `limitBy(key, { window, max })` returning `{ ok, retryAfter }`.
- Apply to:
  - `POST /api/orders` — 10 per hour per address.
  - `PATCH /api/orders/:id` — 30 per hour per address.
- 429 response includes `Retry-After` header.
- Add `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` to `.env.example`; make Upstash optional in dev (fallback to in-memory).

**Acceptance.**
- Load-testing 11 order creations from one wallet in an hour returns 429 on the 11th.
- Local dev without Upstash env vars still works (in-memory fallback).

---

## Frontend (F5)

### Issue #20 — Create-order form (seller)
**Labels:** `sprint-2`, `area:orders`
**Size:** 1.5 d
**Depends on:** #16

**Context.** Sellers need a UI to submit orders. Modal is fine for MVP; a dedicated route is overkill.

**Scope.**
- New modal component `frontend/components/orders/CreateOrderModal.tsx`.
- Fields: price (CRC per USDC), total available (USDC), min/max limit (CRC), payment methods (checkbox group: Bank transfer, SINPE Móvil), window minutes (default 15).
- Client-side validation mirrors the Zod schema (min/max relationship, positive numbers).
- Submit → `POST /api/orders` → on success close modal and trigger a refetch of the order list.
- Entry point: a "New order" floating button on `/p2p/orders` visible only when `preferred_mode === 'sell'` (or when the seller mode toggle is active — see #24).

**Acceptance.**
- Modal opens, validates, submits.
- New order appears in the list within 500 ms of success.
- Submission errors surface inline; the modal stays open with values intact.

---

### Issue #21 — Rewire `/p2p/orders` list page to real API
**Labels:** `sprint-2`, `area:orders`
**Size:** 2 d
**Depends on:** #17

**Context.** Today `app/p2p/orders/page.tsx` reads a hard-coded `MOCK_ORDERS` const. This is the biggest single delete in the sprint.

**Scope.**
- Delete `MOCK_ORDERS` and the `BEST_PRICE` constant.
- Introduce a `useOrders(filters, page)` hook that fetches from `GET /api/orders` (SWR-style: initial fetch + `mutate` after create/cancel).
- Recompute the best-price banner from the top item in the current list (or return it from the API — pick one and document).
- Preserve the existing escrow-deploy path — after taking a sell order the flow into `deployEscrow` still works. (Actual "take order" → create-trade flow is Sprint 3; for now the take button can still do the client-side escrow deploy as a placeholder or be disabled with a "Coming soon" tooltip.)
- Empty state: friendly message + CTA that opens the create-order modal (sellers) or explains no listings yet (buyers).
- Loading skeletons for the initial fetch.

**Acceptance.**
- No hard-coded orders remain in the file.
- Refreshing the page after creating an order shows it.
- Empty state renders when the API returns no rows.

---

### Issue #22 — Rewire `/p2p/orders/[id]` detail page to real API
**Labels:** `sprint-2`, `area:orders`
**Size:** 1 d
**Depends on:** #17

**Context.** Detail page has its own duplicate `MOCK_ORDERS` and always renders the first entry. Fetch by id instead.

**Scope.**
- Add `GET /api/orders/:id` (single order lookup; public read).
- Server-fetch the order in the page component (or client-fetch — pick one; server-fetch is nicer for SEO/perf but requires the auth helper to work in RSC context).
- 404 UI when the order doesn't exist or is cancelled.
- Delete the local `MOCK_ORDERS` const.

**Acceptance.**
- `/p2p/orders/<real-uuid>` renders that specific order.
- `/p2p/orders/does-not-exist` renders a 404 state.

---

### Issue #23 — "My orders" view for sellers
**Labels:** `sprint-2`, `area:orders`
**Size:** 1 d
**Depends on:** #18, #21

**Context.** Sellers need to see and manage their own orders. Adds a second view alongside the public browse.

**Scope.**
- New tab or route (`/p2p/orders?view=mine` or `/p2p/my-orders` — pick one) fetching from `GET /api/orders/mine`.
- Per-row actions: **Pause / Resume** and **Cancel** (with confirmation dialog).
- Status pill on each row (`open`, `paused`, `filled`, `cancelled`, `expired`).
- Visible only when `preferred_mode === 'sell'`.

**Acceptance.**
- Seller sees their own orders in all statuses.
- Pause → row updates without refresh; Cancel requires confirmation and greys the row.
- Non-sellers never see this view.

---

### Issue #24 — Mode filter integration + polish
**Labels:** `sprint-2`, `area:orders`
**Size:** 1 d
**Depends on:** #21, #23

**Context.** The mode toggle from Sprint 1 (#7) currently only flips a URL param. Wire it to the real fetch: buyers see open sell orders, sellers see their own listings by default with a tab back to the public marketplace.

**Scope.**
- Filter chips at the top of `/p2p/orders`: **All** · **Bank transfer** · **SINPE Móvil** — toggling updates the `paymentMethod` query and refetches.
- Sort dropdown: best price (default) · newest.
- Sellers landing on `/p2p/orders` default to the "My orders" view (#23) with a tab to switch to "Browse".
- Buyers land on the browse view directly.
- Remove any remaining Spanish strings on this screen (align with English-only decision).

**Acceptance.**
- Selecting a payment method chip triggers exactly one fetch and updates the list.
- Sort change flips price ascending / descending as expected.
- Sellers see "My orders" first; buyers see "Browse" first.

---

## Sprint 2 exit checklist

Before calling Sprint 2 done:

- [ ] `app/p2p/orders/page.tsx` and `app/p2p/orders/[id]/page.tsx` contain zero mock data (#21, #22).
- [ ] A seller on device A creates an order and a buyer on device B sees it, filtered by SINPE Móvil (#16, #17, #20, #24).
- [ ] The seller can pause and cancel their own order; a buyer cannot (#18, #23).
- [ ] `POST /api/orders` returns 429 after the configured burst (#19).
- [ ] Every order-related API route validates its input with Zod and returns a structured 400 on bad data (#15, #16–#18).
- [ ] Best-price banner reflects the live top order, not a constant (#21).
- [ ] Empty state and pagination both render (#21).

**Cut lines if the sprint slips:** #24 (sort dropdown + Spanish cleanup) → Sprint 4 polish. #19 (rate limits) → moved to Sprint 3. Everything else is required for the Sprint 3 trade flow to have real orders to attach to.

**Deferred out of Sprint 2 (already flagged in `EXECUTION-PLAN.md`):**
- Buyer-side "wanted" listings (schema supports, UI hidden).
- Take-order → create-trade flow → Sprint 3.
- Chat, trade lifecycle, dispute → Sprint 3.
