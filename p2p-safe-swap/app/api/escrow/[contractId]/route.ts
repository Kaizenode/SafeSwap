import { NextRequest, NextResponse } from "next/server";
import { trustlessWork } from "@/lib/trustless-work";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ contractId: string }> }
) {
  try {
    const { contractId } = await params;
    const data = await trustlessWork.escrow.getByContractId(contractId);
    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
