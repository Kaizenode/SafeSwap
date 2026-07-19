import { NextRequest, NextResponse } from "next/server";
import {
  trustlessWork,
  TrustlessWorkApiError,
  type FundSingleReleaseEscrowRequest,
} from "@/lib/trustless-work";

function isPositiveAmount(value: unknown): value is string | number {
  if (typeof value === "number") {
    return Number.isFinite(value) && value > 0;
  }

  return (
    typeof value === "string" &&
    /^\d+(?:\.\d+)?$/.test(value) &&
    Number.isFinite(Number(value)) &&
    Number(value) > 0
  );
}

function getErrorResponse(error: unknown) {
  if (error instanceof TrustlessWorkApiError) {
    return NextResponse.json({ error: error.details }, { status: error.status });
  }

  const message = error instanceof Error ? error.message : "Unable to fund escrow";
  return NextResponse.json({ error: message }, { status: 500 });
}

export async function POST(request: NextRequest) {
  let body: Partial<FundSingleReleaseEscrowRequest>;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON" }, { status: 400 });
  }

  if (
    typeof body.contractId !== "string" ||
    !body.contractId.trim() ||
    typeof body.signer !== "string" ||
    !body.signer.trim() ||
    !isPositiveAmount(body.amount)
  ) {
    return NextResponse.json(
      { error: "contractId, signer, and a positive decimal amount are required" },
      { status: 400 }
    );
  }

  try {
    const data = await trustlessWork.escrow.fundSingleReleaseV2({
      contractId: body.contractId,
      signer: body.signer,
      amount: body.amount,
    });

    if (!data.unsignedTransaction) {
      return NextResponse.json(
        { error: "Funding transaction was not returned by the escrow service" },
        { status: 502 }
      );
    }

    return NextResponse.json({
      unsignedXdr: data.unsignedTransaction,
    });
  } catch (error) {
    return getErrorResponse(error);
  }
}
