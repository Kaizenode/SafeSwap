import { NextRequest, NextResponse } from "next/server";
import {
  trustlessWork,
  TrustlessWorkApiError,
  type ApproveMilestoneRequest,
} from "@/lib/trustless-work";

function getErrorResponse(error: unknown) {
  if (error instanceof TrustlessWorkApiError) {
    return NextResponse.json({ error: error.details }, { status: error.status });
  }

  const message = error instanceof Error ? error.message : "Unable to approve milestone";
  return NextResponse.json({ error: message }, { status: 500 });
}

export async function POST(request: NextRequest) {
  let body: Partial<ApproveMilestoneRequest>;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON" }, { status: 400 });
  }

  if (
    typeof body.contractId !== "string" ||
    !body.contractId.trim() ||
    typeof body.approver !== "string" ||
    !body.approver.trim() ||
    typeof body.milestoneIndex !== "string" ||
    !body.milestoneIndex.trim()
  ) {
    return NextResponse.json(
      { error: "contractId, approver, and milestoneIndex are required" },
      { status: 400 }
    );
  }

  try {
    const data = await trustlessWork.escrow.approveMilestone({
      contractId: body.contractId,
      approver: body.approver,
      milestoneIndex: body.milestoneIndex,
    });

    if (!data.unsignedTransaction) {
      return NextResponse.json(
        { error: "Approve transaction was not returned by the escrow service" },
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
