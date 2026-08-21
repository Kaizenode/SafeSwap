import { NextResponse } from "next/server";

const nonces = new Map<string, { nonce: string; expiresAt: number }>();
const TTL_MS = 5 * 60 * 1000;

export function getNonce(address: string): { nonce: string; expiresAt: number } {
  const value = { nonce: crypto.randomUUID(), expiresAt: Date.now() + TTL_MS };
  nonces.set(address, value);
  return value;
}

export function consumeNonce(address: string): string | null {
  const value = nonces.get(address);
  nonces.delete(address);
  return value && value.expiresAt > Date.now() ? value.nonce : null;
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { address?: unknown } | null;
  if (typeof body?.address !== "string" || !body.address.trim()) {
    return NextResponse.json({ error: "address is required" }, { status: 400 });
  }
  return NextResponse.json(getNonce(body.address));
}