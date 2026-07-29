"use client";

import * as React from "react";
import { Wallet, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { useWallet, WalletNotInstalledError } from "@/frontend/lib/wallet-context";

function truncate(address: string, head = 4, tail = 4): string {
  if (address.length <= head + tail + 1) return address;
  return `${address.slice(0, head)}…${address.slice(-tail)}`;
}

export interface ConnectWalletButtonProps
  extends React.HTMLAttributes<HTMLDivElement> {}

export function ConnectWalletButton({ className, ...props }: ConnectWalletButtonProps) {
  const { publicKey, isConnecting, connect, disconnect } = useWallet();
  const [error, setError] = React.useState<string | null>(null);

  const handleConnect = React.useCallback(async () => {
    setError(null);
    try {
      await connect();
    } catch (err) {
      const message =
        err instanceof WalletNotInstalledError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Failed to connect wallet";
      setError(message);
    }
  }, [connect]);

  if (publicKey) {
    return (
      <div
        className={cn(
          "flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-xs shadow-sm",
          className
        )}
        {...props}
      >
        <Wallet className="size-3.5 text-primary" aria-hidden />
        <code className="font-mono text-foreground" title={publicKey}>
          {truncate(publicKey)}
        </code>
        <button
          type="button"
          onClick={disconnect}
          aria-label="Disconnect wallet"
          className="flex size-6 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <LogOut className="size-3" aria-hidden />
        </button>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col items-end gap-1", className)} {...props}>
      <button
        type="button"
        onClick={handleConnect}
        disabled={isConnecting}
        className="flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground shadow-sm transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Wallet className="size-3.5" aria-hidden />
        {isConnecting ? "Connecting…" : "Connect wallet"}
      </button>
      {error ? (
        <p role="alert" className="max-w-xs text-right text-[0.65rem] text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
