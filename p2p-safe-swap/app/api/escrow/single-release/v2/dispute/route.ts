import { NextRequest, NextResponse } from "next/server";
import {
  DISPUTE_REASON_MAX_LENGTH,
  trustlessWork,
  TrustlessWorkApiError,
} from "@/lib/trustless-work";

interface DisputeRequestBody {
  contractId?: unknown;
  signer?: unknown;
  reason?: unknown;
}

function getErrorResponse(error: unknown) {
  if (error instanceof TrustlessWorkApiError) {
    return NextResponse.json({ error: error.details }, { status: error.status });
  }

  const message = error instanceof Error ? error.message : "Unable to open dispute";
  return NextResponse.json({ error: message }, { status: 500 });
}

export async function POST(request: NextRequest) {
  let body: DisputeRequestBody;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON" }, { status: 400 });
  }

  if (
    typeof body.contractId !== "string" ||
    !body.contractId.trim() ||
    typeof body.signer !== "string" ||
    !body.signer.trim()
  ) {
    return NextResponse.json(
      { error: "contractId and signer are required" },
      { status: 400 }
    );
  }

  if (typeof body.reason !== "string" || !body.reason.trim()) {
    return NextResponse.json(
      { error: "reason is required" },
      { status: 400 }
    );
  }

  if (body.reason.length > DISPUTE_REASON_MAX_LENGTH) {
    return NextResponse.json(
      { error: `reason must be at most ${DISPUTE_REASON_MAX_LENGTH} characters` },
      { status: 400 }
    );
  }

  try {
    const data = await trustlessWork.escrow.disputeSingleReleaseV2({
      contractId: body.contractId,
      signer: body.signer,
    });

    if (!data.unsignedTransaction) {
      return NextResponse.json(
        { error: "Dispute transaction was not returned by the escrow service" },
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
