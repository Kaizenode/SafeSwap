import "server-only";
import { jwtVerify, type JWTPayload } from "jose";
import type { NextRequest } from "next/server";

/**
 * Name of the HttpOnly cookie set by POST /api/auth/verify.
 * Kept in one place so nothing else has to hardcode the string.
 */
export const SESSION_COOKIE_NAME = "safeswap.session";

export interface Session {
  address: string;
}

/**
 * Thrown by requireSession() when there is no valid session.
 * Route handlers should catch this and turn it into a
 * NextResponse.json({ error: err.message }, { status: err.status }).
 */
export class AuthError extends Error {
  readonly status: number;

  constructor(message = "Unauthorized", status = 401) {
    super(message);
    this.name = "AuthError";
    this.status = status;
  }
}

function getSecretKey(): Uint8Array {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    // Fail loudly in dev/CI rather than silently rejecting every session.
    throw new Error(
      "SESSION_SECRET is not set. Add it to your environment (see .env.example)."
    );
  }
  return new TextEncoder().encode(secret);
}

/**
 * Reads the session cookie off either a NextRequest (route handlers,
 * middleware) or a plain Request (e.g. in tests). Returns undefined
 * if the cookie isn't present.
 */
function readSessionCookie(request: NextRequest | Request): string | undefined {
  const maybeNextRequest = request as Partial<NextRequest>;
  if (typeof maybeNextRequest.cookies?.get === "function") {
    return maybeNextRequest.cookies.get(SESSION_COOKIE_NAME)?.value;
  }

  const header = request.headers.get("cookie");
  if (!header) return undefined;

  for (const part of header.split(";")) {
    const [rawName, ...rawValue] = part.trim().split("=");
    if (rawName === SESSION_COOKIE_NAME) {
      return decodeURIComponent(rawValue.join("="));
    }
  }
  return undefined;
}

/**
 * The verify() route may put the wallet address in a custom `address`
 * claim or in the standard `sub` claim — accept either so this helper
 * doesn't silently break if that choice changes.
 */
function readAddress(payload: JWTPayload): string | null {
  const { address, sub } = payload as { address?: unknown; sub?: unknown };
  if (typeof address === "string" && address.length > 0) return address;
  if (typeof sub === "string" && sub.length > 0) return sub;
  return null;
}

/**
 * Resolves the current session from the request cookie.
 * Never throws for "no session" cases — a missing cookie, an expired
 * token, and a bad signature all resolve to null. Only a missing
 * SESSION_SECRET (a config error, not a caller error) throws.
 */
export async function getSession(
  request: NextRequest | Request
): Promise<Session | null> {
  const token = readSessionCookie(request);
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    const address = readAddress(payload);
    return address ? { address } : null;
  } catch {
    // Malformed, expired, or invalid signature — treat as unauthenticated.
    return null;
  }
}

/**
 * Same as getSession(), but throws AuthError (401) instead of
 * returning null. Use this in any route that should reject
 * unauthenticated callers.
 */
export async function requireSession(
  request: NextRequest | Request
): Promise<Session> {
  const session = await getSession(request);
  if (!session) {
    throw new AuthError();
  }
  return session;
}
