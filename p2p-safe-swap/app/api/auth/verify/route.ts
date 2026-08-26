import { NextRequest, NextResponse } from "next/server";
import { Keypair } from "@stellar/stellar-sdk";
import { peekNonce, deleteNonce } from "@/lib/nonce-store";
import { createSessionToken, SESSION_COOKIE } from "@/lib/session";
interface VerifyRequestBody {
  address?: string;
  signedNonce?: string;
}

async function persistUser(address: string): Promise<boolean> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return false;
  }

  const response = await fetch(`${supabaseUrl}/rest/v1/users?on_conflict=address`, {
    method: "POST",
    headers: {
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates,return=minimal",
    },
    body: JSON.stringify({ address }),
  });

  return response.ok;
}

function verifyStellarSignature(
  address: string,
  message: string,
  signatureBase64: string
): boolean {
  try {
    const keypair = Keypair.fromPublicKey(address);
    const messageBuffer = Buffer.from(message, "utf-8");
    const signatureBuffer = Buffer.from(signatureBase64, "base64");
    return keypair.verify(messageBuffer, signatureBuffer);
  } catch {
    // Malformed address or signature -> treat as invalid, not a 500.
    return false;
  }
}

export async function POST(req: NextRequest) {
  let body: VerifyRequestBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { address, signedNonce } = body;
  if (!address || typeof address !== "string" || !signedNonce || typeof signedNonce !== "string") {
    return NextResponse.json(
      { error: "address and signedNonce are required" },
      { status: 400 }
    );
  }

  const entry = peekNonce(address);
  if (!entry) {
    return NextResponse.json(
      { error: "No pending nonce for this address. Request a new one." },
      { status: 400 }
    );
  }

  // Burn the nonce on first use regardless of outcome — this is what makes
  // "reusing a consumed nonce" fail with 400, and it also stops someone from
  // hammering signature attempts against the same nonce.
  deleteNonce(address);

  if (entry.expiresAt <= Date.now()) {
    return NextResponse.json({ error: "Nonce expired. Request a new one." }, { status: 400 });
  }

  if (!verifyStellarSignature(address, entry.nonce, signedNonce)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  try {
    if (!(await persistUser(address))) {
      return NextResponse.json({ error: "Failed to persist user" }, { status: 500 });
    }
  } catch {
    return NextResponse.json({ error: "Failed to persist user" }, { status: 500 });
  }

  const token = await createSessionToken({ address });

  const res = NextResponse.json({ address });
  res.cookies.set(SESSION_COOKIE.name, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_COOKIE.maxAgeSeconds,
    path: "/",
  });

  return res;
}