import {
  signAndSubmitTransaction,
  SignAndSubmitError,
  type SignTransaction,
} from "./stellar-transaction";

export type EscrowReleaseStatus =
  | "idle"
  | "requesting-signature"
  | "submitting"
  | "released"
  | "failed";

export interface ReleaseEscrowFundsInput {
  contractId: string;
  releaseSigner: string;
}

export type SignEscrowTransaction = SignTransaction;

export class EscrowReleaseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EscrowReleaseError";
  }
}

interface ReleaseResponse {
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

function validateReleaseInput({ contractId, releaseSigner }: ReleaseEscrowFundsInput) {
  if (!contractId.trim() || !releaseSigner.trim()) {
    throw new EscrowReleaseError("A contract ID and release signer are required");
  }
}

function mapSubmitStatus(status: string): EscrowReleaseStatus | null {
  switch (status) {
    case "requesting-signature":
    case "submitting":
    case "failed":
      return status;
    case "submitted":
      return "released";
    default:
      return null;
  }
}

export async function releaseEscrowFunds(
  input: ReleaseEscrowFundsInput,
  signTransaction: SignEscrowTransaction,
  onStatusChange?: (status: EscrowReleaseStatus) => void
): Promise<void> {
  validateReleaseInput(input);

  const releaseResponse = await fetch("/api/escrow/single-release/v2/release-funds", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  if (!releaseResponse.ok) {
    onStatusChange?.("failed");
    throw new EscrowReleaseError(await readError(releaseResponse));
  }

  const { unsignedXdr } = (await releaseResponse.json()) as ReleaseResponse;
  if (!unsignedXdr) {
    onStatusChange?.("failed");
    throw new EscrowReleaseError("Escrow service did not return a release transaction");
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
      throw new EscrowReleaseError(error.message);
    }
    throw error;
  }
}
