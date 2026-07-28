import {
  signAndSubmitTransaction,
  SignAndSubmitError,
  type SignTransaction,
} from "./stellar-transaction";

export const DISPUTE_REASON_MAX_LENGTH = 500;

export type EscrowDisputeStatus =
  | "idle"
  | "requesting-signature"
  | "submitting"
  | "disputed"
  | "failed";

export interface RaiseEscrowDisputeInput {
  contractId: string;
  signer: string;
  reason: string;
}

export type SignEscrowTransaction = SignTransaction;

export class EscrowDisputeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EscrowDisputeError";
  }
}

interface DisputeResponse {
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

function validateDisputeInput({ contractId, signer, reason }: RaiseEscrowDisputeInput) {
  if (!contractId.trim() || !signer.trim()) {
    throw new EscrowDisputeError("A contract ID and signer wallet are required");
  }

  const trimmedReason = reason.trim();
  if (!trimmedReason) {
    throw new EscrowDisputeError("A reason is required to open a dispute");
  }

  if (reason.length > DISPUTE_REASON_MAX_LENGTH) {
    throw new EscrowDisputeError(
      `Reason must be at most ${DISPUTE_REASON_MAX_LENGTH} characters`
    );
  }
}

function mapSubmitStatus(status: string): EscrowDisputeStatus | null {
  switch (status) {
    case "requesting-signature":
    case "submitting":
    case "failed":
      return status;
    case "submitted":
      return "disputed";
    default:
      return null;
  }
}

export async function raiseEscrowDispute(
  input: RaiseEscrowDisputeInput,
  signTransaction: SignEscrowTransaction,
  onStatusChange?: (status: EscrowDisputeStatus) => void
): Promise<void> {
  validateDisputeInput(input);

  const disputeResponse = await fetch("/api/escrow/single-release/v2/dispute", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  if (!disputeResponse.ok) {
    onStatusChange?.("failed");
    throw new EscrowDisputeError(await readError(disputeResponse));
  }

  const { unsignedXdr } = (await disputeResponse.json()) as DisputeResponse;
  if (!unsignedXdr) {
    onStatusChange?.("failed");
    throw new EscrowDisputeError("Escrow service did not return a dispute transaction");
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
      throw new EscrowDisputeError(error.message);
    }
    throw error;
  }
}
