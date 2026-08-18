import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  const address = request.nextUrl.searchParams.get("address") || request.cookies.get("safeswap.address")?.value;
  const cookieMode = request.cookies.get("safeswap.preferred_mode")?.value as "buy" | "sell" | undefined;

  let preferred_mode: "buy" | "sell" | null = cookieMode ?? null;

  if (address && process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    try {
      const { data, error } = await supabase
        .from("users")
        .select("preferred_mode")
        .eq("address", address)
        .maybeSingle();

      if (!error && data?.preferred_mode) {
        preferred_mode = data.preferred_mode as "buy" | "sell";
      }
    } catch {
      // Ignore Supabase query errors (e.g. if DB table is not yet initialized)
    }
  }

  return NextResponse.json({
    address: address || null,
    preferred_mode,
  });
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { preferred_mode, address: bodyAddress } = body || {};

    if (preferred_mode !== "buy" && preferred_mode !== "sell") {
      return NextResponse.json(
        { error: "Invalid preferred_mode. Expected 'buy' or 'sell'." },
        { status: 400 }
      );
    }

    const address =
      bodyAddress ||
      request.nextUrl.searchParams.get("address") ||
      request.cookies.get("safeswap.address")?.value;

    if (address && process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      try {
        await supabase
          .from("users")
          .upsert({ address, preferred_mode }, { onConflict: "address" });
      } catch {
        // Ignore DB errors if table isn't fully initialized
      }
    }

    const response = NextResponse.json({
      success: true,
      address: address || null,
      preferred_mode,
    });

    // Set cookie for persistence across sessions
    response.cookies.set("safeswap.preferred_mode", preferred_mode, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365, // 1 year
      sameSite: "lax",
    });

    if (address) {
      response.cookies.set("safeswap.address", address, {
        path: "/",
        maxAge: 60 * 60 * 24 * 365,
        sameSite: "lax",
      });
    }

    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update user preferred mode";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
