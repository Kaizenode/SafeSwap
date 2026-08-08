# Implement escrow funding via `POST /escrow/single-release/v2/fund`

## Context
After an escrow is deployed, the seller must lock the USDT/USDC into the contract before the buyer can pay fiat.

## Task
Call `POST /escrow/single-release/v2/fund` with `{ contractId, signer, amount }`, then have the seller's wallet sign the returned `unsignedXdr` and submit it through `/stellar/send-transaction`.

## Acceptance criteria
- Triggered right after a successful `deploy` for the order.
- Order/UI reflects "funds locked" state only after `send-transaction` confirms.
- Handles and surfaces funding failures (insufficient balance, rejected signature) to the seller.
