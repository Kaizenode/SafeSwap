# Show live escrow balances via `GET /helper/get-multiple-escrow-balance`

## Context
Order and transaction views need to display the actual funds currently held in an escrow contract (e.g. to confirm funding succeeded, or to validate dispute distributions).

## Task
Call `GET /helper/get-multiple-escrow-balance` with the relevant `addresses` (escrow contract IDs) and surface the balance in the order/transaction UI.

## Acceptance criteria
- Balance shown on order detail views once an escrow is funded.
- Used by the dispute-resolution flow (issue 09) to validate that distribution amounts match the on-chain balance before submitting.
