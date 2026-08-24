import { NextRequest, NextResponse } from "next/server";
import {
  trustlessWork,
  TrustlessWorkApiError,
  type DeploySingleReleaseV2Request,
} from "@/lib/trustless-work";
import { withRequest } from "@/lib/log";
import type { Logger } from "pino";

function getPlatformAddresses(fallbackSigner: string) {
  const platformAddress = process.env.PLATFORM_WALLET_ADDRESS || fallbackSigner;
  const disputeResolver = process.env.DISPUTE_RESOLVER_ADDRESS || fallbackSigner;

  return { platformAddress, disputeResolver };
}

interface DeployRequestBody {
  signer: string;
  orderId: string;
  buyerAddress: string;
  sellerAddress: string;
  amount: number;
  platformFee: number;
  trustline: {
    address: string;
    symbol: string;
  };
}

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

function isPositiveNumber(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v) && v > 0;
}

function validateBody(
  raw: unknown
): { ok: true; body: DeployRequestBody } | { ok: false; message: string } {
  if (!raw || typeof raw !== "object") {
    return { ok: false, message: "Request body must be a JSON object" };
  }

  const b = raw as Record<string, unknown>;

  if (!isNonEmptyString(b.signer)) return { ok: false, message: "signer is required" };
  if (!isNonEmptyString(b.orderId)) return { ok: false, message: "orderId is required" };
  if (!isNonEmptyString(b.buyerAddress)) return { ok: false, message: "buyerAddress is required" };
  if (!isNonEmptyString(b.sellerAddress))
    return { ok: false, message: "sellerAddress is required" };
  if (!isPositiveNumber(b.amount)) return { ok: false, message: "amount must be a positive number" };
  if (typeof b.platformFee !== "number" || b.platformFee < 0 || b.platformFee >= 100)
    return { ok: false, message: "platformFee must be a number between 0 and 99" };

  const tl = b.trustline as Record<string, unknown> | undefined;
  if (!tl || !isNonEmptyString(tl.address) || !isNonEmptyString(tl.symbol)) {
    return { ok: false, message: "trustline.address and trustline.symbol are required" };
  }

  return {
    ok: true,
    body: {
      signer: b.signer as string,
      orderId: b.orderId as string,
      buyerAddress: b.buyerAddress as string,
      sellerAddress: b.sellerAddress as string,
      amount: b.amount as number,
      platformFee: b.platformFee as number,
      trustline: { address: tl.address as string, symbol: tl.symbol as string },
    },
  };
}

function getErrorResponse(error: unknown, log: Logger) {
  if (error instanceof TrustlessWorkApiError) {
    log.error(
      { status: error.status, details: error.details },
      "trustless work API error on deploy"
    );
    return NextResponse.json({ error: error.details }, { status: error.status });
  }

  const message =
    error instanceof Error ? error.message : "Unable to deploy escrow";
  log.error({ err: error }, "unexpected error deploying escrow");
  return NextResponse.json({ error: message }, { status: 500 });
}

export async function POST(request: NextRequest) {
  const log = withRequest(request);

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    log.warn("invalid JSON body on deploy");
    return NextResponse.json(
      { error: "Request body must be valid JSON" },
      { status: 400 }
    );
  }

  const validation = validateBody(raw);
  if (!validation.ok) {
    log.warn({ reason: validation.message }, "deploy validation failed");
    return NextResponse.json({ error: validation.message }, { status: 400 });
  }

  const { signer, orderId, buyerAddress, sellerAddress, amount, platformFee, trustline } =
    validation.body;

  const { platformAddress, disputeResolver } = getPlatformAddresses(signer);

  const deployPayload: DeploySingleReleaseV2Request = {
    signer,
    engagementId: orderId,
    title: `SafeSwap P2P Order ${orderId}`,
    description: `P2P escrow for order ${orderId} — fiat payment confirmation`,
    roles: {
      approver: sellerAddress,
      serviceProvider: buyerAddress,
      platformAddress,
      releaseSigner: sellerAddress,
      disputeResolver,
      receiver: buyerAddress,
    },
    amount,
    platformFee,
    milestones: [
      {
        description: "Fiat payment confirmed",
        status: "pending",
        approved: false,
      },
    ],
    trustline,
  };

  log.info({ orderId, signer, amount }, "deploying single-release escrow");

  try {
    const data = await trustlessWork.escrow.deploySingleReleaseV2(deployPayload);

    if (!data.unsignedTransaction) {
      log.error({ orderId, contractId: data.contractId }, "escrow service returned no unsignedTransaction");
      return NextResponse.json(
        { error: "Escrow service did not return a deployment transaction" },
        { status: 502 }
      );
    }

    log.info({ orderId, contractId: data.contractId }, "escrow deployed");

    return NextResponse.json(
      {
        unsignedXdr: data.unsignedTransaction,
        contractId: data.contractId,
      },
      { status: 201 }
    );
  } catch (error) {
    return getErrorResponse(error, log);
  }
}