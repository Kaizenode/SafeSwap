# Rewrite `lib/trustless-work.ts` to match the real Trustless Work API

## Problem
`lib/trustless-work.ts` is out of date. It calls old routes (`/escrow/initialize-escrow`, `/escrow/complete-escrow`) that don't exist in the current API, and authenticates with `Authorization: Bearer` instead of the required `x-api-key` header.

## Expected behavior
The client should target the `single-release` v2 API:
- Base URL: `https://dev.api.trustlesswork.com` (testnet) / `https://api.trustlesswork.com` (mainnet)
- Auth header: `x-api-key: <token>`
- Cover all required endpoints (tracked in separate issues): deploy, fund, change-milestone-status, approve-milestones, release-funds, update, dispute, resolve-dispute, send-transaction, get-escrows-by-signer, get-multiple-escrow-balance

## Reference
https://docs.trustlesswork.com/trustless-work/api-rest/introduction
