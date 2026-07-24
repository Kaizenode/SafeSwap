import { NextRequest, NextResponse } from "next/server";
import { trustlessWork, TrustlessWorkApiError } from "@/lib/trustless-work";

export async function POST(request: NextRequest) {
  let body: { signedXdr?: unknown };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON" }, { status: 400 });
  }

  if (typeof body.signedXdr !== "string" || !body.signedXdr.trim()) {
    return NextResponse.json({ error: "signedXdr is required" }, { status: 400 });
  }

  try {
    const data = await trustlessWork.stellar.sendTransaction({
      signedXdr: body.signedXdr,
    });
    return NextResponse.json(data);
  } catch (error) {
    if (error instanceof TrustlessWorkApiError) {
      return NextResponse.json({ error: error.details }, { status: error.status });
    }

    const message = error instanceof Error ? error.message : "Unable to submit transaction";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
