# Implement shared XDR sign-and-submit flow via `POST /stellar/send-transaction`

## Context
Every write endpoint in the Trustless Work API (deploy, fund, change-milestone-status, approve-milestones, release-funds, update, dispute, resolve-dispute) returns an `unsignedXdr` that must be signed by the user's wallet and then submitted through this shared endpoint.

## Task
Build one reusable helper/hook that:
1. Takes an `unsignedXdr` and requests a signature from the connected Stellar wallet.
2. Calls `POST /stellar/send-transaction` with `{ signedXdr }`.
3. Returns `txHash`, `ledger`, and (for deploys) `contractId` + `escrow` to the caller.

All the other escrow-action issues (03–10) should build on top of this helper instead of duplicating sign/submit logic.

## Acceptance criteria
- Single shared implementation, not duplicated per action.
- Handles wallet-rejection and network-failure states with clear error surfaces to the caller.
