# Implement dispute resolution via `POST /escrow/single-release/v2/resolve-dispute`

## Context
Once a dispute is opened on an escrow, a SafeSwap moderator (mapped to the `disputeResolvers` role) needs a way to resolve it and distribute the escrowed funds.

## Task
Build a moderator-facing action that calls `POST /escrow/single-release/v2/resolve-dispute` with `{ contractId, disputeResolver, distributions: [{ address, amount }, ...] }`. The sum of `distributions` must exactly equal the escrow's balance. Sign and submit the returned `unsignedXdr`.

## Acceptance criteria
- Restricted to accounts with the `disputeResolvers` role (moderators).
- Client-side validation that distribution amounts sum to the known escrow balance before submitting (fetch via `get-multiple-escrow-balance`).
- Order status updates to "resolved" and reflects final fund distribution once `send-transaction` confirms.
