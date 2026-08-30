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
import { StellarWalletsKit } from "@creit.tech/stellar-wallets-kit/sdk";
import { FreighterModule } from "@creit.tech/stellar-wallets-kit/modules/freighter";
import { LobstrModule } from "@creit.tech/stellar-wallets-kit/modules/lobstr";

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

type ActiveWallet = "freighter" | "other" | null;

interface WalletContextValue {
  publicKey: string | null;
  network: string | null;
  isConnecting: boolean;
  isSigningIn: boolean;
  /** true once the user is both connected AND has an established server
   *  session (nonce/verify completed) — see the connect() note below for
   *  why this can be false even when publicKey is set. */
  isSignedIn: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
  signTransaction: (unsignedXdr: string) => Promise<string>;
}

const WalletContext = React.createContext<WalletContextValue | null>(null);

const STORAGE_KEY = "safeswap.wallet.publicKey";
const SESSION_KEY = "safeswap.session.established";
const ACTIVE_WALLET_KEY = "safeswap.wallet.active";

let kitInitialized = false;
function ensureKitInitialized(): void {
  if (kitInitialized || typeof window === "undefined") return;
  kitInitialized = true;
  // Restricted to exactly these two per #374's MVP scope — no Albedo,
  // xBull, or Hana. Neither module needs extra configuration: LOBSTR has
  // its own dedicated module (not the generic WalletConnect one), so no
  // WalletConnect Cloud project ID is required.
  StellarWalletsKit.init({
    modules: [new FreighterModule(), new LobstrModule()],
  });
}

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [publicKey, setPublicKey] = React.useState<string | null>(null);
  const [network, setNetwork] = React.useState<string | null>(null);
  const [isConnecting, setIsConnecting] = React.useState(false);
  const [isSigningIn, setIsSigningIn] = React.useState(false);
  const [isSignedIn, setIsSignedIn] = React.useState(false);

  // Restores a Freighter session established in a previous visit — exactly
  // #397's restored logic, untouched. There is no equivalent restore path
  // for LOBSTR: it never establishes a server session (see connect()
  // below), so there is nothing to restore for it.
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
      setIsSignedIn(true);
      window.localStorage.setItem(SESSION_KEY, "true");
      window.localStorage.setItem(ACTIVE_WALLET_KEY, "freighter");

      const networkResult = await getNetwork();
      if (!extractError(networkResult) && networkResult.network) {
        setNetwork(networkResult.network);
      }
    })();
  }, []);

  /**
   * Opens the kit's own picker modal (Freighter / LOBSTR — exactly the
   * two modules configured above), then branches on which wallet the
   * user actually picked:
   *
   * - Freighter: runs the full sign-in-with-wallet flow exactly as #397
   *   restored it (nonce -> freighterSignMessage -> verify -> session
   *   cookie). Untouched from main.
   *
   * - Anything else (LOBSTR): connects for signing (signTransaction
   *   below) but does NOT establish a server session. The nonce/verify
   *   step needs the wallet to sign an arbitrary message, and while the
   *   kit's per-wallet developer interface documents signMessage, there
   *   is no confirmed top-level StellarWalletsKit.signMessage() static
   *   method the way there is for .signTransaction()/.getAddress().
   *   Rather than guess at that for a login flow, LOBSTR users can
   *   connect and use anything that only needs signTransaction (escrow
   *   approvals etc.), but isSignedIn stays false and no session cookie
   *   is set. This is a deliberate, documented scope reduction — see the
   *   PR description — not an oversight. Revisit once signMessage's
   *   static-level availability is confirmed against the real installed
   *   package types.
   */
  const connect = React.useCallback(async () => {
    setIsConnecting(true);
    try {
      ensureKitInitialized();
      const { address } = await StellarWalletsKit.authModal();
      if (!address) return; // user cancelled the picker

      const freighterConnectedResult = await freighterIsConnected().catch(() => null);
      const freighterAddressResult =
        freighterConnectedResult && !extractError(freighterConnectedResult) && freighterConnectedResult.isConnected
          ? await getAddress().catch(() => null)
          : null;
      const isFreighterAddress =
        !!freighterAddressResult &&
        !extractError(freighterAddressResult) &&
        freighterAddressResult.address === address;

      if (!isFreighterAddress) {
        // LOBSTR (or any non-Freighter wallet the kit picked) — connect
        // only, no session. See the doc comment above.
        setPublicKey(address);
        setIsSignedIn(false);
        window.localStorage.setItem(ACTIVE_WALLET_KEY, "other");
        return;
      }

      setIsSigningIn(true);
      const nonceResponse = await fetch("/api/auth/nonce", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address }),
      });
      if (!nonceResponse.ok) throw new Error("Unable to start wallet sign-in");

      const nonceData = (await nonceResponse.json()) as { nonce?: string };
      if (!nonceData.nonce) throw new Error("Sign-in service did not return a nonce");

      const signed = await freighterSignMessage(nonceData.nonce, {
        address,
        networkPassphrase: TESTNET_PASSPHRASE,
      });
      const signError = extractError(signed);
      if (signError) throw new Error(signError);
      if (!signed.signedMessage) throw new Error("Freighter did not return a signed message");

      const verifyResponse = await fetch("/api/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address, signedNonce: signed.signedMessage }),
      });
      if (!verifyResponse.ok) {
        const body = (await verifyResponse.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? "Unable to verify wallet sign-in");
      }

      setPublicKey(address);
      setIsSignedIn(true);
      window.localStorage.setItem(STORAGE_KEY, address);
      window.localStorage.setItem(SESSION_KEY, "true");
      window.localStorage.setItem(ACTIVE_WALLET_KEY, "freighter");

      const networkResult = await getNetwork();
      if (!extractError(networkResult) && networkResult.network) {
        setNetwork(networkResult.network);
      }
    } catch (error) {
      setPublicKey(null);
      setNetwork(null);
      setIsSignedIn(false);
      window.localStorage.removeItem(STORAGE_KEY);
      window.localStorage.removeItem(SESSION_KEY);
      window.localStorage.removeItem(ACTIVE_WALLET_KEY);
      throw error;
    } finally {
      setIsSigningIn(false);
      setIsConnecting(false);
    }
  }, []);

  const disconnect = React.useCallback(() => {
    setPublicKey(null);
    setNetwork(null);
    setIsSignedIn(false);
    window.localStorage.removeItem(STORAGE_KEY);
    window.localStorage.removeItem(SESSION_KEY);
    window.localStorage.removeItem(ACTIVE_WALLET_KEY);
    void fetch("/api/auth/logout", { method: "POST" });
    // No kit-level "forget wallet" call here — none is documented
    // anywhere in the kit's docs/GitHub/JSR listing. Safe regardless:
    // for Freighter, the server session cookie (cleared above) is the
    // real authority; for LOBSTR there was never a session to begin
    // with, only local publicKey state, which is cleared above too.
  }, []);

  const signTransaction = React.useCallback(
    async (unsignedXdr: string): Promise<string> => {
      if (!publicKey) throw new WalletNotConnectedError();

      const activeWallet =
        typeof window !== "undefined" ? window.localStorage.getItem(ACTIVE_WALLET_KEY) : null;

      if (activeWallet === "freighter") {
        const signed = await freighterSignTransaction(unsignedXdr, {
          address: publicKey,
          networkPassphrase: TESTNET_PASSPHRASE,
        });
        const signError = extractError(signed);
        if (signError) throw new Error(signError);
        if (!signed.signedTxXdr) throw new Error("Freighter did not return a signed XDR");
        return signed.signedTxXdr;
      }

      // Non-Freighter (LOBSTR) — StellarWalletsKit.signTransaction() is a
      // confirmed static method (unlike signMessage), so this path is
      // solid.
      ensureKitInitialized();
      const { signedTxXdr } = await StellarWalletsKit.signTransaction(unsignedXdr, {
        address: publicKey,
        networkPassphrase: TESTNET_PASSPHRASE,
      });
      if (!signedTxXdr) throw new Error("Wallet did not return a signed transaction");
      return signedTxXdr;
    },
    [publicKey]
  );

  const value = React.useMemo(
    () => ({
      publicKey,
      network,
      isConnecting,
      isSigningIn,
      isSignedIn,
      connect,
      disconnect,
      signTransaction,
    }),
    [publicKey, network, isConnecting, isSigningIn, isSignedIn, connect, disconnect, signTransaction]
  );

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function useWallet(): WalletContextValue {
  const ctx = React.useContext(WalletContext);
  if (!ctx) throw new Error("useWallet must be used inside <WalletProvider>");
  return ctx;
}
