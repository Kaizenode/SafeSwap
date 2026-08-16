"use client";

import * as React from "react";
import { StellarWalletsKit } from "@creit.tech/stellar-wallets-kit/sdk";
import {
  FREIGHTER_ID,
  FreighterModule,
} from "@creit.tech/stellar-wallets-kit/modules/freighter";
import {
  WALLET_CONNECT_ID,
  WalletConnectModule,
  WalletConnectTargetChain,
} from "@creit.tech/stellar-wallets-kit/modules/wallet-connect";
import {
  Networks,
  type ISupportedWallet,
  type ModuleInterface,
} from "@creit.tech/stellar-wallets-kit/types";

export type WalletId = "freighter" | "lobstr";

export const FREIGHTER_WALLET_ID: WalletId = "freighter";
export const LOBSTR_WALLET_ID: WalletId = "lobstr";

const STELLAR_NETWORK =
  (process.env.NEXT_PUBLIC_STELLAR_NETWORK ?? "testnet").toLowerCase() ===
  "mainnet"
    ? Networks.PUBLIC
    : Networks.TESTNET;

const PUBLIC_KEY_STORAGE_KEY = "safeswap.wallet.publicKey";
const WALLET_ID_STORAGE_KEY = "safeswap.wallet.id";
const WALLETCONNECT_PAIRING_TIMEOUT_MS = 120_000;

function toKitWalletId(walletId: WalletId): string {
  return walletId === LOBSTR_WALLET_ID ? WALLET_CONNECT_ID : FREIGHTER_ID;
}

export class WalletNotInstalledError extends Error {
  constructor() {
    super(
      "Freighter extension is not installed. Get it at https://freighter.app"
    );
    this.name = "WalletNotInstalledError";
  }
}

export class WalletNotConnectedError extends Error {
  constructor() {
    super("Wallet is not connected");
    this.name = "WalletNotConnectedError";
  }
}

export class WalletConnectTimeoutError extends Error {
  constructor() {
    super(
      "WalletConnect pairing timed out. Make sure the LOBSTR app is open and try again."
    );
    this.name = "WalletConnectTimeoutError";
  }
}

export class WalletConnectNotConfiguredError extends Error {
  constructor() {
    super(
      "LOBSTR requires NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID to be configured."
    );
    this.name = "WalletConnectNotConfiguredError";
  }
}

let kitInitialized = false;
let walletConnectModule: WalletConnectModule | null = null;

function initKit(): void {
  if (kitInitialized) return;

  const modules: ModuleInterface[] = [new FreighterModule()];

  const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;
  if (projectId) {
    walletConnectModule = new WalletConnectModule({
      projectId,
      metadata: {
        name: "SafeSwap",
        description: "Peer-to-peer USDC transfers on Stellar",
        url:
          typeof window !== "undefined"
            ? window.location.origin
            : "https://safeswap.app",
        icons: [],
      },
      allowedChains: [
        STELLAR_NETWORK === Networks.PUBLIC
          ? WalletConnectTargetChain.PUBLIC
          : WalletConnectTargetChain.TESTNET,
      ],
    });
    modules.push(walletConnectModule);
  }

  StellarWalletsKit.init({
    modules,
    network: STELLAR_NETWORK,
  });

  kitInitialized = true;
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = window.setTimeout(
      () => reject(new WalletConnectTimeoutError()),
      ms
    );
    promise.then(
      (value) => {
        window.clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        window.clearTimeout(timer);
        reject(error);
      }
    );
  });
}

interface WalletContextValue {
  publicKey: string | null;
  walletId: WalletId | null;
  network: string | null;
  isConnecting: boolean;
  connectWallet: (walletId: WalletId) => Promise<void>;
  disconnect: () => Promise<void>;
  signTransaction: (unsignedXdr: string) => Promise<string>;
  getSupportedWallets: () => Promise<ISupportedWallet[]>;
}

const WalletContext = React.createContext<WalletContextValue | null>(null);

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [publicKey, setPublicKey] = React.useState<string | null>(null);
  const [walletId, setWalletId] = React.useState<WalletId | null>(null);
  const [network, setNetwork] = React.useState<string | null>(null);
  const [isConnecting, setIsConnecting] = React.useState(false);

  const applyConnectedState = React.useCallback(
    (id: WalletId, address: string) => {
      setPublicKey(address);
      setWalletId(id);
      setNetwork(STELLAR_NETWORK);
      window.localStorage.setItem(PUBLIC_KEY_STORAGE_KEY, address);
      window.localStorage.setItem(WALLET_ID_STORAGE_KEY, id);
    },
    []
  );

  const clearConnectedState = React.useCallback(() => {
    setPublicKey(null);
    setWalletId(null);
    setNetwork(null);
    window.localStorage.removeItem(PUBLIC_KEY_STORAGE_KEY);
    window.localStorage.removeItem(WALLET_ID_STORAGE_KEY);
  }, []);

  React.useEffect(() => {
    initKit();

    const storedId = window.localStorage.getItem(WALLET_ID_STORAGE_KEY);
    if (!storedId) return;

    (async () => {
      try {
        StellarWalletsKit.setWallet(toKitWalletId(storedId as WalletId));
        const { address } = await StellarWalletsKit.getAddress();
        if (address) {
          applyConnectedState(storedId as WalletId, address);
          return;
        }
      } catch {
        // The kit has no persisted session (e.g. a fresh device). Fall back to a
        // silent restore for Freighter so we don't re-prompt for access.
      }

      if (storedId === FREIGHTER_WALLET_ID) {
        try {
          const wallets = await StellarWalletsKit.refreshSupportedWallets();
          const freighter = wallets.find(
            (wallet) => wallet.id === FREIGHTER_ID
          );
          if (freighter?.isAvailable) {
            const { address } = await StellarWalletsKit.fetchAddress();
            if (address) {
              applyConnectedState(FREIGHTER_WALLET_ID, address);
            }
          }
        } catch {
          // Ignore: the user can connect explicitly.
        }
      }
    })();
  }, [applyConnectedState]);

  const connectWallet = React.useCallback(
    async (id: WalletId) => {
      initKit();
      setIsConnecting(true);
      try {
        if (id === LOBSTR_WALLET_ID && !walletConnectModule) {
          throw new WalletConnectNotConfiguredError();
        }

        StellarWalletsKit.setWallet(toKitWalletId(id));

        if (id === LOBSTR_WALLET_ID) {
          let result: { address: string };
          try {
            result = await withTimeout(
              StellarWalletsKit.fetchAddress(),
              WALLETCONNECT_PAIRING_TIMEOUT_MS
            );
          } catch (error) {
            if (error instanceof WalletConnectTimeoutError) {
              walletConnectModule?.modal.close();
            }
            throw error;
          }
          applyConnectedState(id, result.address);
          return;
        }

        const wallets = await StellarWalletsKit.refreshSupportedWallets();
        const freighter = wallets.find(
          (wallet) => wallet.id === FREIGHTER_ID
        );
        if (!freighter?.isAvailable) {
          throw new WalletNotInstalledError();
        }
        const { address } = await StellarWalletsKit.fetchAddress();
        applyConnectedState(id, address);
      } finally {
        setIsConnecting(false);
      }
    },
    [applyConnectedState]
  );

  const disconnect = React.useCallback(async () => {
    initKit();
    try {
      await StellarWalletsKit.disconnect();
    } finally {
      clearConnectedState();
    }
  }, [clearConnectedState]);

  const signTransaction = React.useCallback(
    async (unsignedXdr: string): Promise<string> => {
      if (!publicKey) throw new WalletNotConnectedError();

      const { signedTxXdr } = await StellarWalletsKit.signTransaction(
        unsignedXdr,
        {
          address: publicKey,
          networkPassphrase: STELLAR_NETWORK,
        }
      );
      if (!signedTxXdr) {
        throw new Error("Wallet did not return a signed XDR");
      }
      return signedTxXdr;
    },
    [publicKey]
  );

  const getSupportedWallets = React.useCallback(async () => {
    initKit();
    return StellarWalletsKit.refreshSupportedWallets();
  }, []);

  const value = React.useMemo(
    () => ({
      publicKey,
      walletId,
      network,
      isConnecting,
      connectWallet,
      disconnect,
      signTransaction,
      getSupportedWallets,
    }),
    [
      publicKey,
      walletId,
      network,
      isConnecting,
      connectWallet,
      disconnect,
      signTransaction,
      getSupportedWallets,
    ]
  );

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function useWallet(): WalletContextValue {
  const ctx = React.useContext(WalletContext);
  if (!ctx) throw new Error("useWallet must be used inside <WalletProvider>");
  return ctx;
}
