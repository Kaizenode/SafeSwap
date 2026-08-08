# Wire "I paid" chat action to `POST /escrow/single-release/v2/change-milestone-status`

## Context
When the buyer sends fiat outside the platform (SEPA/Bizum), they need to mark the milestone as completed from the P2P chat.

## Task
In `/p2p/chat`, when the buyer confirms payment (existing `PaymentBubble` "Pagar" action), call `POST /escrow/single-release/v2/change-milestone-status` with `{ contractId, serviceProvider: buyerAddress, updates: [{ index: 0, newStatus: "completed" }] }`, then sign and submit the returned `unsignedXdr`.

## Acceptance criteria
- Buyer's wallet is prompted to sign the resulting XDR.
- Chat UI updates the `PaymentBubble` state (`request` → `sent`) only after `send-transaction` confirms success.
- Seller is notified that the milestone was marked complete and needs approval.
