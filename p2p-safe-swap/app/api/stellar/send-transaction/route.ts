import { NextRequest, NextResponse } from "next/server";
import { trustlessWork, TrustlessWorkApiError } from "@/lib/trustless-work";

function extractString(source: Record<string, unknown>, keys: readonly string[]): string | null {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === "string" && value.trim() !== "") return value;
  }
  return null;
}

function extractNumber(source: Record<string, unknown>, keys: readonly string[]): number | null {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim() !== "" && Number.isFinite(Number(value))) {
      return Number(value);
    }
  }
  return null;
}

function normalize(raw: unknown): {
  txHash: string | null;
  ledger: number | null;
  status: string | null;
  contractId: string | null;
  raw: Record<string, unknown>;
} {
  const record: Record<string, unknown> =
    raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const nested =
    record.data && typeof record.data === "object"
      ? (record.data as Record<string, unknown>)
      : record;

  return {
    txHash:
      extractString(nested, ["txHash", "hash", "transactionHash"]) ??
      extractString(record, ["txHash", "hash", "transactionHash"]),
    ledger:
      extractNumber(nested, ["ledger", "ledgerSequence", "ledgerNumber"]) ??
      extractNumber(record, ["ledger", "ledgerSequence", "ledgerNumber"]),
    status:
      extractString(nested, ["status"]) ?? extractString(record, ["status"]),
    contractId:
      extractString(nested, ["contractId"]) ?? extractString(record, ["contractId"]),
    raw: record,
  };
}

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

    return NextResponse.json(normalize(data));
  } catch (error) {
    if (error instanceof TrustlessWorkApiError) {
      return NextResponse.json({ error: error.details }, { status: error.status });
    }

    const message = error instanceof Error ? error.message : "Unable to submit transaction";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
