import type { SignTransaction } from "./stellar-transaction";

export type WalletSetupStatus =
  | "idle"
  | "preparing"
  | "requesting-signature"
  | "submitting"
  | "ready"
  | "failed";

export class WalletSetupError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WalletSetupError";
  }
}

interface SetupResponse {
  unsignedXdr?: string;
  alreadySetUp?: boolean;
  error?: string;
}

interface SubmitResponse {
  txHash?: string;
  error?: string;
}

async function readError(response: Response): Promise<string> {
  const fallback = `Request failed (${response.status})`;
  try {
    const body = (await response.json()) as { error?: unknown };
    if (typeof body.error === "string") return body.error;
    if (body.error) return JSON.stringify(body.error);
    return fallback;
  } catch {
    return fallback;
  }
}

export async function setupTestnetWallet(
  publicKey: string,
  signTransaction: SignTransaction,
  onStatusChange?: (status: WalletSetupStatus) => void
): Promise<{ alreadySetUp: boolean }> {
  if (!publicKey.trim()) {
    throw new WalletSetupError("publicKey is required");
  }

  onStatusChange?.("preparing");

  const prepareResponse = await fetch("/api/stellar/setup-testnet", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ publicKey }),
  });

  if (!prepareResponse.ok) {
    onStatusChange?.("failed");
    throw new WalletSetupError(await readError(prepareResponse));
  }

  const data = (await prepareResponse.json()) as SetupResponse;

  if (data.alreadySetUp) {
    onStatusChange?.("ready");
    return { alreadySetUp: true };
  }

  if (!data.unsignedXdr) {
    onStatusChange?.("failed");
    throw new WalletSetupError("Setup service did not return a trustline transaction");
  }

  onStatusChange?.("requesting-signature");

  let signedXdr: string;
  try {
    signedXdr = await signTransaction(data.unsignedXdr);
  } catch (error) {
    onStatusChange?.("failed");
    const message = error instanceof Error ? error.message : "Wallet signature was rejected";
    throw new WalletSetupError(message);
  }

  if (!signedXdr.trim()) {
    onStatusChange?.("failed");
    throw new WalletSetupError("Wallet did not return a signed transaction");
  }

  onStatusChange?.("submitting");

  const submitResponse = await fetch("/api/stellar/submit-horizon", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ signedXdr }),
  });

  if (!submitResponse.ok) {
    onStatusChange?.("failed");
    throw new WalletSetupError(await readError(submitResponse));
  }

  const submitData = (await submitResponse.json()) as SubmitResponse;
  if (!submitData.txHash) {
    onStatusChange?.("failed");
    throw new WalletSetupError("Trustline transaction did not return a hash");
  }

  onStatusChange?.("ready");
  return { alreadySetUp: false };
}
