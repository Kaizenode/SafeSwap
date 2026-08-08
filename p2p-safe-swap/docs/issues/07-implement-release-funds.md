# Implement fund release via `POST /escrow/single-release/v2/release-funds`

## Context
Once the seller has approved the milestone, the escrowed USDT/USDC must be released to the buyer.

## Task
Call `POST /escrow/single-release/v2/release-funds` with `{ contractId, releaseSigner }`, then sign and submit the returned `unsignedXdr` via `/stellar/send-transaction`. The API requires all milestones to be approved before this call succeeds.

## Acceptance criteria
- Only triggerable after `approve-milestones` has succeeded for the order.
- Order status updates to "completed" and buyer's balance reflects the released funds once `send-transaction` confirms.
- Failure (e.g. not all milestones approved) is surfaced clearly in the UI.
