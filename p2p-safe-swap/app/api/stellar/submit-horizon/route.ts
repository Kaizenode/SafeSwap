import { NextRequest, NextResponse } from "next/server";
import { Horizon, TransactionBuilder, Networks } from "@stellar/stellar-sdk";

const HORIZON_URL = "https://horizon-testnet.stellar.org";

interface SubmitBody {
  signedXdr?: unknown;
}

export async function POST(request: NextRequest) {
  let body: SubmitBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Request body must be valid JSON" },
      { status: 400 }
    );
  }

  if (typeof body.signedXdr !== "string" || !body.signedXdr.trim()) {
    return NextResponse.json({ error: "signedXdr is required" }, { status: 400 });
  }

  try {
    const server = new Horizon.Server(HORIZON_URL);
    const tx = TransactionBuilder.fromXDR(body.signedXdr, Networks.TESTNET);
    const result = await server.submitTransaction(tx);

    return NextResponse.json({
      txHash: result.hash,
      ledger: result.ledger ?? null,
      raw: result as unknown,
    });
  } catch (error) {
    const anyErr = error as { response?: { data?: unknown }; message?: string };
    const details =
      anyErr.response?.data ??
      (error instanceof Error ? error.message : "Failed to submit to Horizon");
    return NextResponse.json({ error: details }, { status: 500 });
  }
}
