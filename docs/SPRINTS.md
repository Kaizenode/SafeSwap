# SafeSwap MVP — Sprint Tracker

Central index for the 4-sprint MVP plan. Full sprint definitions live in [`EXECUTION-PLAN.md`](./EXECUTION-PLAN.md) §3; per-ticket detail lives in each sprint's issues doc.

**Live ticket status:** [`PROGRESS.md`](./PROGRESS.md)
**Team workflow:** [`guidelines/CLAUDE_WORKFLOW.md`](./guidelines/CLAUDE_WORKFLOW.md)

**Status legend:** ⬜ planned · 🟨 in progress · ✅ done · ⏸ paused

---

## Overview

| # | Sprint | Goal | Tickets | Doc | Status | Started | Ended |
|---|---|---|---|---|---|---|---|
| 1 | Foundations | Signed-in user with a mode preference lives in a real DB, on Freighter and LOBSTR. | #1–#14 | [SPRINT-1-ISSUES.md](./SPRINT-1-ISSUES.md) | ⬜ planned | — | — |
| 2 | Orders marketplace | Real orders replace all mocks. Sellers create, buyers browse with filters + pagination. | #15–#24 | [SPRINT-2-ISSUES.md](./SPRINT-2-ISSUES.md) | ⬜ planned | — | — |
| 3 | Trade + chat end-to-end | Two users complete a full trade unattended: persisted trade rows, buyer "I've paid", realtime chat, dispute reason. | not broken down | see [EXECUTION-PLAN.md §3](./EXECUTION-PLAN.md#sprint-3--trade--chat-end-to-end-weeks-56) | ⬜ planned | — | — |
| 4 | Polish, reputation, moderator, launch | Testnet public beta: real wallet screen, ratings, moderator dashboard, notifications, E2E tests. | not broken down | see [EXECUTION-PLAN.md §3](./EXECUTION-PLAN.md#sprint-4--polish-reputation-moderator-launch-weeks-78) | ⬜ planned | — | — |

---

## How to use this file

- **When a sprint starts:** flip its Status to 🟨, fill in Started (YYYY-MM-DD).
- **When it ends:** flip to ✅, fill in Ended.
- **When Sprints 3 & 4 get broken down:** create `SPRINT-3-ISSUES.md` / `SPRINT-4-ISSUES.md` and swap the "not broken down" note for the ticket range + doc link.
- **When tickets get filed in GitHub:** the numbers here (#1–#24) are the doc-internal IDs — the corresponding GitHub issue numbers won't match. Keep the doc IDs as the stable reference and add the GH link inside each ticket's description if you need round-tripping.

---

## Sprint-by-sprint snapshot

### Sprint 1 — Foundations · #1–#14
Wallet kit (Freighter + LOBSTR), nonce auth + JWT cookie, mode-selection screen, Supabase schema + RLS + seed, leaked API key rotation, Sentry, structured logging.
**Blocks:** everything after — no user session, no DB.

### Sprint 2 — Orders marketplace · #15–#24
Zod validation baseline, `POST/GET/PATCH /api/orders`, create-order form, rewire `/p2p/orders` and `/p2p/orders/[id]` off mocks, "My orders" view for sellers, filter chips, rate limits.
**Blocks:** Sprint 3 — trades need real orders to attach to.

### Sprint 3 — Trade + chat end-to-end · TBD
`POST/GET /api/trades`, drop `localStorage` for `contract_id`, implement missing `change-milestone-status` + `resolve-dispute` routes, buyer "I've paid" button, auto-cancel on `window_minutes`, Supabase Realtime chat, system messages on status transitions, dispute reason persisted.
**Blocks:** Sprint 4 — nothing to rate or resolve without completed trades.

### Sprint 4 — Polish, reputation, moderator, launch · TBD
Wallet screen wired to Horizon balances, post-release rating flow + reputation surfacing, `/admin/disputes` moderator dashboard behind wallet allowlist, in-app toasts + badge, opt-in email via Resend, Playwright E2E for happy + dispute paths, docs refresh, testnet public beta.

---

## Cross-sprint reference

- Product scope: [`PRD-MVP.md`](./PRD-MVP.md)
- Feature-by-feature have/missing map: [`EXECUTION-PLAN.md`](./EXECUTION-PLAN.md) §2 (F1–F12)
- Existing Trustless Work integration notes: [`../p2p-safe-swap/docs/trustless-work-integration.md`](../p2p-safe-swap/docs/trustless-work-integration.md)
- Pre-existing per-endpoint issue drafts: [`../p2p-safe-swap/docs/issues/`](../p2p-safe-swap/docs/issues/)
