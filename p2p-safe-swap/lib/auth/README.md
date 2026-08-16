# SafeSwap Auth Session Helpers

Authentication middleware and session management utilities for SafeSwap API routes.

## Usage Example

```ts
import { getSession, requireSession } from '@/lib/auth/session';

// Read session in an API route (returns { address } or null)
const session = await getSession(request);

// Reject unauthenticated requests in mutating API routes (throws 401 AuthError if unauthenticated)
const { address } = await requireSession(request);
```

## Available Helpers

- `getSession(request?: Request | NextRequest): Promise<{ address: string } | null>`
  Reads and verifies the `safeswap.session` HTTP-only JWT cookie. Returns `{ address }` if valid, or `null` if missing, expired, or invalid.

- `requireSession(request?: Request | NextRequest): Promise<{ address: string }>`
  Enforces authentication. Calls `getSession(request)` and throws an `AuthError` (status 401) if unauthenticated.

- `createSessionToken(payload: { address: string }, expiresInSeconds?: number): string`
  Creates and signs a JWT session token using `SESSION_SECRET`.

- `verifySessionToken(token: string): SessionPayload | null`
  Verifies a JWT session token signature and expiration.
