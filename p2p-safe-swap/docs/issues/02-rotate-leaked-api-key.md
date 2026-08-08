# Rotate leaked Trustless Work API key committed in `.env.example`

## Problem
`app/api/.env.example` has what appears to be a real API key committed to the repo (`TW_API_KEY=7p9eNvg2VFR6...`).

## Expected behavior
- Rotate/revoke the exposed key with Trustless Work.
- Replace the value in `.env.example` with a placeholder, e.g. `TW_API_KEY=your_api_key_here`.
- Confirm the real key is only ever stored in untracked `.env` files or secret managers.

## Priority
High — this is a credential leak and should be handled before other Trustless Work work lands.
