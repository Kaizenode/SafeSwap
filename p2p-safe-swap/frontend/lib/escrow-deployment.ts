import {
  signAndSubmitTransaction,
  SignAndSubmitError,
  type SignTransaction,
  type SubmitReceipt,
} from "./stellar-transaction";

export type EscrowDeploymentStatus =
  | "idle"
  | "deploying"
  | "requesting-signature"
  | "submitting"
  | "deployed"
  | "failed";

export interface DeployEscrowInput {
  signer: string;
  orderId: string;
  buyerAddress: string;
  sellerAddress: string;
  amount: number;
  platformFee: number;
  trustline: { address: string; symbol: string };
}

export interface DeployEscrowResult {
  contractId: string;
  txHash: string;
  ledger: number | null;
  /** Populated via GET /api/escrow/get-by-contract-id. `null` if hydration failed. */
  escrow: Record<string, unknown> | null;
}

export type SignEscrowDeployTransaction = SignTransaction;

export class EscrowDeploymentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EscrowDeploymentError";
  }
}

interface DeployResponse {
  unsignedXdr: string;
  contractId?: string;
}

interface HydrationResponse {
  escrow?: Record<string, unknown> | null;
}

interface ErrorResponse {
  error?: string;
}

async function readError(response: Response): Promise<string> {
  const fallback = `Request failed (${response.status})`;
  try {
    const body = (await response.json()) as ErrorResponse;
    return body.error ?? fallback;
  } catch {
    return fallback;
  }
}

function validateInput(input: DeployEscrowInput) {
  if (!input.signer.trim()) throw new EscrowDeploymentError("signer is required");
  if (!input.orderId.trim()) throw new EscrowDeploymentError("orderId is required");
  if (!input.buyerAddress.trim()) throw new EscrowDeploymentError("buyerAddress is required");
  if (!input.sellerAddress.trim()) throw new EscrowDeploymentError("sellerAddress is required");
  if (!Number.isFinite(input.amount) || input.amount <= 0)
    throw new EscrowDeploymentError("amount must be a positive number");
  if (!input.trustline.address.trim() || !input.trustline.symbol.trim())
    throw new EscrowDeploymentError("trustline.address and trustline.symbol are required");
}

function mapSubmitStatus(status: string): EscrowDeploymentStatus | null {
  switch (status) {
    case "requesting-signature":
    case "submitting":
    case "failed":
      return status;
    case "submitted":
      return "deployed";
    default:
      return null;
  }
}

function pickContractIdFromRaw(raw: Record<string, unknown>): string | null {
  const nested =
    raw.data && typeof raw.data === "object" ? (raw.data as Record<string, unknown>) : raw;
  const candidate = nested.contractId ?? raw.contractId;
  return typeof candidate === "string" && candidate.trim() !== "" ? candidate : null;
}

async function fetchEscrow(contractId: string): Promise<Record<string, unknown> | null> {
  try {
    const response = await fetch(
      `/api/escrow/get-by-contract-id?contractId=${encodeURIComponent(contractId)}`
    );
    if (!response.ok) return null;
    const body = (await response.json()) as HydrationResponse;
    return body.escrow ?? null;
  } catch {
    return null;
  }
}

export async function deployEscrow(
  input: DeployEscrowInput,
  signTransaction: SignEscrowDeployTransaction,
  onStatusChange?: (status: EscrowDeploymentStatus) => void
): Promise<DeployEscrowResult> {
  validateInput(input);

  onStatusChange?.("deploying");

  const deployResponse = await fetch("/api/escrow/single-release/v2/deploy", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  if (!deployResponse.ok) {
    onStatusChange?.("failed");
    throw new EscrowDeploymentError(await readError(deployResponse));
  }

  const deployData = (await deployResponse.json()) as DeployResponse;

  if (!deployData.unsignedXdr) {
    onStatusChange?.("failed");
    throw new EscrowDeploymentError("Escrow service did not return a deployment transaction");
  }

  let receipt: SubmitReceipt;
  try {
    receipt = await signAndSubmitTransaction(deployData.unsignedXdr, signTransaction, {
      onStatusChange: (status) => {
        const mapped = mapSubmitStatus(status);
        if (mapped) onStatusChange?.(mapped);
      },
    });
  } catch (error) {
    if (error instanceof SignAndSubmitError) {
      throw new EscrowDeploymentError(error.message);
    }
    throw error;
  }

  const contractId = deployData.contractId ?? pickContractIdFromRaw(receipt.raw);

  if (!contractId) {
    onStatusChange?.("failed");
    throw new EscrowDeploymentError(
      "Escrow was deployed but no contractId was returned. Check the Stellar explorer."
    );
  }

  const escrow = await fetchEscrow(contractId);

  return {
    contractId,
    txHash: receipt.txHash,
    ledger: receipt.ledger,
    escrow,
  };
}
