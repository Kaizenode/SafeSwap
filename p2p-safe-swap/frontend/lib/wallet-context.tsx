"use client";

import * as React from "react";
import {
  StellarWalletsKit,
  Networks,
  FREIGHTER_ID,
} from "@creit.tech/stellar-wallets-kit";
import { FreighterModule } from "@creit.tech/stellar-wallets-kit/modules/freighter";
import { LobstrModule } from "@creit.tech/stellar-wallets-kit/modules/lobstr";

const TESTNET_PASSPHRASE = Networks?.TESTNET || "Test SDF Network ; September 2015";
const MAINNET_PASSPHRASE = Networks?.PUBLIC || "Public Global Stellar Network ; July 2015";

function getNetworkPassphrase(): string {
  const envNetwork = (process.env.NEXT_PUBLIC_STELLAR_NETWORK || "testnet").toLowerCase();
  return envNetwork === "mainnet" || envNetwork === "public"
    ? MAINNET_PASSPHRASE
    : TESTNET_PASSPHRASE;
}

let isKitInitialized = false;

function ensureKitInitialized(selectedWalletId: string = FREIGHTER_ID) {
  if (typeof window === "undefined") return;

  if (isKitInitialized) {
    if (selectedWalletId) {
      StellarWalletsKit.setWallet(selectedWalletId);
    }
    return;
  }

  const passphrase = getNetworkPassphrase();
  StellarWalletsKit.init({
    network: passphrase as any,
    selectedWalletId,
    modules: [new FreighterModule(), new LobstrModule()],
  });
  isKitInitialized = true;
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
      try {
        ensureKitInitialized(FREIGHTER_ID);
        const { address } = await StellarWalletsKit.fetchAddress();
        if (!address) return;

        setPublicKey(address);

        try {
          const net = await StellarWalletsKit.getNetwork();
          if (net?.networkPassphrase) {
            setNetwork(net.networkPassphrase);
          } else {
            setNetwork(getNetworkPassphrase());
          }
        } catch {
          setNetwork(getNetworkPassphrase());
        }
      } catch {
        // If reconnecting stored session fails or is not authorized yet, ignore
      }
    })();
  }, []);

  const connect = React.useCallback(async () => {
    setIsConnecting(true);
    try {
      ensureKitInitialized(FREIGHTER_ID);
      StellarWalletsKit.setWallet(FREIGHTER_ID);

      let address: string | null = null;
      try {
        const result = await StellarWalletsKit.fetchAddress();
        address = result?.address || null;
      } catch (err: any) {
        const msg = err?.message || String(err);
        if (
          msg.toLowerCase().includes("not installed") ||
          msg.toLowerCase().includes("freighter") ||
          msg.toLowerCase().includes("extension")
        ) {
          throw new WalletNotInstalledError();
        }
        throw err;
      }

      if (!address) {
        throw new Error("Wallet did not return an address");
      }

      setPublicKey(address);
      if (typeof window !== "undefined") {
        window.localStorage.setItem(STORAGE_KEY, address);
      }

      try {
        const net = await StellarWalletsKit.getNetwork();
        if (net?.networkPassphrase) {
          setNetwork(net.networkPassphrase);
        } else {
          setNetwork(getNetworkPassphrase());
        }
      } catch {
        setNetwork(getNetworkPassphrase());
      }
    } finally {
      setIsConnecting(false);
    }
  }, []);

  const disconnect = React.useCallback(() => {
    setPublicKey(null);
    setNetwork(null);
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(STORAGE_KEY);
    }
    if (isKitInitialized) {
      try {
        StellarWalletsKit.disconnect();
      } catch {
        // Ignore disconnect cleanup errors
      }
    }
  }, []);

  const signTransaction = React.useCallback(
    async (unsignedXdr: string): Promise<string> => {
      if (!publicKey) throw new WalletNotConnectedError();

      ensureKitInitialized(FREIGHTER_ID);
      const networkPassphrase = getNetworkPassphrase();

      const result = await StellarWalletsKit.signTransaction(unsignedXdr, {
        address: publicKey,
        networkPassphrase,
      });

      if (!result?.signedTxXdr) {
        throw new Error("Wallet did not return a signed XDR");
      }

      return result.signedTxXdr;
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
