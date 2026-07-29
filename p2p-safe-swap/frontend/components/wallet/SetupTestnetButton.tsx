"use client";

import * as React from "react";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { useWallet } from "@/frontend/lib/wallet-context";
import {
  setupTestnetWallet,
  WalletSetupError,
  type WalletSetupStatus,
} from "@/frontend/lib/wallet-setup";

export interface SetupTestnetButtonProps
  extends React.HTMLAttributes<HTMLDivElement> {}

export function SetupTestnetButton({ className, ...props }: SetupTestnetButtonProps) {
  const { publicKey, signTransaction } = useWallet();
  const [status, setStatus] = React.useState<WalletSetupStatus>("idle");
  const [error, setError] = React.useState<string | null>(null);
  const [done, setDone] = React.useState(false);

  if (!publicKey || done) return null;

  const isBusy = status !== "idle" && status !== "failed" && status !== "ready";
  const label =
    status === "preparing"
      ? "Preparing…"
      : status === "requesting-signature"
        ? "Sign in Freighter…"
        : status === "submitting"
          ? "Submitting…"
          : "Setup testnet wallet";

  const handleClick = async () => {
    setError(null);
    try {
      await setupTestnetWallet(publicKey, signTransaction, setStatus);
      setDone(true);
    } catch (err) {
      const message =
        err instanceof WalletSetupError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Failed to set up wallet";
      setError(message);
    }
  };

  return (
    <div className={cn("flex flex-col items-end gap-1", className)} {...props}>
      <button
        type="button"
        onClick={handleClick}
        disabled={isBusy}
        className="flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary shadow-sm transition-colors hover:bg-primary/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Sparkles className="size-3.5" aria-hidden />
        {label}
      </button>
      {error ? (
        <p role="alert" className="max-w-xs text-right text-[0.65rem] text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
