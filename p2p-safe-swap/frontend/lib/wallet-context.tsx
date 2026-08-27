"use client";

import * as React from "react";
import {
  isConnected as freighterIsConnected,
  requestAccess,
  getAddress,
  signMessage as freighterSignMessage,
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
  isSigningIn: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
  signTransaction: (unsignedXdr: string) => Promise<string>;
}

const WalletContext = React.createContext<WalletContextValue | null>(null);

const STORAGE_KEY = "safeswap.wallet.publicKey";
const SESSION_KEY = "safeswap.session.established";

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [publicKey, setPublicKey] = React.useState<string | null>(null);
  const [network, setNetwork] = React.useState<string | null>(null);
  const [isConnecting, setIsConnecting] = React.useState(false);
  const [isSigningIn, setIsSigningIn] = React.useState(false);

  React.useEffect(() => {
    (async () => {
      const sessionResponse = await fetch("/api/auth/me").catch(() => null);
      if (!sessionResponse?.ok) return;

      const session = (await sessionResponse.json()) as { address?: string };
      if (!session.address) return;

      const connectedResult = await freighterIsConnected();
      const connectedError = extractError(connectedResult);
      if (connectedError || !connectedResult.isConnected) return;

      const addressResult = await getAddress();
      const addressError = extractError(addressResult);
      if (addressError || !addressResult.address || addressResult.address !== session.address) return;

      setPublicKey(addressResult.address);
      window.localStorage.setItem(SESSION_KEY, "true");

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

      setIsSigningIn(true);
      const nonceResponse = await fetch("/api/auth/nonce", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address: accessResult.address }),
      });
      if (!nonceResponse.ok) throw new Error("Unable to start wallet sign-in");

      const nonceData = (await nonceResponse.json()) as { nonce?: string };
      if (!nonceData.nonce) throw new Error("Sign-in service did not return a nonce");

      const signed = await freighterSignMessage(nonceData.nonce, {
        address: accessResult.address,
        networkPassphrase: TESTNET_PASSPHRASE,
      });
      const signError = extractError(signed);
      if (signError) throw new Error(signError);
      if (!signed.signedMessage) throw new Error("Freighter did not return a signed message");

      const verifyResponse = await fetch("/api/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address: accessResult.address, signedNonce: signed.signedMessage }),
      });
      if (!verifyResponse.ok) {
        const body = (await verifyResponse.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? "Unable to verify wallet sign-in");
      }

      setPublicKey(accessResult.address);
      window.localStorage.setItem(STORAGE_KEY, accessResult.address);
      window.localStorage.setItem(SESSION_KEY, "true");

      const networkResult = await getNetwork();
      if (!extractError(networkResult) && networkResult.network) {
        setNetwork(networkResult.network);
      }
    } catch (error) {
      setPublicKey(null);
      setNetwork(null);
      window.localStorage.removeItem(STORAGE_KEY);
      window.localStorage.removeItem(SESSION_KEY);
      throw error;
    } finally {
      setIsSigningIn(false);
      setIsConnecting(false);
    }
  }, []);

  const disconnect = React.useCallback(() => {
    setPublicKey(null);
    setNetwork(null);
    window.localStorage.removeItem(STORAGE_KEY);
    window.localStorage.removeItem(SESSION_KEY);
    void fetch("/api/auth/logout", { method: "POST" });
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
    () => ({ publicKey, network, isConnecting, isSigningIn, connect, disconnect, signTransaction }),
    [publicKey, network, isConnecting, isSigningIn, connect, disconnect, signTransaction]
  );

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function useWallet(): WalletContextValue {
  const ctx = React.useContext(WalletContext);
  if (!ctx) throw new Error("useWallet must be used inside <WalletProvider>");
  return ctx;
}
