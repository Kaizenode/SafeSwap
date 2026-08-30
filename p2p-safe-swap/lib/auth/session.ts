import "server-only";
import { jwtVerify, type JWTPayload } from "jose";
import type { NextRequest } from "next/server";

export const SESSION_COOKIE_NAME = "safeswap.session";

export interface Session {
  address: string;
}

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
    throw new Error(
      "SESSION_SECRET is not set. Add it to your environment (see .env.example)."
    );
  }
  return new TextEncoder().encode(secret);
}

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

function readAddress(payload: JWTPayload): string | null {
  const { address, sub } = payload as { address?: unknown; sub?: unknown };
  if (typeof address === "string" && address.length > 0) return address;
  if (typeof sub === "string" && sub.length > 0) return sub;
  return null;
}

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
    return null;
  }
}

export async function requireSession(
  request: NextRequest | Request
): Promise<Session> {
  const session = await getSession(request);
  if (!session) throw new AuthError();
  return session;
}