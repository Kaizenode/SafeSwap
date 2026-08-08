# Working with Claude on SafeSwap

Conventions for how developers and Claude collaborate on this repo so that progress is trackable, handoffs are painless, and nobody gets surprised by scope creep.

**TL;DR:**
1. Say which ticket you're on before starting.
2. Update [`PROGRESS.md`](../PROGRESS.md) at three moments: pick up (⬜→🟨), open PR (🟨→🔵), merge (🔵→✅).
3. Reference the ticket id in every commit: `feat(orders): create endpoint [#16]`.
4. Don't silently expand scope — pause and either edit the ticket or file a new one.

---

## 1. Where things live

| Doc | Purpose | Mutability |
|---|---|---|
| [`PRD-MVP.md`](../PRD-MVP.md) | Product scope. What we're building and why. | Rarely edited. Big changes need alignment. |
| [`EXECUTION-PLAN.md`](../EXECUTION-PLAN.md) | Feature-by-feature have/missing + sprint plan. | Edited when scope shifts between sprints. |
| [`SPRINTS.md`](../SPRINTS.md) | Sprint-level index (goals, status, dates). | Edited at sprint boundaries. |
| [`SPRINT-N-ISSUES.md`](../SPRINT-1-ISSUES.md) | Ticket definitions for sprint N (scope + acceptance). | Edited only when a ticket's scope legitimately changes. |
| [`PROGRESS.md`](../PROGRESS.md) | **Living** ticket status. | Edited on every state change. |

**Rule of thumb:** if it changes daily, it belongs in `PROGRESS.md`. If it changes monthly, it belongs in the sprint docs. If it changes rarely, it belongs in the PRD.

---

## 2. Ticket lifecycle

```
⬜ planned  →  🟨 in progress  →  🔵 in review  →  ✅ done
                     ↓
                  ⏸ blocked   (may return to 🟨 or 🚫 cancelled)
```

State transitions and who triggers them:

| From → To | Trigger | Update |
|---|---|---|
| ⬜ → 🟨 | You start work | Set Status, Owner in `PROGRESS.md`. Confirm no dependencies are still ⬜. |
| 🟨 → 🔵 | You open a PR | Set Status, add PR link. |
| 🔵 → ✅ | PR merged to `main` | Set Status. Append a line to the Change log. |
| any → ⏸ | External blocker | Set Status. Add a Blockers-log entry with what's needed. |
| any → 🚫 | Ticket no longer needed | Set Status. Add a Change-log line with the reason. |

Do not skip states. If a ticket goes straight to ✅ without a PR, note it in the PR column (`n/a — commit abc123`).

---

## 3. Starting a work session

Whether you're pairing with Claude or working solo, the opening moves are the same:

1. **Pick a ticket that's ⬜ and unblocked.** Check `PROGRESS.md` first; don't pick up 🟨 items owned by someone else without coordinating.
2. **Read the ticket definition** in the relevant `SPRINT-N-ISSUES.md`. Re-read the *Acceptance* section — it's the contract.
3. **Move the ticket to 🟨** with your GitHub handle in the Owner column. This is your claim.
4. **Create a branch** using the ticket id: `feat/16-post-orders-endpoint`. Branch name convention: `<type>/<ticket>-<slug>` where type is `feat` / `fix` / `chore` / `refactor` / `docs`.

If you're pairing with Claude, tell it explicitly: *"I'm starting ticket #16. Read the ticket in `docs/SPRINT-2-ISSUES.md`, then confirm the scope before writing any code."* Claude should re-state the acceptance criteria back to you before touching files. If it doesn't, ask it to.

---

## 4. During work

- **Commits reference the ticket:** `feat(orders): validate min/max on POST [#16]`. This makes `git log --grep '#16'` a full audit trail per ticket.
- **Stay in scope.** If you discover work outside the ticket's Acceptance section:
  - **Tiny (< 30 min, obviously related):** do it, mention in the PR description.
  - **Bigger:** stop. Either edit the ticket to expand scope (only if genuinely inseparable) or open a new ticket for it. Don't quietly bundle unrelated changes.
- **If you hit a blocker:** move the ticket to ⏸ in `PROGRESS.md`, add a Blockers-log entry describing what would unblock you, then pick up something else. Don't leave a 🟨 sitting for days.
- **If you need to stop mid-work (partial):** commit and push to your branch, then update the ticket Notes column in `PROGRESS.md` with what's done and what's next. Assume the next person picking it up won't see your Slack messages.

---

## 5. Opening a PR

- PR title mirrors the ticket title with the id: `[#16] POST /api/orders (create sell order)`.
- Description checklist (copy into the PR body):
  ```
  Closes: #<gh-issue-number>
  Ticket: #16 in docs/SPRINT-2-ISSUES.md

  ## Acceptance criteria (from ticket)
  - [x] Authenticated seller can create an order
  - [x] 401 without a session cookie
  - [x] 400 on validation failure with issues array
  - [x] Maker cap enforced

  ## Notes
  <anything reviewer needs to know: decisions, follow-ups, scope caveats>
  ```
- Every acceptance criterion must be a checked box before requesting review. If you can't check one, either explain why or the ticket isn't done.
- **Move `PROGRESS.md` to 🔵 and paste the PR link** in the same commit that opens the PR (or immediately after).

---

## 6. Merging

- PR merged → move ticket to ✅ in `PROGRESS.md` and add a Change-log line:
  `- 2026-08-14 · #16 · POST /api/orders · @diegoTech14 · PR #123 · shipped, no follow-ups`
- Update the Cross-sprint aggregate row at the bottom of `PROGRESS.md`.
- If merging revealed a follow-up (small bug, missing edge case), file a new ticket rather than reopening the closed one.

---

## 7. Working with Claude specifically

These are things you can (and should) tell Claude on this repo:

- **"Read `PROGRESS.md` and tell me what's unblocked."** — good session opener when you don't have a ticket picked.
- **"I'm on #N. Confirm scope from the sprint doc before coding."** — forces Claude to check the acceptance section before diving in.
- **"Show the diff before updating `PROGRESS.md`."** — the tracker is the one file Claude should never edit silently.
- **"Follow the workflow in `docs/guidelines/CLAUDE_WORKFLOW.md`."** — one-liner that pulls this whole doc into context.

Expectations of Claude during a session:

- **Restate the ticket scope** before writing code. If Claude jumps straight into edits without confirming, redirect it.
- **Update `PROGRESS.md`** at the three transition points (pick up, PR open, merge) — but only after telling you what it's about to change.
- **Reference the ticket id in commit messages** it drafts.
- **Never bundle out-of-scope changes** into a PR. If Claude notices unrelated cleanup, it should mention it and either file a new ticket or leave it alone.
- **Flag scope creep out loud.** If a ticket turns out to be materially bigger than estimated, Claude should say so before continuing.

Things Claude should *not* do without explicit permission:
- Edit `PRD-MVP.md`, `EXECUTION-PLAN.md`, or `SPRINT-N-ISSUES.md` (scope-defining docs). Ask before changing.
- Move a ticket to ✅ before the PR is merged.
- Create GitHub issues, PRs, or push to remote. Local commits are fine; anything visible to others needs a nod.
- Cancel or skip acceptance criteria.

---

## 8. When multiple people (or sessions) are active

- **Only one owner per active ticket.** If you want to pair, name one owner in `PROGRESS.md` and note the pair in the Notes column.
- **Dependencies are enforced.** If ticket #17 says "depends on #16" and #16 is not ✅, don't start #17 unless you're also owning #16 or the dependency is a soft one you've confirmed with the owner.
- **Handoffs go through `PROGRESS.md`, not Slack.** If someone else (human or a new Claude session) needs to pick up your work, the Notes column is where they'll look. Write it as if they have zero context — because they do.
- **Merge conflicts on `PROGRESS.md` are normal.** Resolve by keeping both changes; the file is append-friendly by design.

---

## 9. Sprint boundaries

At sprint end:
- Every ticket is either ✅, 🚫, or explicitly rolled to the next sprint (with a note in `PROGRESS.md` and the ticket moved to the next `SPRINT-N-ISSUES.md`).
- Flip the sprint's Status to ✅ in `SPRINTS.md`, fill in Ended date.
- Write a 3-line retro at the bottom of `PROGRESS.md` under a new `## Sprint N retro` section: what went well, what didn't, what we're changing.

At sprint start:
- Break down the next sprint into tickets (`SPRINT-(N+1)-ISSUES.md`) if it isn't already.
- Copy the ticket status table into `PROGRESS.md`.
- Flip the sprint Status to 🟨 in `SPRINTS.md`, fill in Started date.

---

## 10. Anti-patterns to avoid

- ❌ Marking a ticket ✅ before the PR is merged.
- ❌ Working on ⬜ tickets without moving them to 🟨 first.
- ❌ Bundling multiple tickets into one PR (unless they truly are one atomic change, and even then, prefer a stacked PR).
- ❌ Silent scope expansion. Say it out loud, edit the ticket, or file a new one.
- ❌ Long-lived ⏸ tickets. If a blocker sits for more than a few days, raise it — or cancel the ticket.
- ❌ Editing `PRD-MVP.md` mid-sprint without a discussion. The PRD is the contract; changes should be intentional.
