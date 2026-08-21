import { Keypair } from "@stellar/stellar-sdk";
import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";
import { SESSION_COOKIE, sessionToken } from "@/lib/auth/session";
import { consumeNonce } from "../nonce/route";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    address?: unknown;
    signedNonce?: unknown;
  } | null;
  if (typeof body?.address !== "string" || typeof body.signedNonce !== "string") {
    return NextResponse.json({ error: "address and signedNonce are required" }, { status: 400 });
  }

  const nonce = consumeNonce(body.address);
  if (!nonce) return NextResponse.json({ error: "Invalid or expired nonce" }, { status: 400 });

  try {
    const keypair = Keypair.fromPublicKey(body.address);
    const signature = Buffer.from(body.signedNonce, "base64");
    if (!keypair.verify(Buffer.from(nonce, "utf8"), signature)) {
      return NextResponse.json({ error: "Invalid wallet signature" }, { status: 401 });
    }

    const { data: user, error } = await supabaseServer
      .from("users")
      .upsert({ address: body.address }, { onConflict: "address" })
      .select()
      .single();
    if (error) return NextResponse.json({ error: "Unable to create user session" }, { status: 500 });

    const response = NextResponse.json({ user });
    response.cookies.set(SESSION_COOKIE, sessionToken(body.address), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 30,
      path: "/",
    });
    return response;
  } catch {
    return NextResponse.json({ error: "Invalid wallet address or signature" }, { status: 400 });
  }
}