# SafeSwap MVP â€” Progress Tracker

**Purpose:** single source of truth for ticket status across all sprints. Update this file whenever a ticket moves state.

**How to use:** see [`guidelines/CLAUDE_WORKFLOW.md`](./guidelines/CLAUDE_WORKFLOW.md) for the exact update discipline.

**Status legend:** â¬œ planned Â· ðŸŸ¨ in progress Â· ðŸ”µ in review Â· â¸ blocked Â· âœ… done Â· ðŸš« cancelled

**Reading the table:**
- **#** â€” doc-internal ticket id (from `SPRINT-N-ISSUES.md`). Stable across GH renumbering.
- **PR** â€” link to the pull request once opened.
- **Owner** â€” who is actively working on it (GitHub handle).
- **Notes** â€” one-line summary of state or blocker; longer context goes in the PR / issue.

---

## Sprint 1 â€” Foundations (#1â€“#14)

**Sprint status:** â¬œ planned
**Started:** â€”  Â·  **Ended:** â€”
**Ref:** [`SPRINT-1-ISSUES.md`](./SPRINT-1-ISSUES.md)

| # | Title | Status | Owner | PR | Notes |
|---|---|---|---|---|---|
| 1 | Adopt `stellar-wallets-kit`, replace `freighter-api` | â¬œ | â€” | â€” | â€” |
| 2 | Wallet picker modal (Freighter + LOBSTR) | â¬œ | â€” | â€” | â€” |
| 3 | `POST /api/auth/{nonce,verify,logout}` endpoints | â¬œ | â€” | â€” | â€” |
| 4 | Auth middleware + `getSession()` helper | â¬œ | â€” | â€” | â€” |
| 5 | Wire wallet connect â†’ sign nonce â†’ set session | â¬œ | â€” | â€” | â€” |
| 6 | `/onboarding/mode` page + redirect logic | â¬œ | â€” | â€” | â€” |
| 7 | Mode switcher in order-list header | â¬œ | â€” | â€” | â€” |
| 8 | Bootstrap Supabase project + client wrappers | â¬œ | â€” | â€” | â€” |
| 9 | Migration: initial schema (5 tables) | â¬œ | â€” | â€” | â€” |
| 10 | Migration: RLS policies | â¬œ | â€” | â€” | â€” |
| 11 | Seed script for local dev | â¬œ | â€” | â€” | â€” |
| 12 | Rotate leaked `TW_API_KEY` + scrub secrets | â¬œ | â€” | â€” | â€” |
| 13 | Add Sentry (client + server) | â¬œ | â€” | â€” | â€” |
| 14 | Structured logging skeleton (pino) | â¬œ | â€” | â€” | â€” |

**Sprint 1 exit criteria:** see checklist in [`SPRINT-1-ISSUES.md`](./SPRINT-1-ISSUES.md#sprint-1-exit-checklist).

---

## Sprint 2 â€” Orders marketplace (#15â€“#24)

**Sprint status:** â¬œ planned
**Started:** â€”  Â·  **Ended:** â€”
**Ref:** [`SPRINT-2-ISSUES.md`](./SPRINT-2-ISSUES.md)

| # | Title | Status | Owner | PR | Notes |
|---|---|---|---|---|---|
| 15 | Zod schemas + shared validation helpers | â¬œ | â€” | â€” | â€” |
| 16 | `POST /api/orders` (create sell order) | â¬œ | â€” | â€” | â€” |
| 17 | `GET /api/orders` (list + filters + pagination) | â¬œ | â€” | â€” | â€” |
| 18 | `PATCH /api/orders/:id` + `GET /api/orders/mine` | â¬œ | â€” | â€” | â€” |
| 19 | Rate limits on order write endpoints | â¬œ | â€” | â€” | â€” |
| 20 | Create-order form (seller) | â¬œ | â€” | â€” | â€” |
| 21 | Rewire `/p2p/orders` list to real API | â¬œ | â€” | â€” | â€” |
| 22 | Rewire `/p2p/orders/[id]` detail to real API | â¬œ | â€” | â€” | â€” |
| 23 | "My orders" view for sellers | â¬œ | â€” | â€” | â€” |
| 24 | Mode filter integration + polish | â¬œ | â€” | â€” | â€” |

**Sprint 2 exit criteria:** see checklist in [`SPRINT-2-ISSUES.md`](./SPRINT-2-ISSUES.md#sprint-2-exit-checklist).

---

## Sprint 3 â€” Trade + chat end-to-end

**Sprint status:** â¬œ planned  Â·  **Tickets not yet broken down.**
Sprint scope: see [`EXECUTION-PLAN.md` Â§3](./EXECUTION-PLAN.md#sprint-3--trade--chat-end-to-end-weeks-56).

When ready, create `SPRINT-3-ISSUES.md` and add a status table here in the same shape.

---

## Sprint 4 â€” Polish, reputation, moderator, launch

**Sprint status:** â¬œ planned  Â·  **Tickets not yet broken down.**
Sprint scope: see [`EXECUTION-PLAN.md` Â§3](./EXECUTION-PLAN.md#sprint-4--polish-reputation-moderator-launch-weeks-78).

When ready, create `SPRINT-4-ISSUES.md` and add a status table here in the same shape.

---

## Cross-sprint aggregate

| Sprint | Total | â¬œ | ðŸŸ¨ | ðŸ”µ | â¸ | âœ… | ðŸš« |
|---|---|---|---|---|---|---|---|
| 1 | 14 | 13 | 1 | 0 | 0 | 0 | 0 |
| 2 | 10 | 10 | 0 | 0 | 0 | 0 | 0 |
| 3 | â€” | â€” | â€” | â€” | â€” | â€” | â€” |
| 4 | â€” | â€” | â€” | â€” | â€” | â€” | â€” |

Update this aggregate row when you change any ticket status.

---

## Blockers log

Append here when a ticket moves to â¸. Include: date, ticket #, blocker summary, who to unblock. Remove when resolved.

_(none)_

---

## Change log

Append a bullet whenever a ticket flips to âœ… or ðŸš«. Format:
`- YYYY-MM-DD Â· #N Â· Title Â· @owner Â· PR #123 Â· one-line outcome`

_(no completed tickets yet)_

