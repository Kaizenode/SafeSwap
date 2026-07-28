import {
  signAndSubmitTransaction,
  SignAndSubmitError,
  type SignTransaction,
} from "./stellar-transaction";

export type EscrowFundingStatus =
  | "idle"
  | "requesting-signature"
  | "submitting"
  | "funded"
  | "failed";

export interface DeployedEscrowFundingInput {
  contractId: string;
  signer: string;
  /** Use a decimal string when the order amount needs exact token precision. */
  amount: string | number;
}

export type SignEscrowTransaction = SignTransaction;

export class EscrowFundingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EscrowFundingError";
  }
}

interface FundingResponse {
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

function validateFundingInput({ contractId, signer, amount }: DeployedEscrowFundingInput) {
  const isPositiveNumber =
    typeof amount === "number" && Number.isFinite(amount) && amount > 0;
  const isPositiveDecimal =
    typeof amount === "string" &&
    /^\d+(?:\.\d+)?$/.test(amount) &&
    Number.isFinite(Number(amount)) &&
    Number(amount) > 0;

  if (!contractId.trim() || !signer.trim() || (!isPositiveNumber && !isPositiveDecimal)) {
    throw new EscrowFundingError(
      "A contract ID, seller wallet, and positive funding amount are required"
    );
  }
}

function mapSubmitStatus(status: string): EscrowFundingStatus | null {
  switch (status) {
    case "requesting-signature":
    case "submitting":
    case "failed":
      return status;
    case "submitted":
      return "funded";
    default:
      return null;
  }
}

/**
 * Run this immediately after the order's deployment request succeeds. The order
 * must not be marked funded until this function resolves.
 */
export async function fundDeployedEscrow(
  input: DeployedEscrowFundingInput,
  signTransaction: SignEscrowTransaction,
  onStatusChange?: (status: EscrowFundingStatus) => void
): Promise<void> {
  validateFundingInput(input);

  const fundingResponse = await fetch("/api/escrow/single-release/v2/fund", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  if (!fundingResponse.ok) {
    onStatusChange?.("failed");
    throw new EscrowFundingError(await readError(fundingResponse));
  }

  const { unsignedXdr } = (await fundingResponse.json()) as FundingResponse;
  if (!unsignedXdr) {
    onStatusChange?.("failed");
    throw new EscrowFundingError("Escrow service did not return a funding transaction");
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
      throw new EscrowFundingError(error.message);
    }
    throw error;
  }
}
