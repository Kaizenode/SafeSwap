import {
  signAndSubmitTransaction,
  SignAndSubmitError,
  type SignTransaction,
} from "./stellar-transaction";

export type EscrowApproveMilestonesStatus =
  | "idle"
  | "requesting-signature"
  | "submitting"
  | "approved"
  | "failed";

export interface ApproveMilestonesInput {
  contractId: string;
  approver: string;
  milestoneIndexes: number[];
}

export type SignEscrowTransaction = SignTransaction;

export class EscrowApproveMilestonesError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EscrowApproveMilestonesError";
  }
}

interface ApproveResponse {
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

function validateInput({ contractId, approver, milestoneIndexes }: ApproveMilestonesInput) {
  if (!contractId.trim() || !approver.trim() || milestoneIndexes.length === 0) {
    throw new EscrowApproveMilestonesError(
      "A contract ID, approver, and at least one milestone index are required"
    );
  }
}

function mapSubmitStatus(status: string): EscrowApproveMilestonesStatus | null {
  switch (status) {
    case "requesting-signature":
    case "submitting":
    case "failed":
      return status;
    case "submitted":
      return "approved";
    default:
      return null;
  }
}

export async function approveEscrowMilestones(
  input: ApproveMilestonesInput,
  signTransaction: SignEscrowTransaction,
  onStatusChange?: (status: EscrowApproveMilestonesStatus) => void
): Promise<void> {
  validateInput(input);

  const approveResponse = await fetch("/api/escrow/single-release/v2/approve-milestones", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  if (!approveResponse.ok) {
    onStatusChange?.("failed");
    throw new EscrowApproveMilestonesError(await readError(approveResponse));
  }

  const { unsignedXdr } = (await approveResponse.json()) as ApproveResponse;
  if (!unsignedXdr) {
    onStatusChange?.("failed");
    throw new EscrowApproveMilestonesError(
      "Escrow service did not return an approve transaction"
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
      throw new EscrowApproveMilestonesError(error.message);
    }
    throw error;
  }
}
