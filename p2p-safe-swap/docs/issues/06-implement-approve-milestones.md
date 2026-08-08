# Wire seller confirmation to `POST /escrow/single-release/v2/approve-milestones`

## Context
Once the buyer marks the milestone as completed, the seller must confirm receipt of the fiat payment before funds can be released.

## Task
In `/p2p/chat`, when the seller accepts the payment request (existing `onAcceptPaymentRequest` handler), call `POST /escrow/single-release/v2/approve-milestones` with `{ contractId, approver: sellerAddress, milestoneIndexes: [0] }`, then have the seller sign and submit the returned `unsignedXdr`.

## Acceptance criteria
- Only enabled once the milestone status is `completed` (from the buyer's action).
- Seller's wallet is prompted to sign; UI reflects "approved, ready for release" once `send-transaction` confirms.
