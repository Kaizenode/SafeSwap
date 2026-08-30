"use client";

import * as React from "react";
import { StellarWalletsKit } from "@creit.tech/stellar-wallets-kit/sdk";
import { FreighterModule } from "@creit.tech/stellar-wallets-kit/modules/freighter";
import { LobstrModule } from "@creit.tech/stellar-wallets-kit/modules/lobstr";
import { KitEventType } from "@creit.tech/stellar-wallets-kit/types";

const TESTNET_PASSPHRASE = "Test SDF Network ; September 2015";

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
  /** Mount point for the kit's own connect/profile button — see ConnectWalletButton.tsx */
  kitReady: boolean;
  signTransaction: (unsignedXdr: string) => Promise<string>;
}

const WalletContext = React.createContext<WalletContextValue | null>(null);

let kitInitialized = false;

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [publicKey, setPublicKey] = React.useState<string | null>(null);
  const [network, setNetwork] = React.useState<string | null>(null);
  const [isConnecting, setIsConnecting] = React.useState(false);
  const [kitReady, setKitReady] = React.useState(false);

  React.useEffect(() => {
    // Only ever initialize once per page load, and only in the browser —
    // the kit explicitly requires a browser environment (see the "Starting
    // the kit" guide at stellarwalletskit.dev), so this must not run
    // during SSR/prerendering.
    if (typeof window === "undefined" || kitInitialized) {
      if (kitInitialized) setKitReady(true);
      return;
    }
    kitInitialized = true;

    // Restricted to exactly these two modules per #374's MVP scope — no
    // Albedo, xBull, or Hana. Neither module needs extra configuration:
    // Lobstr has its own dedicated module (not the generic WalletConnect
    // one), so no WalletConnect Cloud project ID is required here.
    StellarWalletsKit.init({
      modules: [new FreighterModule(), new LobstrModule()],
    });
    setKitReady(true);

    const unsubscribeState = StellarWalletsKit.on(
      KitEventType.STATE_UPDATED,
      (event) => {
        setPublicKey(event.payload.address ?? null);
        setNetwork(event.payload.networkPassphrase ?? null);
        setIsConnecting(false);
      }
    );

    const unsubscribeDisconnect = StellarWalletsKit.on(
      KitEventType.DISCONNECT,
      () => {
        setPublicKey(null);
        setNetwork(null);
      }
    );

    // The kit persists the selected wallet internally and restores it on
    // its own — per the "Authenticate" guide, once a user has connected,
    // the kit "will keep it until the user calls the disconnect button
    // from the profile modal", so a fresh getAddress() call after reload
    // resolves without re-prompting. getAddress() throws when there's no
    // active session, which just means "not connected yet" here.
    StellarWalletsKit.getAddress()
      .then(({ address }) => {
        if (address) setPublicKey(address);
      })
      .catch(() => {
        /* no persisted session — expected on first visit */
      });

    return () => {
      unsubscribeState();
      unsubscribeDisconnect();
    };
  }, []);

  const signTransaction = React.useCallback(
    async (unsignedXdr: string): Promise<string> => {
      if (!publicKey) throw new WalletNotConnectedError();

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
    () => ({ publicKey, network, isConnecting, kitReady, signTransaction }),
    [publicKey, network, isConnecting, kitReady, signTransaction]
  );

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function useWallet(): WalletContextValue {
  const ctx = React.useContext(WalletContext);
  if (!ctx) throw new Error("useWallet must be used inside <WalletProvider>");
  return ctx;
}
