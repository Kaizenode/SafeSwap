import {
  signAndSubmitTransaction,
  SignAndSubmitError,
  type SignTransaction,
} from "./stellar-transaction";

export type EscrowApproveMilestoneStatus =
  | "idle"
  | "requesting-signature"
  | "submitting"
  | "approved"
  | "failed";

export interface ApproveMilestoneInput {
  contractId: string;
  approver: string;
  milestoneIndex: string;
}

export type SignEscrowTransaction = SignTransaction;

export class EscrowApproveMilestoneError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EscrowApproveMilestoneError";
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

function validateInput({ contractId, approver, milestoneIndex }: ApproveMilestoneInput) {
  if (!contractId.trim() || !approver.trim() || !milestoneIndex.trim()) {
    throw new EscrowApproveMilestoneError(
      "A contract ID, approver, and milestone index are required"
    );
  }
}

function mapSubmitStatus(status: string): EscrowApproveMilestoneStatus | null {
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

export async function approveEscrowMilestone(
  input: ApproveMilestoneInput,
  signTransaction: SignEscrowTransaction,
  onStatusChange?: (status: EscrowApproveMilestoneStatus) => void
): Promise<void> {
  validateInput(input);

  const approveResponse = await fetch("/api/escrow/single-release/v2/approve-milestone", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  if (!approveResponse.ok) {
    onStatusChange?.("failed");
    throw new EscrowApproveMilestoneError(await readError(approveResponse));
  }

  const { unsignedXdr } = (await approveResponse.json()) as ApproveResponse;
  if (!unsignedXdr) {
    onStatusChange?.("failed");
    throw new EscrowApproveMilestoneError(
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
      throw new EscrowApproveMilestoneError(error.message);
    }
    throw error;
  }
}
