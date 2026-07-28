import { NextRequest, NextResponse } from "next/server";
import { trustlessWork, TrustlessWorkApiError } from "@/lib/trustless-work";

const STELLAR_ADDRESS = /^[A-Z0-9]{56}$/;

export async function GET(request: NextRequest) {
  const contractId = request.nextUrl.searchParams.get("contractId")?.trim() ?? "";

  if (!contractId) {
    return NextResponse.json({ error: "contractId is required" }, { status: 400 });
  }

  if (!STELLAR_ADDRESS.test(contractId)) {
    return NextResponse.json(
      { error: "contractId must be a 56-character Stellar contract ID" },
      { status: 400 }
    );
  }

  try {
    const data = await trustlessWork.escrow.getByContractId(contractId);
    return NextResponse.json({ escrow: data ?? null });
  } catch (error) {
    if (error instanceof TrustlessWorkApiError) {
      return NextResponse.json({ error: error.details }, { status: error.status });
    }

    const message = error instanceof Error ? error.message : "Unable to fetch escrow";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
