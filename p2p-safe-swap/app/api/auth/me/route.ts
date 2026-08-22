import { NextRequest, NextResponse } from "next/server";
import { AuthError, requireSession } from "@/lib/auth/session";
// NOTE: adjust this import to match how lib/supabase.ts actually exports
// its client (e.g. `import { supabase } from "@/lib/supabase"` vs a
// `createClient()` factory). Wire up whichever is already in the file.
import { supabase } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  try {
    const { address } = await requireSession(request);

    const { data: user, error } = await supabase
      .from("users")
      .select("*")
      .eq("address", address)
      .maybeSingle();

    if (error) {
      console.error("[GET /api/auth/me] supabase error:", error);
      return NextResponse.json(
        { error: "Failed to load user" },
        { status: 500 }
      );
    }

    if (!user) {
      // Valid cookie, but no matching users row (shouldn't happen once
      // POST /api/auth/verify upserts on first sign-in — fail closed).
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json(user);
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("[GET /api/auth/me] unexpected error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
