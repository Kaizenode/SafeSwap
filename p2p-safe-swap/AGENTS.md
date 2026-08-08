# SafeSwap — agent onboarding

You (Claude, Codex, or another agent) are working in the `p2p-safe-swap/` Next.js app. This file is your fast-path to being productive. Read it fully before touching code.

## What this project is

Peer-to-peer marketplace to buy and sell **USDC on Stellar** against Costa Rican fiat rails (bank transfer, SINPE Móvil). Every trade is protected by an on-chain **single-release escrow contract** deployed via the **Trustless Work API**. Testnet-first; mainnet gated behind an env flag.

## Where to look first

Always read these before proposing changes:

1. **`../docs/PROGRESS.md`** — current ticket status. Start here to know what's in flight and what's unblocked.
2. **`../docs/guidelines/CLAUDE_WORKFLOW.md`** — how work is tracked (ticket lifecycle, commit conventions, scope-creep rules, sprint discipline). This is the contract for how you operate on this repo.
3. **`../docs/PRD-MVP.md`** — product scope. What we're building and, importantly, what's out of scope.
4. **`../docs/EXECUTION-PLAN.md`** — feature-by-feature have/missing map + 4-sprint plan.
5. **`../docs/SPRINTS.md`** — sprint index and links to each sprint's issues doc.
6. **`docs/trustless-work-integration.md`** — how the escrow lifecycle maps to Trustless Work endpoints. Payloads, roles, and known API quirks live here.

## Stack cheatsheet

- **Next.js 16** (App Router), **React 19**, **Tailwind v4**, **shadcn/ui-flavored components** under `frontend/components/ui/`.
- **Wallet:** currently Freighter via `@stellar/freighter-api` in `frontend/lib/wallet-context.tsx`. Sprint 1 migrates this to `@creit.tech/stellar-wallets-kit` to add LOBSTR.
- **Escrow:** `lib/trustless-work.ts` wraps the Trustless Work REST API. All escrow API routes live under `app/api/escrow/**` and forward to it using the server-side `TW_API_KEY`.
- **DB:** Supabase (SDK installed in `lib/supabase.ts`, consumed only after Sprint 1). Not currently wired.
- **Stellar SDK:** `@stellar/stellar-sdk`, used server-side for Horizon fallback and testnet setup helpers.

## Non-negotiable rules

- **`TW_API_KEY` is server-only.** Never expose it to the client. All escrow calls must go through `app/api/**` routes, never directly from a component.
- **Never commit secrets.** `.env.local` only. If you find a real-looking key in `.env.example`, flag it — one was previously leaked (see ticket #12).
- **Every value transfer routes through the escrow contract.** USDC never moves peer-to-peer directly. Deploy → fund → approve → release, in that order.
- **Wallets sign, servers submit.** Every write endpoint returns an unsigned XDR; the connected wallet signs it; we submit the signed XDR via `/api/stellar/send-transaction`. Do not attempt to sign server-side.
- **Testnet passphrase is `Test SDF Network ; September 2015`.** Currently hard-coded in `wallet-context.tsx`; Sprint 1 makes it env-driven.
- **Follow the workflow.** Pick a ticket that is ⬜ in `docs/PROGRESS.md`, move it to 🟨 with your handle, branch as `<type>/<ticket-id>-<slug>`, commit with `[#N]`, PR titled `[#N] <title>`. Full details in `CLAUDE_WORKFLOW.md`.

## Common gotchas

- **Next.js 16 App Router** — routes are React Server Components by default. Anything using hooks, wallet, or `window` needs `"use client"`.
- **The `frontend/` directory is *not* Next's convention** — it's a project choice. Aliases in `tsconfig.json` map `@/frontend/...`.
- **`localStorage` is used today for `contractId` on `/trades/[id]`.** Sprint 3 moves this into the DB; do not add new `localStorage` state without discussing.
- **Two sets of API routes look similar but do different things:** `/api/stellar/send-transaction` (goes through Trustless Work) vs `/api/stellar/submit-horizon` (direct Horizon fallback). Prefer the first.
- **Chat, orders, wallet balance are mocked today.** Don't wire them to imaginary APIs; check the current sprint before rewiring.

## When you're unsure

- If it's a scope question → re-read the PRD.
- If it's a "how does X work in this codebase" question → grep first, ask second.
- If it's about how to track work → `CLAUDE_WORKFLOW.md`.
- If a ticket seems bigger than estimated, say so before continuing — do not silently expand scope.

## What you must not do without permission

- Edit `PRD-MVP.md`, `EXECUTION-PLAN.md`, or any `SPRINT-N-ISSUES.md` (scope docs).
- Move a ticket to ✅ before the PR is merged.
- Create GitHub issues, PRs, or push branches to `origin`.
- Bundle unrelated changes into a single PR.
- Bypass the workflow to "save time".
