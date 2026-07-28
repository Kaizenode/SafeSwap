import { NextRequest, NextResponse } from "next/server";
import {
  trustlessWork,
  TrustlessWorkApiError,
  type ReleaseFundsRequest,
} from "@/lib/trustless-work";

function getErrorResponse(error: unknown) {
  if (error instanceof TrustlessWorkApiError) {
    return NextResponse.json({ error: error.details }, { status: error.status });
  }

  const message = error instanceof Error ? error.message : "Unable to release funds";
  return NextResponse.json({ error: message }, { status: 500 });
}

export async function POST(request: NextRequest) {
  let body: Partial<ReleaseFundsRequest>;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON" }, { status: 400 });
  }

  if (
    typeof body.contractId !== "string" ||
    !body.contractId.trim() ||
    typeof body.releaseSigner !== "string" ||
    !body.releaseSigner.trim()
  ) {
    return NextResponse.json(
      { error: "contractId and releaseSigner are required" },
      { status: 400 }
    );
  }

  try {
    const data = await trustlessWork.escrow.releaseFunds({
      contractId: body.contractId,
      releaseSigner: body.releaseSigner,
    });

    if (!data.unsignedTransaction) {
      return NextResponse.json(
        { error: "Release transaction was not returned by the escrow service" },
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
