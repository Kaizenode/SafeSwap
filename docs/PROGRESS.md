# SafeSwap MVP — Progress Tracker

**Purpose:** single source of truth for ticket status across all sprints. Update this file whenever a ticket moves state.

**How to use:** see [`guidelines/CLAUDE_WORKFLOW.md`](./guidelines/CLAUDE_WORKFLOW.md) for the exact update discipline.

**Status legend:** ⬜ planned · 🟨 in progress · 🔵 in review · ⏸ blocked · ✅ done · 🚫 cancelled

**Reading the table:**
- **#** — doc-internal ticket id (from `SPRINT-N-ISSUES.md`). Stable across GH renumbering.
- **PR** — link to the pull request once opened.
- **Owner** — who is actively working on it (GitHub handle).
- **Notes** — one-line summary of state or blocker; longer context goes in the PR / issue.

---

## Sprint 1 — Foundations (#1–#14)

**Sprint status:** ⬜ planned
**Started:** —  ·  **Ended:** —
**Ref:** [`SPRINT-1-ISSUES.md`](./SPRINT-1-ISSUES.md)

| # | Title | Status | Owner | PR | Notes |
|---|---|---|---|---|---|
| 1 | Adopt `stellar-wallets-kit`, replace `freighter-api` | ⬜ | — | — | — |
| 2 | Wallet picker modal (Freighter + LOBSTR) | ⬜ | — | — | — |
| 3 | `POST /api/auth/{nonce,verify,logout}` endpoints | ⬜ | — | — | — |
| 4 | Auth middleware + `getSession()` helper | ⬜ | — | — | — |
| 5 | Wire wallet connect → sign nonce → set session | ⬜ | — | — | — |
| 6 | `/onboarding/mode` page + redirect logic | ⬜ | — | — | — |
| 7 | Mode switcher in order-list header | ⬜ | — | — | — |
| 8 | Bootstrap Supabase project + client wrappers | 🔵 | @Yinklekay | [#376](https://github.com/Kaizenode/SafeSwap/pull/376) | Opened PR |
| 9 | Migration: initial schema (5 tables) | ⬜ | — | — | — |
| 10 | Migration: RLS policies | ⬜ | — | — | — |
| 11 | Seed script for local dev | ⬜ | — | — | — |
| 12 | Rotate leaked `TW_API_KEY` + scrub secrets | ⬜ | — | — | — |
| 13 | Add Sentry (client + server) | ⬜ | — | — | — |
| 14 | Structured logging skeleton (pino) | ⬜ | — | — | — |

**Sprint 1 exit criteria:** see checklist in [`SPRINT-1-ISSUES.md`](./SPRINT-1-ISSUES.md#sprint-1-exit-checklist).

---

## Sprint 2 — Orders marketplace (#15–#24)

**Sprint status:** ⬜ planned
**Started:** —  ·  **Ended:** —
**Ref:** [`SPRINT-2-ISSUES.md`](./SPRINT-2-ISSUES.md)

| # | Title | Status | Owner | PR | Notes |
|---|---|---|---|---|---|
| 15 | Zod schemas + shared validation helpers | ⬜ | — | — | — |
| 16 | `POST /api/orders` (create sell order) | ⬜ | — | — | — |
| 17 | `GET /api/orders` (list + filters + pagination) | ⬜ | — | — | — |
| 18 | `PATCH /api/orders/:id` + `GET /api/orders/mine` | ⬜ | — | — | — |
| 19 | Rate limits on order write endpoints | ⬜ | — | — | — |
| 20 | Create-order form (seller) | ⬜ | — | — | — |
| 21 | Rewire `/p2p/orders` list to real API | ⬜ | — | — | — |
| 22 | Rewire `/p2p/orders/[id]` detail to real API | ⬜ | — | — | — |
| 23 | "My orders" view for sellers | ⬜ | — | — | — |
| 24 | Mode filter integration + polish | ⬜ | — | — | — |

**Sprint 2 exit criteria:** see checklist in [`SPRINT-2-ISSUES.md`](./SPRINT-2-ISSUES.md#sprint-2-exit-checklist).

---

## Sprint 3 — Trade + chat end-to-end

**Sprint status:** ⬜ planned  ·  **Tickets not yet broken down.**
Sprint scope: see [`EXECUTION-PLAN.md` §3](./EXECUTION-PLAN.md#sprint-3--trade--chat-end-to-end-weeks-56).

When ready, create `SPRINT-3-ISSUES.md` and add a status table here in the same shape.

---

## Sprint 4 — Polish, reputation, moderator, launch

**Sprint status:** ⬜ planned  ·  **Tickets not yet broken down.**
Sprint scope: see [`EXECUTION-PLAN.md` §3](./EXECUTION-PLAN.md#sprint-4--polish-reputation-moderator-launch-weeks-78).

When ready, create `SPRINT-4-ISSUES.md` and add a status table here in the same shape.

---

## Cross-sprint aggregate

| Sprint | Total | ⬜ | 🟨 | 🔵 | ⏸ | ✅ | 🚫 |
|---|---|---|---|---|---|---|---|
| 1 | 14 | 13 | 0 | 1 | 0 | 0 | 0 |
| 2 | 10 | 10 | 0 | 0 | 0 | 0 | 0 |
| 3 | — | — | — | — | — | — | — |
| 4 | — | — | — | — | — | — | — |

Update this aggregate row when you change any ticket status.

---

## Blockers log

Append here when a ticket moves to ⏸. Include: date, ticket #, blocker summary, who to unblock. Remove when resolved.

_(none)_

---

## Change log

Append a bullet whenever a ticket flips to ✅ or 🚫. Format:
`- YYYY-MM-DD · #N · Title · @owner · PR #123 · one-line outcome`

_(no completed tickets yet)_
