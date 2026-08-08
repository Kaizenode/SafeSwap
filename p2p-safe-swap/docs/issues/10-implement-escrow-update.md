# Implement pre-funding term edits via `PUT /escrow/single-release/v2/update`

## Context
Before an escrow is funded, the admin may need to correct terms (amount, roles, fee, milestones) set at deploy time.

## Task
Add an admin-only action calling `PUT /escrow/single-release/v2/update` with the full escrow payload. Note this is a full replace, restricted to the `admin` role, and:
- If the escrow is **unfunded**, all properties can be changed.
- If the escrow is **already funded**, only **adding** milestones is allowed — everything else is locked by the API.

Sign and submit the returned `unsignedXdr`.

## Acceptance criteria
- Action only exposed to the admin wallet/role.
- UI reflects the funded/unfunded constraint (disables locked fields once the escrow has funds).
