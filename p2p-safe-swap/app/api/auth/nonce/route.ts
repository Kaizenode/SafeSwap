import { NextRequest, NextResponse } from "next/server";
import { createNonce } from "@/lib/nonce-store";

export async function POST(req: NextRequest) {
  let body: { address?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { address } = body;
  if (!address || typeof address !== "string") {
    return NextResponse.json({ error: "address is required" }, { status: 400 });
  }

  const { nonce, expiresAt } = createNonce(address);
  return NextResponse.json({ nonce, expiresAt: new Date(expiresAt).toISOString() });
}