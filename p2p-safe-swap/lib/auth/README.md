# lib/auth

Server-side helpers for reading the wallet session cookie (`safeswap.session`,
set by `POST /api/auth/verify` — see #370) inside API routes.

## Usage

```ts
import { requireSession, AuthError } from "@/lib/auth/session";

export async function POST(request: NextRequest) {
  try {
    const { address } = await requireSession(request);
    // ... `address` is the authenticated wallet, safe to use below.
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }
}
```

For a route that should behave differently for signed-in vs anonymous callers
(rather than rejecting outright), use `getSession(request)` instead — it
resolves to `null` rather than throwing.

## Notes

- Cookie: `safeswap.session`, HttpOnly, `SameSite=Lax`, `Secure` in
  production, 30-day sliding expiry, signed with `SESSION_SECRET`.
- Verified with `jose`'s `jwtVerify` — works in both the Node and Edge
  runtimes, unlike `jsonwebtoken`.
- `getSession` never throws for "no session": a missing cookie, an expired
  token, and a bad signature all just resolve to `null`. Only a missing
  `SESSION_SECRET` env var throws (that's a config bug, not a caller error).
- Sprint 1 scope: no existing mutating route (the escrow endpoints) is
  wrapped in `requireSession` yet — that happens in Sprint 3 once trades
  move to the DB. This helper is infra, ready to use as new routes land.
