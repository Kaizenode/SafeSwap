import { NextRequest, NextResponse } from "next/server";
import {
  trustlessWork,
  TrustlessWorkApiError,
  type ResolveDisputeRequest,
} from "@/lib/trustless-work";

interface ResolveDisputeRequestBody {
  contractId?: unknown;
  disputeResolver?: unknown;
  distributions?: unknown;
}

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

function isPositiveNumber(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v) && v > 0;
}

function isValidDistribution(v: unknown): v is Array<{ address: string; amount: number }> {
  if (!Array.isArray(v)) return false;
  return v.every(
    (item) =>
      item &&
      typeof item === "object" &&
      isNonEmptyString(item.address) &&
      isPositiveNumber(item.amount)
  );
}

function getErrorResponse(error: unknown) {
  if (error instanceof TrustlessWorkApiError) {
    return NextResponse.json({ error: error.details }, { status: error.status });
  }

  const message =
    error instanceof Error ? error.message : "Unable to resolve dispute";
  return NextResponse.json({ error: message }, { status: 500 });
}

export async function POST(request: NextRequest) {
  let body: ResolveDisputeRequestBody;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON" }, { status: 400 });
  }

  if (
    typeof body.contractId !== "string" ||
    !body.contractId.trim() ||
    typeof body.disputeResolver !== "string" ||
    !body.disputeResolver.trim()
  ) {
    return NextResponse.json(
      { error: "contractId and disputeResolver are required" },
      { status: 400 }
    );
  }

  if (!isValidDistribution(body.distributions)) {
    return NextResponse.json(
      {
        error:
          "distributions must be a non-empty array of { address, amount } objects with positive amounts",
      },
      { status: 400 }
    );
  }

  try {
    const data = await trustlessWork.escrow.resolveDispute({
      contractId: body.contractId,
      disputeResolver: body.disputeResolver,
      distributions: body.distributions,
    } as ResolveDisputeRequest);

    if (!data.unsignedTransaction) {
      return NextResponse.json(
        { error: "Dispute resolution transaction was not returned by the escrow service" },
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
