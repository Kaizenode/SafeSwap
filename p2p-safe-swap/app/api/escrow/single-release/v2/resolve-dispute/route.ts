import { NextRequest, NextResponse } from "next/server";
import {
  trustlessWork,
  TrustlessWorkApiError,
  type ResolveDisputeRequest,
} from "@/lib/trustless-work";

function getErrorResponse(error: unknown) {
  if (error instanceof TrustlessWorkApiError) {
    return NextResponse.json({ error: error.details }, { status: error.status });
  }

  const message = error instanceof Error ? error.message : "Unable to resolve dispute";
  return NextResponse.json({ error: message }, { status: 500 });
}

function isString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isFinitePositiveNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

export async function POST(request: NextRequest) {
  let body: Partial<ResolveDisputeRequest> & {
    distributions?: Array<{ address?: unknown; amount?: unknown }>;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON" }, { status: 400 });
  }

  if (!isString(body.contractId) || !isString(body.disputeResolver)) {
    return NextResponse.json(
      { error: "contractId and disputeResolver are required" },
      { status: 400 }
    );
  }

  if (!Array.isArray(body.distributions) || body.distributions.length === 0) {
    return NextResponse.json(
      { error: "distributions must include at least one recipient" },
      { status: 400 }
    );
  }

  const distributions = body.distributions.map((distribution) => ({
    address: typeof distribution.address === "string" ? distribution.address.trim() : "",
    amount: typeof distribution.amount === "number" ? distribution.amount : Number(distribution.amount),
  }));

  if (distributions.some((distribution) => !distribution.address || !isFinitePositiveNumber(distribution.amount))) {
    return NextResponse.json(
      { error: "Each distribution requires a non-empty address and positive amount" },
      { status: 400 }
    );
  }

  try {
    const data = await trustlessWork.escrow.resolveDispute({
      contractId: body.contractId,
      disputeResolver: body.disputeResolver,
      distributions,
    });

    if (!data.unsignedTransaction) {
      return NextResponse.json(
        { error: "Resolution transaction was not returned by the escrow service" },
        { status: 502 }
      );
    }

    return NextResponse.json({ unsignedXdr: data.unsignedTransaction });
  } catch (error) {
    return getErrorResponse(error);
  }
}
