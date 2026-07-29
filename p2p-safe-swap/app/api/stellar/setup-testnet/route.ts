import { NextRequest, NextResponse } from "next/server";
import {
  Asset,
  BASE_FEE,
  Horizon,
  Networks,
  Operation,
  TransactionBuilder,
} from "@stellar/stellar-sdk";

const HORIZON_URL = "https://horizon-testnet.stellar.org";
const USDC_ISSUER = "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5";
const USDC_CODE = "USDC";

async function accountExists(publicKey: string): Promise<boolean> {
  const res = await fetch(`${HORIZON_URL}/accounts/${publicKey}`);
  return res.ok;
}

async function fundWithFriendbot(publicKey: string): Promise<void> {
  const res = await fetch(
    `https://friendbot.stellar.org/?addr=${encodeURIComponent(publicKey)}`
  );
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Friendbot failed: ${body}`);
  }
}

interface SetupRequestBody {
  publicKey?: unknown;
}

export async function POST(request: NextRequest) {
  let body: SetupRequestBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Request body must be valid JSON" },
      { status: 400 }
    );
  }

  const { publicKey } = body;
  if (typeof publicKey !== "string" || !publicKey.trim()) {
    return NextResponse.json({ error: "publicKey is required" }, { status: 400 });
  }

  try {
    if (!(await accountExists(publicKey))) {
      await fundWithFriendbot(publicKey);
    }

    const server = new Horizon.Server(HORIZON_URL);
    const account = await server.loadAccount(publicKey);

    const hasTrustline = account.balances.some(
      (b) =>
        "asset_code" in b &&
        b.asset_code === USDC_CODE &&
        "asset_issuer" in b &&
        b.asset_issuer === USDC_ISSUER
    );

    if (hasTrustline) {
      return NextResponse.json({ alreadySetUp: true });
    }

    const usdc = new Asset(USDC_CODE, USDC_ISSUER);
    const tx = new TransactionBuilder(account, {
      fee: BASE_FEE,
      networkPassphrase: Networks.TESTNET,
    })
      .addOperation(Operation.changeTrust({ asset: usdc }))
      .setTimeout(180)
      .build();

    return NextResponse.json({
      unsignedXdr: tx.toXDR(),
      alreadySetUp: false,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to prepare testnet setup";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
