"use client";

import * as React from "react";
import { Loader2, Smartphone, Wallet, X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  FREIGHTER_WALLET_ID,
  LOBSTR_WALLET_ID,
  WalletConnectNotConfiguredError,
  WalletConnectTimeoutError,
  WalletNotInstalledError,
  useWallet,
  type WalletId,
} from "@/frontend/lib/wallet-context";

interface WalletOption {
  id: WalletId;
  name: string;
  description: string;
}

const WALLET_OPTIONS: WalletOption[] = [
  {
    id: FREIGHTER_WALLET_ID,
    name: "Freighter",
    description: "Browser extension",
  },
  {
    id: LOBSTR_WALLET_ID,
    name: "LOBSTR",
    description: "Scan the QR with the LOBSTR mobile app",
  },
];

function describeWalletError(error: unknown): string {
  if (error instanceof WalletNotInstalledError) return error.message;
  if (error instanceof WalletConnectNotConfiguredError) return error.message;
  if (error instanceof WalletConnectTimeoutError) return error.message;
  if (error instanceof Error && error.message) return error.message;
  return "Failed to connect wallet";
}

export interface WalletPickerDialogProps {
  onClose: () => void;
  className?: string;
}

export function WalletPickerDialog({
  onClose,
  className,
}: WalletPickerDialogProps) {
  const { connectWallet, getSupportedWallets } = useWallet();
  const [connectingId, setConnectingId] = React.useState<WalletId | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [availability, setAvailability] = React.useState<
    Partial<Record<WalletId, boolean>>
  >({});
  const titleId = React.useId();

  React.useEffect(() => {
    let active = true;
    getSupportedWallets()
      .then((wallets) => {
        if (!active) return;
        const next: Partial<Record<WalletId, boolean>> = {};
        for (const wallet of wallets) {
          if (wallet.id === FREIGHTER_WALLET_ID) {
            next[FREIGHTER_WALLET_ID] = wallet.isAvailable;
          }
        }
        setAvailability(next);
      })
      .catch(() => {
        // Availability is a hint; the connect call reports real errors.
      });

    return () => {
      active = false;
    };
  }, [getSupportedWallets]);

  React.useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !connectingId) onClose();
    }
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [connectingId, onClose]);

  const isBusy = connectingId !== null;

  async function handleSelect(id: WalletId) {
    if (isBusy) return;
    setError(null);
    setConnectingId(id);
    try {
      await connectWallet(id);
      onClose();
    } catch (err) {
      setError(describeWalletError(err));
    } finally {
      setConnectingId(null);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      className={cn(
        "fixed inset-0 z-50 flex items-end justify-center bg-black/60 px-4 py-6 backdrop-blur-sm sm:items-center",
        className
      )}
      onClick={(event) => {
        if (event.target === event.currentTarget && !isBusy) onClose();
      }}
    >
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-5 shadow-lg">
        <header className="flex items-start justify-between gap-3">
          <div className="flex flex-col gap-1">
            <h2 id={titleId} className="text-base font-semibold text-foreground">
              Connect a wallet
            </h2>
            <p className="text-xs text-muted-foreground">
              Pick how you want to sign transactions
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isBusy}
            aria-label="Close"
            className={cn(
              "inline-flex size-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors",
              "hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              "disabled:cursor-not-allowed disabled:opacity-50"
            )}
          >
            <X size={18} aria-hidden="true" />
          </button>
        </header>

        <ul className="mt-4 flex flex-col gap-2">
          {WALLET_OPTIONS.map((option) => {
            const Icon = option.id === LOBSTR_WALLET_ID ? Smartphone : Wallet;
            const notInstalled = availability[option.id] === false;
            const connecting = connectingId === option.id;

            return (
              <li key={option.id}>
                <button
                  type="button"
                  onClick={() => handleSelect(option.id)}
                  disabled={isBusy}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-xl border border-border bg-card px-3 py-3 text-left transition-colors",
                    "hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    "disabled:cursor-not-allowed disabled:opacity-60"
                  )}
                >
                  <span
                    aria-hidden="true"
                    className="flex size-9 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground"
                  >
                    <Icon className="size-5" />
                  </span>

                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="text-sm font-medium text-foreground">
                      {option.name}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {notInstalled
                        ? "Not installed — install the extension"
                        : option.description}
                    </span>
                  </span>

                  {connecting ? (
                    <Loader2
                      className="size-4 animate-spin text-muted-foreground"
                      aria-hidden="true"
                    />
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>

        {error ? (
          <p
            role="alert"
            className="mt-3 rounded-xl bg-destructive/10 px-3 py-2 text-xs text-destructive"
          >
            {error}
          </p>
        ) : null}
      </div>
    </div>
  );
}
