import type { NextRequest } from 'next/server';
import crypto from 'crypto';

export interface SessionPayload {
  address: string;
  iat?: number;
  exp?: number;
}

export class AuthError extends Error {
  status: number;
  statusCode: number;

  constructor(message = 'Unauthorized', status = 401) {
    super(message);
    this.name = 'AuthError';
    this.status = status;
    this.statusCode = status;
  }
}

const COOKIE_NAME = 'safeswap.session';

function getSessionSecret(): string {
  return (
    process.env.SESSION_SECRET ||
    'safeswap-default-secret-key-at-least-32-chars-long'
  );
}

function base64UrlEncode(str: string | Buffer): string {
  const buf = typeof str === 'string' ? Buffer.from(str) : str;
  return buf
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function base64UrlDecode(str: string): string {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  return Buffer.from(base64, 'base64').toString('utf-8');
}

/**
 * Creates and signs a JWT session token.
 */
export function createSessionToken(
  payload: { address: string },
  expiresInSeconds: number = 30 * 24 * 60 * 60
): string {
  const secret = getSessionSecret();
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const fullPayload: SessionPayload = {
    ...payload,
    iat: now,
    exp: now + expiresInSeconds,
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(fullPayload));
  const dataToSign = `${encodedHeader}.${encodedPayload}`;

  const signature = crypto
    .createHmac('sha256', secret)
    .update(dataToSign)
    .digest();
  const encodedSignature = base64UrlEncode(signature);

  return `${dataToSign}.${encodedSignature}`;
}

/**
 * Verifies a JWT session token and returns the payload if valid.
 */
export function verifySessionToken(token: string): SessionPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const [encodedHeader, encodedPayload, encodedSignature] = parts;
    const secret = getSessionSecret();
    const dataToSign = `${encodedHeader}.${encodedPayload}`;

    const expectedSignature = base64UrlEncode(
      crypto.createHmac('sha256', secret).update(dataToSign).digest()
    );

    const bufA = Buffer.from(encodedSignature);
    const bufB = Buffer.from(expectedSignature);

    if (bufA.length !== bufB.length) return null;
    if (!crypto.timingSafeEqual(bufA, bufB)) return null;

    const payloadJson = base64UrlDecode(encodedPayload);
    const payload: SessionPayload = JSON.parse(payloadJson);

    if (!payload || typeof payload.address !== 'string' || !payload.address) {
      return null;
    }

    if (payload.exp && Math.floor(Date.now() / 1000) > payload.exp) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

/**
 * Helper to parse cookie string from headers
 */
function parseCookieHeader(cookieHeader: string, cookieName: string): string | null {
  const cookiesArr = cookieHeader.split(';');
  for (const c of cookiesArr) {
    const [name, ...valParts] = c.trim().split('=');
    if (name.trim() === cookieName) {
      return valParts.join('=').trim();
    }
  }
  return null;
}

/**
 * Gets the current session from request cookie or Next headers cookie store.
 */
export async function getSession(
  request?: Request | NextRequest
): Promise<{ address: string } | null> {
  let token: string | null = null;

  if (request) {
    // Try NextRequest cookies map if available
    const nextReq = request as NextRequest;
    if (nextReq.cookies && typeof nextReq.cookies.get === 'function') {
      token = nextReq.cookies.get(COOKIE_NAME)?.value || null;
    }

    // Fallback to Header 'cookie'
    if (!token && request.headers) {
      const rawCookie = request.headers.get('cookie');
      if (rawCookie) {
        token = parseCookieHeader(rawCookie, COOKIE_NAME);
      }
    }
  }

  // Fallback to Next.js cookies() header helper if request didn't yield token
  if (!token) {
    try {
      const { cookies } = await import('next/headers');
      const cookieStore = await cookies();
      token = cookieStore.get(COOKIE_NAME)?.value || null;
    } catch {
      // Ignore error when outside Next.js cookies context
    }
  }

  if (!token) return null;

  const payload = verifySessionToken(token);
  if (!payload || !payload.address) return null;

  return { address: payload.address };
}

/**
 * Requires a valid session from the request. Throws AuthError (401) if invalid or missing.
 */
export async function requireSession(
  request?: Request | NextRequest
): Promise<{ address: string }> {
  const session = await getSession(request);
  if (!session) {
    throw new AuthError('Unauthorized', 401);
  }
  return session;
}
