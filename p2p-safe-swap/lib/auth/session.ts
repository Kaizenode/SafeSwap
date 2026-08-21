import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import type { NextRequest } from "next/server";

export const SESSION_COOKIE = "safeswap.session";

export interface Session {
  address: string;
}

function secret(): string {
  const value = process.env.SESSION_SECRET;
  if (!value) throw new Error("SESSION_SECRET is not configured");
  return value;
}

export function getSession(request: NextRequest): Session | null {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  try {
    const payload = jwt.verify(token, secret());
    if (typeof payload === "string" || typeof payload.address !== "string") return null;
    return { address: payload.address };
  } catch {
    return null;
  }
}

export async function getCookieSession(): Promise<Session | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;

  try {
    const payload = jwt.verify(token, secret());
    if (typeof payload === "string" || typeof payload.address !== "string") return null;
    return { address: payload.address };
  } catch {
    return null;
  }
}

export function sessionToken(address: string): string {
  return jwt.sign({ address }, secret(), { expiresIn: "30d" });
}