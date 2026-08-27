"use client";

import * as React from "react";
import { StellarWalletsKit } from "@creit.tech/stellar-wallets-kit/sdk";
import { ButtonMode } from "@creit.tech/stellar-wallets-kit/components";
import { cn } from "@/lib/utils";
import { useWallet } from "@/frontend/lib/wallet-context";

export interface ConnectWalletButtonProps
  extends React.HTMLAttributes<HTMLDivElement> {}

/**
 * Mounts the Stellar Wallets Kit's own built-in button. That single
 * component already handles both states — clicking it opens the auth
 * modal (picker: Freighter / LOBSTR, per the two modules configured in
 * WalletProvider) when disconnected, or the profile modal (shows the
 * address, has its own Disconnect action) when connected.
 *
 * This is a deliberate choice over a hand-built connect/disconnect UI:
 * the kit does not document a standalone disconnect() method anywhere
 * (only "the disconnect button in the profile modal"), so routing both
 * actions through the kit's own button is the only way to satisfy the
 * disconnect acceptance criterion without guessing at an undocumented
 * API for wallet-signing code.
 *
 * `ButtonMode.free` strips the kit's own styling so it can be styled
 * with plain Tailwind classes instead — verify the visual result once
 * this actually runs, since it hasn't been rendered anywhere yet.
 */
export function ConnectWalletButton({ className, ...props }: ConnectWalletButtonProps) {
  const { kitReady } = useWallet();
  const wrapperRef = React.useRef<HTMLDivElement>(null);
  const mountedRef = React.useRef(false);

  React.useEffect(() => {
    if (!kitReady || !wrapperRef.current || mountedRef.current) return;
    mountedRef.current = true;

    StellarWalletsKit.createButton(wrapperRef.current, {
      mode: ButtonMode.free,
      classes:
        "flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground shadow-sm transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
    });
  }, [kitReady]);

  return (
    <div
      ref={wrapperRef}
      className={cn("flex flex-col items-end gap-1", className)}
      {...props}
    />
  );
}
