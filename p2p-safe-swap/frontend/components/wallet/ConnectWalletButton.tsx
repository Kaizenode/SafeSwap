"use client";

import * as React from "react";
import { LogOut, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";
import { LOBSTR_WALLET_ID, useWallet } from "@/frontend/lib/wallet-context";
import { WalletPickerDialog } from "@/frontend/components/wallet/WalletPickerDialog";

function truncate(address: string, head = 4, tail = 4): string {
  if (address.length <= head + tail + 1) return address;
  return `${address.slice(0, head)}…${address.slice(-tail)}`;
}

export function ConnectWalletButton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  const { publicKey, walletId, isConnecting, disconnect } = useWallet();
  const [pickerOpen, setPickerOpen] = React.useState(false);
  const [disconnecting, setDisconnecting] = React.useState(false);

  const handleDisconnect = React.useCallback(async () => {
    setDisconnecting(true);
    try {
      await disconnect();
    } finally {
      setDisconnecting(false);
    }
  }, [disconnect]);

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
        <span className="text-muted-foreground">
          {walletId === LOBSTR_WALLET_ID ? "LOBSTR" : "Freighter"}
        </span>
        <code className="font-mono text-foreground" title={publicKey}>
          {truncate(publicKey)}
        </code>
        <button
          type="button"
          onClick={handleDisconnect}
          disabled={disconnecting}
          aria-label="Disconnect wallet"
          className="flex size-6 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
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
        onClick={() => setPickerOpen(true)}
        disabled={isConnecting}
        className="flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground shadow-sm transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Wallet className="size-3.5" aria-hidden />
        {isConnecting ? "Connecting…" : "Connect wallet"}
      </button>

      {pickerOpen ? (
        <WalletPickerDialog onClose={() => setPickerOpen(false)} />
      ) : null}
    </div>
  );
}
