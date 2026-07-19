import { NextRequest, NextResponse } from "next/server";
import { trustlessWork } from "@/lib/trustless-work";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = await trustlessWork.escrow.initialize(body);
    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
