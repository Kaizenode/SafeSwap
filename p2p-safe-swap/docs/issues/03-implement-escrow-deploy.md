# Implement escrow creation via `POST /escrow/single-release/v2/deploy`

## Context
When a seller accepts a P2P order, an escrow contract must be deployed on Trustless Work before any funds move.

## Task
Call `POST /escrow/single-release/v2/deploy` with:
- `roles` mapped to SafeSwap actors: `serviceProviders` = buyer, `approvers` = buyer... wait, actually `approvers` = seller, `receiver` = buyer, `disputeResolvers` = SafeSwap moderator, `platform`/`admin` = platform wallet, `releaseSigners` = seller or platform.
- A single implicit milestone: `{ "description": "Fiat payment confirmed", "status": "pending", "approvalsTarget": 1 }`.
- `amount`, `platformFee`, and `trustline.contractId` for the traded asset (USDT/USDC).

The response returns `unsignedXdr` — hand it to the seller's wallet for signing, then submit via the `send-transaction` endpoint (see separate issue).

## Acceptance criteria
- Triggered automatically when a seller accepts an order in `/p2p/orders`.
- Escrow `contractId` is persisted against the order for later steps (fund, approve, release).
