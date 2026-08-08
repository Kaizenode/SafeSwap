# Implement dispute opening via `POST /escrow/single-release/v2/dispute`

## Context
If something goes wrong at any point in the P2P flow (buyer claims to have paid but seller disagrees, etc.), either party needs a way to open a dispute on the escrow.

## Task
Add a "raise dispute" action (e.g. in `/p2p/chat`) that calls `POST /escrow/single-release/v2/dispute` with `{ contractId, signer, reason }` (reason max 500 chars). Note: `signer` must be any escrow role **except** `disputeResolvers`. Sign and submit the returned `unsignedXdr`.

## Acceptance criteria
- Available to both buyer and seller from the order/chat UI.
- Requires a non-empty reason, enforced client-side (≤500 chars) to match the API constraint.
- Order/escrow status moves to "disputed" once `send-transaction` confirms, and normal payment actions (pay/approve/release) are disabled.
