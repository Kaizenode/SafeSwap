import {
  signAndSubmitTransaction,
  SignAndSubmitError,
  type SignTransaction,
} from "./stellar-transaction";
import { validateDistributionsAgainstBalance, type DistributionEntry } from "./escrow-balance";

export type EscrowResolveDisputeStatus =
  | "idle"
  | "requesting-signature"
  | "submitting"
  | "resolved"
  | "failed";

export interface ResolveDisputeInput {
  contractId: string;
  disputeResolver: string;
  distributions: DistributionEntry[];
}

export type SignEscrowTransaction = SignTransaction;

export class EscrowResolveDisputeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EscrowResolveDisputeError";
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

function validateResolveInput({
  contractId,
  disputeResolver,
  distributions,
}: ResolveDisputeInput): void {
  if (!contractId.trim()) {
    throw new EscrowResolveDisputeError("A contract ID is required");
  }

  if (!disputeResolver.trim()) {
    throw new EscrowResolveDisputeError("A dispute resolver wallet is required");
  }

  if (!Array.isArray(distributions) || distributions.length === 0) {
    throw new EscrowResolveDisputeError("At least one distribution entry is required");
  }

  for (const entry of distributions) {
    if (!entry.address || !entry.address.trim()) {
      throw new EscrowResolveDisputeError("All distribution entries must have a valid address");
    }
    if (typeof entry.amount !== "number" || entry.amount <= 0) {
      throw new EscrowResolveDisputeError(
        "All distribution entries must have a positive amount"
      );
    }
  }
}

function mapSubmitStatus(status: string): EscrowResolveDisputeStatus | null {
  switch (status) {
    case "requesting-signature":
    case "submitting":
    case "failed":
      return status;
    case "submitted":
      return "resolved";
    default:
      return null;
  }
}

export async function resolveEscrowDispute(
  input: ResolveDisputeInput,
  escrowBalance: number,
  signTransaction: SignEscrowTransaction,
  onStatusChange?: (status: EscrowResolveDisputeStatus) => void
): Promise<void> {
  validateResolveInput(input);

  // Client-side validation: ensure distributions sum to known on-chain balance
  const validation = validateDistributionsAgainstBalance(
    input.distributions,
    escrowBalance
  );
  if (!validation.isValid) {
    onStatusChange?.("failed");
    throw new EscrowResolveDisputeError(validation.message || "Invalid distributions");
  }

  const resolveResponse = await fetch(
    "/api/escrow/single-release/v2/resolve-dispute",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    }
  );

  if (!resolveResponse.ok) {
    onStatusChange?.("failed");
    throw new EscrowResolveDisputeError(await readError(resolveResponse));
  }

  const { unsignedXdr } = (await resolveResponse.json()) as ResolveDisputeResponse;
  if (!unsignedXdr) {
    onStatusChange?.("failed");
    throw new EscrowResolveDisputeError(
      "Escrow service did not return a dispute resolution transaction"
    );
  }

  try {
    await signAndSubmitTransaction(unsignedXdr, signTransaction, {
      onStatusChange: (status) => {
        const mapped = mapSubmitStatus(status);
        if (mapped) onStatusChange?.(mapped);
      },
    });
  } catch (error) {
    if (error instanceof SignAndSubmitError) {
      throw new EscrowResolveDisputeError(error.message);
    }
    throw error;
  }
}
