"use client";

import { useCallback, useRef, useState } from "react";

export type SignTransaction = (unsignedXdr: string) => Promise<string>;

export type SignAndSubmitStatus =
  | "idle"
  | "requesting-signature"
  | "submitting"
  | "submitted"
  | "failed";

export interface SubmitReceipt {
  txHash: string;
  ledger: number | null;
  raw: Record<string, unknown>;
}

export type SignAndSubmitReason =
  | "invalid-input"
  | "wallet-rejected"
  | "network-failure"
  | "submission-failed"
  | "malformed-response";

export class SignAndSubmitError extends Error {
  constructor(
    public readonly reason: SignAndSubmitReason,
    message: string,
    public readonly cause?: unknown
  ) {
    super(message);
    this.name = "SignAndSubmitError";
  }
}

export class WalletRejectedError extends SignAndSubmitError {
  constructor(message = "Wallet signature was rejected", cause?: unknown) {
    super("wallet-rejected", message, cause);
    this.name = "WalletRejectedError";
  }
}

export class NetworkError extends SignAndSubmitError {
  constructor(message = "Network request to submit the transaction failed", cause?: unknown) {
    super("network-failure", message, cause);
    this.name = "NetworkError";
  }
}

export class SubmissionError extends SignAndSubmitError {
  constructor(message: string, public readonly status: number, cause?: unknown) {
    super("submission-failed", message, cause);
    this.name = "SubmissionError";
  }
}

interface ErrorResponse {
  error?: string;
}

async function readErrorMessage(response: Response): Promise<string> {
  const fallback = `Transaction submission failed (${response.status})`;
  try {
    const body = (await response.json()) as ErrorResponse;
    return body.error || fallback;
  } catch {
    return fallback;
  }
}

function extractString(source: Record<string, unknown>, keys: readonly string[]): string | null {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === "string" && value.trim() !== "") return value;
  }
  return null;
}

function extractNumber(source: Record<string, unknown>, keys: readonly string[]): number | null {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim() !== "" && Number.isFinite(Number(value))) {
      return Number(value);
    }
  }
  return null;
}

/**
 * Best-effort normalization of the send-transaction response. Trustless Work's
 * payload keys have shifted historically (`hash` vs `txHash`, `ledger` vs
 * `ledgerSequence`), so we accept the union and expose a stable shape.
 */
export function normalizeSubmitResponse(raw: unknown): SubmitReceipt {
  const record: Record<string, unknown> =
    raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};

  const nested =
    record.data && typeof record.data === "object"
      ? (record.data as Record<string, unknown>)
      : record;

  const txHash =
    extractString(nested, ["txHash", "hash", "transactionHash"]) ??
    extractString(record, ["txHash", "hash", "transactionHash"]);

  if (!txHash) {
    throw new SignAndSubmitError(
      "malformed-response",
      "Submit endpoint did not return a transaction hash"
    );
  }

  const ledger =
    extractNumber(nested, ["ledger", "ledgerSequence", "ledgerNumber"]) ??
    extractNumber(record, ["ledger", "ledgerSequence", "ledgerNumber"]);

  return { txHash, ledger, raw: record };
}

export interface SignAndSubmitOptions {
  onStatusChange?: (status: SignAndSubmitStatus) => void;
  signal?: AbortSignal;
}

/**
 * Shared primitive for every write endpoint in the Trustless Work API: takes
 * an unsigned XDR, asks the wallet to sign it, POSTs it to the shared
 * /api/stellar/send-transaction proxy, and returns a normalized receipt.
 *
 * Callers that need action-specific data (like `contractId` for deploys) are
 * expected to decorate the receipt themselves — this primitive is intentionally
 * decoupled from any escrow shape.
 */
export async function signAndSubmitTransaction(
  unsignedXdr: string,
  signTransaction: SignTransaction,
  { onStatusChange, signal }: SignAndSubmitOptions = {}
): Promise<SubmitReceipt> {
  if (typeof unsignedXdr !== "string" || !unsignedXdr.trim()) {
    throw new SignAndSubmitError("invalid-input", "unsignedXdr is required");
  }

  onStatusChange?.("requesting-signature");

  let signedXdr: string;
  try {
    signedXdr = await signTransaction(unsignedXdr);
  } catch (error) {
    onStatusChange?.("failed");
    const message = error instanceof Error ? error.message : "Wallet signature was rejected";
    throw new WalletRejectedError(message, error);
  }

  if (typeof signedXdr !== "string" || !signedXdr.trim()) {
    onStatusChange?.("failed");
    throw new WalletRejectedError("Wallet did not return a signed transaction");
  }

  onStatusChange?.("submitting");

  let response: Response;
  try {
    response = await fetch("/api/stellar/send-transaction", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ signedXdr }),
      signal,
    });
  } catch (error) {
    onStatusChange?.("failed");
    throw new NetworkError(undefined, error);
  }

  if (!response.ok) {
    onStatusChange?.("failed");
    throw new SubmissionError(await readErrorMessage(response), response.status);
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch (error) {
    onStatusChange?.("failed");
    throw new SignAndSubmitError(
      "malformed-response",
      "Submit endpoint returned a non-JSON body",
      error
    );
  }

  const receipt = normalizeSubmitResponse(payload);
  onStatusChange?.("submitted");
  return receipt;
}

export interface UseSignAndSubmitResult {
  execute: (unsignedXdr: string) => Promise<SubmitReceipt>;
  status: SignAndSubmitStatus;
  error: SignAndSubmitError | null;
  reset: () => void;
}

/**
 * React wrapper around `signAndSubmitTransaction` that tracks status and error
 * state so UI callers don't reinvent it per action.
 */
export function useSignAndSubmit(signTransaction: SignTransaction): UseSignAndSubmitResult {
  const [status, setStatus] = useState<SignAndSubmitStatus>("idle");
  const [error, setError] = useState<SignAndSubmitError | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const execute = useCallback(
    async (unsignedXdr: string) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      setError(null);

      try {
        return await signAndSubmitTransaction(unsignedXdr, signTransaction, {
          onStatusChange: setStatus,
          signal: controller.signal,
        });
      } catch (err) {
        const normalized =
          err instanceof SignAndSubmitError
            ? err
            : new SignAndSubmitError(
                "submission-failed",
                err instanceof Error ? err.message : "Unable to submit transaction",
                err
              );
        setError(normalized);
        throw normalized;
      }
    },
    [signTransaction]
  );

  const reset = useCallback(() => {
    abortRef.current?.abort();
    setStatus("idle");
    setError(null);
  }, []);

  return { execute, status, error, reset };
}
