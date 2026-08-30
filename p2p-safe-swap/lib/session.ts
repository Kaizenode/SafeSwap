import { createHmac } from "crypto";

const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days

export const SESSION_COOKIE = {
  name: "safeswap.session",
  maxAgeSeconds: SESSION_MAX_AGE_SECONDS,
};

function getSecretKey(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET is not set");
  return secret;
}

export interface SessionPayload {
  address: string;
}

export async function createSessionToken(payload: SessionPayload): Promise<string> {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const now = Math.floor(Date.now() / 1000);
  const body = Buffer.from(JSON.stringify({
    ...payload,
    iat: now,
    exp: now + SESSION_MAX_AGE_SECONDS,
  })).toString("base64url");
  const signature = createHmac("sha256", getSecretKey())
    .update(`${header}.${body}`)
    .digest("base64url");
  return `${header}.${body}.${signature}`;
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const [header, body, signature] = token.split(".");
    const expectedSignature = createHmac("sha256", getSecretKey())
      .update(`${header}.${body}`)
      .digest("base64url");
    if (signature !== expectedSignature) return null;
    const payload = JSON.parse(Buffer.from(body, "base64url").toString());
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp < now) return null;
    if (typeof payload.address !== "string") return null;
    return { address: payload.address };
  } catch {
    return null;
  }
}