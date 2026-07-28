import { NextRequest, NextResponse } from "next/server";
import { trustlessWork, TrustlessWorkApiError } from "@/lib/trustless-work";

const STELLAR_ADDRESS = /^[A-Z0-9]{56}$/;

interface RawBalanceEntry {
  address?: unknown;
  balance?: unknown;
}

export interface NormalizedEscrowBalance {
  address: string;
  balance: number;
}

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

function errorResponse(error: unknown) {
  if (error instanceof TrustlessWorkApiError) {
    return NextResponse.json({ error: error.details }, { status: error.status });
  }

  const message = error instanceof Error ? error.message : "Unable to fetch escrow balances";
  return NextResponse.json({ error: message }, { status: 500 });
}

function extractEntries(raw: unknown): RawBalanceEntry[] {
  if (Array.isArray(raw)) return raw as RawBalanceEntry[];
  if (raw && typeof raw === "object") {
    const record = raw as { balances?: unknown; data?: unknown };
    if (Array.isArray(record.balances)) return record.balances as RawBalanceEntry[];
    if (Array.isArray(record.data)) return record.data as RawBalanceEntry[];
  }
  return [];
}

function normalize(raw: unknown): NormalizedEscrowBalance[] {
  return extractEntries(raw)
    .map((entry): NormalizedEscrowBalance | null => {
      if (typeof entry.address !== "string") return null;

      const parsed =
        typeof entry.balance === "number"
          ? entry.balance
          : typeof entry.balance === "string" && entry.balance.trim() !== ""
            ? Number(entry.balance)
            : Number.NaN;

      if (!Number.isFinite(parsed)) return null;
      return { address: entry.address, balance: parsed };
    })
    .filter((entry): entry is NormalizedEscrowBalance => entry !== null);
}

export async function GET(request: NextRequest) {
  const bracketed = request.nextUrl.searchParams.getAll("addresses[]");
  const flat = request.nextUrl.searchParams.getAll("addresses");
  const requested = bracketed.length > 0 ? bracketed : flat;
  const unique = Array.from(
    new Set(requested.map((address) => address.trim()).filter(Boolean))
  );

  if (unique.length === 0) {
    return badRequest("At least one escrow address is required");
  }

  if (unique.some((address) => !STELLAR_ADDRESS.test(address))) {
    return badRequest("Each address must be a 56-character Stellar contract ID");
  }

  try {
    const raw = await trustlessWork.helper.getMultipleEscrowBalance(unique);
    return NextResponse.json({ balances: normalize(raw) });
  } catch (error) {
    return errorResponse(error);
  }
}
