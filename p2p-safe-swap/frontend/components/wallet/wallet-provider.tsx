"use client";

import * as React from "react";

export type WalletStatus = "idle" | "connecting" | "connected";

export type WalletContextValue = {
  /** Connected wallet public key — the `signer` for escrow queries. */
  address: string | null;
  status: WalletStatus;
  error: string | null;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
};

const WalletContext = React.createContext<WalletContextValue | null>(null);

function errorMessage(e: unknown): string {
  if (e && typeof e === "object" && "message" in e) return String((e as { message: unknown }).message);
  return String(e);
}

/**
 * App-wide wallet connection state, backed by Stellar Wallets Kit.
 *
 * The kit is loaded via dynamic import inside effects/handlers so its
 * browser-only code never runs during SSR. On mount we subscribe to kit state
 * updates, which also restores any persisted session (localStorage) — so a
 * returning user appears connected without re-opening the modal.
 */
export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [address, setAddress] = React.useState<string | null>(null);
  const [isConnecting, setIsConnecting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    let unsubscribe = () => {};

    import("./kit")
      .then((kit) => {
        if (cancelled) return;
        unsubscribe = kit.subscribe((addr) => setAddress(addr));
      })
      .catch((e) => {
        if (!cancelled) setError(errorMessage(e));
      });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  const connect = React.useCallback(async () => {
    setError(null);
    setIsConnecting(true);
    try {
      const kit = await import("./kit");
      const addr = await kit.connectWallet();
      setAddress(addr);
    } catch (e) {
      // Includes the user closing the modal / rejecting — surfaced softly.
      setError(errorMessage(e));
    } finally {
      setIsConnecting(false);
    }
  }, []);

  const disconnect = React.useCallback(async () => {
    setError(null);
    try {
      const kit = await import("./kit");
      await kit.disconnectWallet();
      setAddress(null);
    } catch (e) {
      setError(errorMessage(e));
    }
  }, []);

  const value = React.useMemo<WalletContextValue>(
    () => ({
      address,
      status: isConnecting ? "connecting" : address ? "connected" : "idle",
      error,
      connect,
      disconnect,
    }),
    [address, isConnecting, error, connect, disconnect]
  );

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function useWallet(): WalletContextValue {
  const ctx = React.useContext(WalletContext);
  if (!ctx) throw new Error("useWallet must be used within a WalletProvider");
  return ctx;
}
