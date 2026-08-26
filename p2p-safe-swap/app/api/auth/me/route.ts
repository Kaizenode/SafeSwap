import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/session";
import { supabaseServer } from "@/lib/supabase-server";

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get(SESSION_COOKIE.name)?.value;
    const session = token ? await verifySessionToken(token) : null;
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: user, error } = await supabaseServer
      .from("users")
      .select("*")
      .eq("address", session.address)
      .maybeSingle();

    if (error) {
      console.error("[GET /api/auth/me] supabase error:", error);
      return NextResponse.json(
        { error: "Failed to load user" },
        { status: 500 }
      );
    }

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json(user);
  } catch (err) {
    console.error("[GET /api/auth/me] unexpected error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}