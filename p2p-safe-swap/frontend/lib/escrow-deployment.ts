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
}

export type SignEscrowDeployTransaction = (unsignedXdr: string) => Promise<string>;

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

interface SendTransactionResponse {
  contractId?: string;
  [key: string]: unknown;
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

  onStatusChange?.("requesting-signature");

  let signedXdr: string;
  try {
    signedXdr = await signTransaction(deployData.unsignedXdr);
  } catch (error) {
    onStatusChange?.("failed");
    const message = error instanceof Error ? error.message : "Wallet signature was rejected";
    throw new EscrowDeploymentError(message);
  }

  if (!signedXdr) {
    onStatusChange?.("failed");
    throw new EscrowDeploymentError("Wallet did not return a signed transaction");
  }

  onStatusChange?.("submitting");

  const sendResponse = await fetch("/api/stellar/send-transaction", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ signedXdr }),
  });

  if (!sendResponse.ok) {
    onStatusChange?.("failed");
    throw new EscrowDeploymentError(await readError(sendResponse));
  }

  const sendData = (await sendResponse.json()) as SendTransactionResponse;

  const contractId = sendData.contractId ?? deployData.contractId;

  if (!contractId) {
    onStatusChange?.("failed");
    throw new EscrowDeploymentError(
      "Escrow was deployed but no contractId was returned. Check the Stellar explorer."
    );
  }

  onStatusChange?.("deployed");
  return { contractId };
}
