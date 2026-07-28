import { NextRequest, NextResponse } from "next/server";
import { trustlessWork, TrustlessWorkApiError } from "@/lib/trustless-work";

function getErrorResponse(error: unknown) {
  if (error instanceof TrustlessWorkApiError) {
    return NextResponse.json({ error: error.details }, { status: error.status });
  }

  const message = error instanceof Error ? error.message : "Unable to fetch escrow balances";
  return NextResponse.json({ error: message }, { status: 500 });
}

export async function POST(request: NextRequest) {
  let body: { addresses?: unknown };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON" }, { status: 400 });
  }

  if (!Array.isArray(body.addresses) || body.addresses.length === 0) {
    return NextResponse.json({ error: "addresses is required" }, { status: 400 });
  }

  const addresses = body.addresses.filter((address): address is string => typeof address === "string" && address.trim().length > 0);

  if (addresses.length === 0) {
    return NextResponse.json({ error: "addresses must contain at least one non-empty contract ID" }, { status: 400 });
  }

  try {
    const data = await trustlessWork.helper.getMultipleEscrowBalance(addresses);
    return NextResponse.json(data);
  } catch (error) {
    return getErrorResponse(error);
  }
}
