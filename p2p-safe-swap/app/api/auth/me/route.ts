import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { supabaseServer } from "@/lib/supabase-server";

export async function GET(request: NextRequest) {
  const session = getSession(request);
  if (!session) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const { data: user, error } = await supabaseServer
    .from("users")
    .select("*")
    .eq("address", session.address)
    .single();
  if (error || !user) return NextResponse.json({ error: "User not found" }, { status: 404 });
  return NextResponse.json(user);
}