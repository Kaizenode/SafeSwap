"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/frontend/components/ui/Button/Button";
import { WalletBadge } from "@/frontend/components/ui/wallet-badge";
import { useWallet } from "./wallet-provider";

function truncate(address: string): string {
  return address.length <= 12 ? address : `${address.slice(0, 4)}…${address.slice(-4)}`;
}

// Opens the wallet modal when disconnected; shows the account + disconnect when connected.
export function ConnectWalletButton({ className }: { className?: string }) {
  const { address, status, error, connect, disconnect } = useWallet();

  if (address) {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <span className="flex items-center gap-2 rounded-full border border-border bg-card ps-1.5 pe-3 py-1">
          <WalletBadge address={address} size="sm" />
          <span className="font-mono text-xs text-foreground" title={address}>
            {truncate(address)}
          </span>
        </span>
        <Button variant="ghost" size="sm" label="Desconectar" onClick={() => void disconnect()} />
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col items-start gap-1", className)}>
      <Button
        variant="primary"
        size="md"
        label={status === "connecting" ? "Conectando…" : "Conectar wallet"}
        onClick={() => void connect()}
        disabled={status === "connecting"}
        aria-label="Conectar wallet de Stellar"
      />
      {error ? <span className="text-xs text-red-500">{error}</span> : null}
    </div>
  );
}
