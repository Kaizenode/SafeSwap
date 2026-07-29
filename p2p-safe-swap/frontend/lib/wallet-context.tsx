"use client";

import * as React from "react";
import {
  isConnected as freighterIsConnected,
  requestAccess,
  getAddress,
  signTransaction as freighterSignTransaction,
  getNetwork,
} from "@stellar/freighter-api";

const TESTNET_PASSPHRASE = "Test SDF Network ; September 2015";

interface FreighterResult {
  error?: { message?: string } | string;
}

function extractError(result: FreighterResult): string | null {
  if (!result.error) return null;
  if (typeof result.error === "string") return result.error;
  return result.error.message ?? "Freighter error";
}

export class WalletNotInstalledError extends Error {
  constructor() {
    super("Freighter extension is not installed. Get it at https://freighter.app");
    this.name = "WalletNotInstalledError";
  }
}

export class WalletNotConnectedError extends Error {
  constructor() {
    super("Wallet is not connected");
    this.name = "WalletNotConnectedError";
  }
}

interface WalletContextValue {
  publicKey: string | null;
  network: string | null;
  isConnecting: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
  signTransaction: (unsignedXdr: string) => Promise<string>;
}

const WalletContext = React.createContext<WalletContextValue | null>(null);

const STORAGE_KEY = "safeswap.wallet.publicKey";

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [publicKey, setPublicKey] = React.useState<string | null>(null);
  const [network, setNetwork] = React.useState<string | null>(null);
  const [isConnecting, setIsConnecting] = React.useState(false);

  React.useEffect(() => {
    const stored =
      typeof window !== "undefined" ? window.localStorage.getItem(STORAGE_KEY) : null;
    if (!stored) return;

    (async () => {
      const connectedResult = await freighterIsConnected();
      const connectedError = extractError(connectedResult);
      if (connectedError || !connectedResult.isConnected) return;

      const addressResult = await getAddress();
      const addressError = extractError(addressResult);
      if (addressError || !addressResult.address) return;

      setPublicKey(addressResult.address);

      const networkResult = await getNetwork();
      if (!extractError(networkResult) && networkResult.network) {
        setNetwork(networkResult.network);
      }
    })();
  }, []);

  const connect = React.useCallback(async () => {
    setIsConnecting(true);
    try {
      const connectedResult = await freighterIsConnected();
      const connectedError = extractError(connectedResult);
      if (connectedError) throw new WalletNotInstalledError();
      if (!connectedResult.isConnected) throw new WalletNotInstalledError();

      const accessResult = await requestAccess();
      const accessError = extractError(accessResult);
      if (accessError) throw new Error(accessError);
      if (!accessResult.address) throw new Error("Freighter did not return an address");

      setPublicKey(accessResult.address);
      window.localStorage.setItem(STORAGE_KEY, accessResult.address);

      const networkResult = await getNetwork();
      if (!extractError(networkResult) && networkResult.network) {
        setNetwork(networkResult.network);
      }
    } finally {
      setIsConnecting(false);
    }
  }, []);

  const disconnect = React.useCallback(() => {
    setPublicKey(null);
    setNetwork(null);
    window.localStorage.removeItem(STORAGE_KEY);
  }, []);

  const signTransaction = React.useCallback(
    async (unsignedXdr: string): Promise<string> => {
      if (!publicKey) throw new WalletNotConnectedError();

      const signed = await freighterSignTransaction(unsignedXdr, {
        address: publicKey,
        networkPassphrase: TESTNET_PASSPHRASE,
      });
      const signError = extractError(signed);
      if (signError) throw new Error(signError);
      if (!signed.signedTxXdr) throw new Error("Freighter did not return a signed XDR");

      return signed.signedTxXdr;
    },
    [publicKey]
  );

  const value = React.useMemo(
    () => ({ publicKey, network, isConnecting, connect, disconnect, signTransaction }),
    [publicKey, network, isConnecting, connect, disconnect, signTransaction]
  );

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function useWallet(): WalletContextValue {
  const ctx = React.useContext(WalletContext);
  if (!ctx) throw new Error("useWallet must be used inside <WalletProvider>");
  return ctx;
}
