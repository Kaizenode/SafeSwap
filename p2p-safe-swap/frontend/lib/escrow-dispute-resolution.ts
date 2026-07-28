export type EscrowDisputeResolutionStatus =
  | "idle"
  | "requesting-signature"
  | "submitting"
  | "resolved"
  | "failed";

export interface EscrowDisputeDistribution {
  address: string;
  amount: number;
}

export interface ResolveEscrowDisputeInput {
  contractId: string;
  disputeResolver: string;
  distributions: EscrowDisputeDistribution[];
}

export type SignEscrowTransaction = (unsignedXdr: string) => Promise<string>;

export class EscrowDisputeResolutionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EscrowDisputeResolutionError";
  }
}

interface ResolveDisputeResponse {
  unsignedXdr: string;
}

interface ErrorResponse {
  error?: string;
}

async function readError(response: Response): Promise<string> {
  const fallback = `Request failed (${response.status})`;

  try {
    const body = (await response.json()) as ErrorResponse;
    return body.error || fallback;
  } catch {
    return fallback;
  }
}

function isFinitePositiveNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function validateInput({ contractId, disputeResolver, distributions }: ResolveEscrowDisputeInput) {
  if (!contractId.trim() || !disputeResolver.trim()) {
    throw new EscrowDisputeResolutionError("A contract ID and dispute resolver wallet are required");
  }

  if (!Array.isArray(distributions) || distributions.length === 0) {
    throw new EscrowDisputeResolutionError("At least one distribution recipient is required");
  }

  distributions.forEach((distribution, index) => {
    if (!distribution.address.trim()) {
      throw new EscrowDisputeResolutionError(`Distribution ${index + 1} is missing a recipient address`);
    }

    if (!isFinitePositiveNumber(distribution.amount)) {
      throw new EscrowDisputeResolutionError(`Distribution ${index + 1} must use a positive amount`);
    }
  });
}

function toNumber(value: unknown): number {
  return typeof value === "number" ? value : Number(value);
}

function asBalanceValue(payload: unknown): number {
  if (Array.isArray(payload)) {
    return toNumber(payload[0] ?? 0);
  }

  if (payload && typeof payload === "object") {
    const record = payload as Record<string, unknown>;

    for (const candidate of [record.balance, record.amount, record.value, record.total]) {
      if (typeof candidate === "number" && Number.isFinite(candidate)) {
        return candidate;
      }

      if (typeof candidate === "string" && candidate.trim()) {
        const parsed = Number(candidate);
        if (Number.isFinite(parsed)) return parsed;
      }
    }
  }

  return 0;
}

export async function resolveEscrowDispute(
  input: ResolveEscrowDisputeInput,
  signTransaction: SignEscrowTransaction,
  onStatusChange?: (status: EscrowDisputeResolutionStatus) => void
): Promise<void> {
  validateInput(input);
  onStatusChange?.("requesting-signature");

  const balanceResponse = await fetch("/api/escrow/helper/get-multiple-escrow-balance", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ addresses: [input.contractId] }),
  });

  if (!balanceResponse.ok) {
    onStatusChange?.("failed");
    throw new EscrowDisputeResolutionError(await readError(balanceResponse));
  }

  const balancePayload = await balanceResponse.json();
  const availableBalance = asBalanceValue(balancePayload);
  const totalDistribution = input.distributions.reduce((sum, distribution) => sum + distribution.amount, 0);

  if (!Number.isFinite(availableBalance) || availableBalance <= 0) {
    onStatusChange?.("failed");
    throw new EscrowDisputeResolutionError("The escrow balance could not be determined");
  }

  if (Math.abs(totalDistribution - availableBalance) > 1e-8) {
    onStatusChange?.("failed");
    throw new EscrowDisputeResolutionError(
      `Distributions must sum to the escrow balance of ${availableBalance}`
    );
  }

  const resolveResponse = await fetch("/api/escrow/single-release/v2/resolve-dispute", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  if (!resolveResponse.ok) {
    onStatusChange?.("failed");
    throw new EscrowDisputeResolutionError(await readError(resolveResponse));
  }

  const { unsignedXdr } = (await resolveResponse.json()) as ResolveDisputeResponse;
  if (!unsignedXdr) {
    onStatusChange?.("failed");
    throw new EscrowDisputeResolutionError("Escrow service did not return a dispute-resolution transaction");
  }

  let signedXdr: string;
  try {
    signedXdr = await signTransaction(unsignedXdr);
  } catch (error) {
    onStatusChange?.("failed");
    const message = error instanceof Error ? error.message : "Wallet signature was rejected";
    throw new EscrowDisputeResolutionError(message);
  }

  if (!signedXdr) {
    onStatusChange?.("failed");
    throw new EscrowDisputeResolutionError("Wallet did not return a signed transaction");
  }

  onStatusChange?.("submitting");
  const submissionResponse = await fetch("/api/stellar/send-transaction", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ signedXdr }),
  });

  if (!submissionResponse.ok) {
    onStatusChange?.("failed");
    throw new EscrowDisputeResolutionError(await readError(submissionResponse));
  }

  onStatusChange?.("resolved");
}
