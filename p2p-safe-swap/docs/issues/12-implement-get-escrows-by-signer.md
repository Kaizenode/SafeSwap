# Populate `/transactions` and `/p2p/orders` via `GET /helper/get-escrows-by-signer`

## Context
`/transactions` and `/p2p/orders` need to reflect the real on-chain state of a user's escrows instead of relying solely on local order data.

## Task
Call `GET /helper/get-escrows-by-signer` with the connected wallet as `signer`, using `role`, `status`, `type=single-release`, `engagementId`, `isActive`, `orderBy`/`orderDirection`, and pagination params as needed to filter the lists shown on each page.

## Acceptance criteria
- `/p2p/orders` shows live escrow status (pending, funded, disputed, released) per order.
- `/transactions` lists a user's escrow history sourced from this endpoint.
- Pagination is wired up for users with many escrows.
