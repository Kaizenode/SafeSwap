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

export type SignEscrowTransaction = (unsignedXdr: string) => Promise<string>;

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

export async function raiseEscrowDispute(
  input: RaiseEscrowDisputeInput,
  signTransaction: SignEscrowTransaction,
  onStatusChange?: (status: EscrowDisputeStatus) => void
): Promise<void> {
  validateDisputeInput(input);
  onStatusChange?.("requesting-signature");

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

  let signedXdr: string;
  try {
    signedXdr = await signTransaction(unsignedXdr);
  } catch (error) {
    onStatusChange?.("failed");
    const message = error instanceof Error ? error.message : "Wallet signature was rejected";
    throw new EscrowDisputeError(message);
  }

  if (!signedXdr) {
    onStatusChange?.("failed");
    throw new EscrowDisputeError("Wallet did not return a signed transaction");
  }

  onStatusChange?.("submitting");
  const submissionResponse = await fetch("/api/stellar/send-transaction", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ signedXdr }),
  });

  if (!submissionResponse.ok) {
    onStatusChange?.("failed");
    throw new EscrowDisputeError(await readError(submissionResponse));
  }

  onStatusChange?.("disputed");
}
